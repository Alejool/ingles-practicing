/**
 * Latido anónimo.
 *
 * Manda una vez al día, y solo esto: en qué día del plan vas, cuántos llevas
 * hechos, la racha y qué módulos has abierto alguna vez. Ni correo, ni id de
 * cuenta, ni nada que se pueda deshacer hasta ti: el servidor guarda un hash
 * con pimienta del id de dispositivo.
 *
 * Para qué sirve: si veinte personas abandonan todas en el día 12, algo pasa en
 * el día 12. Sin esto, mejorar la app es adivinar.
 *
 * Se puede apagar del todo: `PULSE_ENABLED=false` en el servidor, o el
 * interruptor de Ajustes en el navegador de cada quien.
 */

import * as api from "./api";
import { S } from "./state";

const CLAVE_VISTOS = "ruta-b1b2-modulos-vistos";
const CLAVE_ULTIMO = "ruta-b1b2-pulso";
const CLAVE_APAGADO = "ruta-b1b2-sin-pulso";

/** El interruptor vive fuera del progreso: es del aparato, no de la cuenta. */
export function pulsoApagado(): boolean {
  try { return localStorage.getItem(CLAVE_APAGADO) === "1"; } catch { return false; }
}

export function apagarPulso(apagar: boolean): void {
  try {
    if (apagar) localStorage.setItem(CLAVE_APAGADO, "1");
    else localStorage.removeItem(CLAVE_APAGADO);
  } catch { /* modo privado */ }
}

/** Módulos que esta persona ha abierto alguna vez. */
export function vistos(): string[] {
  try {
    const raw = localStorage.getItem(CLAVE_VISTOS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Lo llama `go()` en cada navegación. Barato: solo escribe si es nuevo. */
export function anotarVisita(modulo: string): void {
  if (pulsoApagado()) return;
  const ya = vistos();
  if (ya.includes(modulo)) return;
  ya.push(modulo);
  try { localStorage.setItem(CLAVE_VISTOS, JSON.stringify(ya.slice(0, 30))); } catch { /* sin sitio */ }
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yaHoy(): boolean {
  try { return localStorage.getItem(CLAVE_ULTIMO) === hoyISO(); } catch { return true; }
}

/**
 * Manda el latido si toca. Falla en silencio: esto nunca puede estorbar a
 * quien está estudiando.
 */
export async function latir(planDay: number, doneDays: number, streak: number): Promise<void> {
  if (pulsoApagado() || yaHoy() || !navigator.onLine) return;
  try {
    await api.send("/api/pulse", "POST", {
      track: S.track,
      planDay,
      doneDays,
      streak,
      seen: vistos(),
    });
    localStorage.setItem(CLAVE_ULTIMO, hoyISO());
  } catch { /* da igual: se reintenta mañana */ }
}
