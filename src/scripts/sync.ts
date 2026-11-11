/**
 * Sincronización del progreso.
 *
 * Sin sesión no se sincroniza nada: todo se queda en el navegador. Con sesión,
 * al entrar se funde lo local con lo del servidor y a partir de ahí se sube
 * cada pocos segundos y al salir de la pestaña.
 *
 * La fusión nunca borra progreso: ante la duda gana el estado más avanzado
 * (tarea hecha, caja de la tarjeta más alta, texto más largo). Eso hace que dos
 * dispositivos que estudian a la vez converjan sin perder trabajo.
 */

import * as api from "./api";
import { S, replaceState, setSaveListener } from "./state";
import type { AppState } from "./state";
import { mergeState } from "./merge";

export { mergeState };

const VERSION_KEY = "ruta-b1b2-sync-version";

let dirty = false;
let busy = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let listeners: Array<(s: SyncStatus) => void> = [];

export type SyncStatus =
  | { state: "off" }
  | { state: "idle"; at: string | null }
  | { state: "working" }
  | { state: "error"; message: string };

let status: SyncStatus = { state: "off" };

export function onSyncStatus(fn: (s: SyncStatus) => void): void {
  listeners.push(fn);
  fn(status);
}

function setStatus(s: SyncStatus): void {
  status = s;
  listeners.forEach(fn => { try { fn(s); } catch { /* ignorado */ } });
}

export function syncStatus(): SyncStatus {
  return status;
}

function version(): number {
  const v = parseInt(localStorage.getItem(VERSION_KEY) || "0", 10);
  return Number.isFinite(v) ? v : 0;
}

function setVersion(v: number): void {
  try { localStorage.setItem(VERSION_KEY, String(v)); } catch { /* modo privado */ }
}

/** Lo que viaja al servidor: nunca la clave de API ni preferencias del aparato. */
function payload(state: AppState): Partial<AppState> {
  const { ai, theme, ...rest } = state;
  return rest;
}

async function push(): Promise<void> {
  if (!api.isSignedIn()) return;
  setStatus({ state: "working" });
  try {
    const res = await api.send("/api/progress", "PUT", { data: payload(S), version: version() });
    setVersion(res.version);
    dirty = false;
    setStatus({ state: "idle", at: res.updatedAt });
  } catch (e: any) {
    if (e?.code === "version_conflict" && e.data?.server) {
      // Alguien subió desde otro dispositivo: fundimos y reintentamos una vez.
      const merged = mergeState(S, e.data.server.data);
      replaceState(merged);
      setVersion(e.data.server.version);
      try {
        const res = await api.send("/api/progress", "PUT", { data: payload(S), version: version() });
        setVersion(res.version);
        dirty = false;
        setStatus({ state: "idle", at: res.updatedAt });
        onMerged();
        return;
      } catch (e2: any) {
        setStatus({ state: "error", message: e2?.message || "No se pudo sincronizar." });
        return;
      }
    }
    if (e?.code === "not_authenticated") {
      api.setSessionToken(null);
      setStatus({ state: "off" });
      return;
    }
    setStatus({ state: "error", message: e?.message || "No se pudo sincronizar." });
  }
}

let onMerged: () => void = () => {};
export function setMergeListener(fn: () => void): void { onMerged = fn; }

function schedule(): void {
  if (!api.isSignedIn()) return;
  dirty = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { if (!busy) { busy = true; push().finally(() => { busy = false; }); } }, 6000);
}

/** Primera sincronización tras entrar: baja, funde y sube. */
export async function pullAndMerge(): Promise<void> {
  if (!api.isSignedIn()) { setStatus({ state: "off" }); return; }
  setStatus({ state: "working" });
  try {
    const remote = await api.get("/api/progress");
    if (remote?.data) {
      replaceState(mergeState(S, remote.data));
      onMerged();
    }
    setVersion(remote?.version ?? 0);
    await push();
  } catch (e: any) {
    if (e?.code === "not_authenticated") { api.setSessionToken(null); setStatus({ state: "off" }); return; }
    setStatus({ state: "error", message: e?.message || "No se pudo descargar el progreso." });
  }
}

export async function flush(): Promise<void> {
  if (dirty && api.isSignedIn()) await push();
}

export function startSync(): void {
  setSaveListener(schedule);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", () => { flush(); });
  // Al volver la red, lo que quedó sin subir se sube sin esperar al próximo cambio.
  window.addEventListener("online", () => { flush(); });
  api.onSession(s => {
    if (!s.user) { setVersion(0); setStatus({ state: "off" }); }
  });
}

export function resetSyncVersion(): void {
  setVersion(0);
}
