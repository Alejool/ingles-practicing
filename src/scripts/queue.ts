/**
 * Cola de lo que se quedó sin red.
 *
 * Si pides una corrección en el metro, antes se perdía: salía un error y a
 * empezar. Ahora la petición se guarda en IndexedDB con tu texto dentro, y en
 * cuanto vuelve la conexión se lanza sola y te avisa. IndexedDB y no
 * localStorage porque aquí caben textos largos y sobrevive a cerrar la pestaña.
 */

import type { AiKind } from "../../shared/prompts";

const DB = "ruta-b1b2-cola";
const TIENDA = "pendientes";

export interface Pendiente {
  id: number;
  kind: AiKind;
  payload: unknown;
  model: string;
  /** Para poder enseñar «una corrección de Writing» sin adivinarlo. */
  rotulo: string;
  creado: number;
  intentos: number;
  /** La respuesta, cuando ya se ha resuelto. */
  respuesta?: string;
  estado: "pendiente" | "hecha" | "fallida";
  error?: string;
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (!("indexedDB" in window)) { rej(new Error("sin IndexedDB")); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TIENDA)) {
        db.createObjectStore(TIENDA, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error || new Error("no se pudo abrir la cola"));
  });
}

async function conTienda<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await abrir();
  return new Promise<T>((res, rej) => {
    const tx = db.transaction(TIENDA, modo);
    const req = fn(tx.objectStore(TIENDA));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function encolar(p: Omit<Pendiente, "id" | "creado" | "intentos" | "estado">): Promise<number | null> {
  try {
    return await conTienda<number>("readwrite", s =>
      s.add({ ...p, creado: Date.now(), intentos: 0, estado: "pendiente" }));
  } catch {
    return null; // modo privado o navegador sin IndexedDB: se pierde, pero no rompe
  }
}

export async function pendientes(): Promise<Pendiente[]> {
  try {
    const todos = await conTienda<Pendiente[]>("readonly", s => s.getAll());
    return todos.sort((a, b) => a.creado - b.creado);
  } catch {
    return [];
  }
}

export async function guardar(p: Pendiente): Promise<void> {
  try { await conTienda("readwrite", s => s.put(p)); } catch { /* nada que hacer */ }
}

export async function borrar(id: number): Promise<void> {
  try { await conTienda("readwrite", s => s.delete(id)); } catch { /* nada que hacer */ }
}

export async function limpiarHechas(): Promise<void> {
  const todos = await pendientes();
  await Promise.all(todos.filter(p => p.estado !== "pendiente").map(p => borrar(p.id)));
}

/* ─────────────── vaciado ─────────────── */

type Lanzador = (p: Pendiente) => Promise<string>;

let lanzar: Lanzador | null = null;
let avisar: (p: Pendiente) => void = () => {};
let vaciando = false;

/** El módulo de IA registra aquí cómo se ejecuta una petición encolada. */
export function setLanzador(fn: Lanzador): void { lanzar = fn; }
export function setAviso(fn: (p: Pendiente) => void): void { avisar = fn; }

/**
 * Intenta resolver todo lo pendiente. Se llama al arrancar y cuando vuelve la
 * red; si no hay conexión no hace nada y lo deja para la próxima.
 */
export async function vaciar(): Promise<void> {
  if (vaciando || !lanzar || !navigator.onLine) return;
  vaciando = true;
  try {
    for (const p of await pendientes()) {
      if (p.estado !== "pendiente") continue;
      // Tres intentos y se marca como fallida, para no reintentar eternamente
      // algo que falla por el contenido y no por la red.
      if (p.intentos >= 3) {
        await guardar({ ...p, estado: "fallida", error: p.error || "No se pudo completar tras tres intentos." });
        continue;
      }
      try {
        const texto = await lanzar(p);
        const hecha: Pendiente = { ...p, estado: "hecha", respuesta: texto };
        await guardar(hecha);
        avisar(hecha);
      } catch (e: any) {
        const red = e?.code === "network" || e?.code === "api_unreachable" || !navigator.onLine;
        await guardar({ ...p, intentos: p.intentos + (red ? 0 : 1), error: e?.message || "falló" });
        if (red) break; // se cayó otra vez la red: seguimos otro día
      }
    }
  } finally {
    vaciando = false;
  }
}

let arrancada = false;

/** Engancha el vaciado a la vuelta de la conexión. Idempotente. */
export function arrancarCola(): void {
  if (arrancada) return;
  arrancada = true;
  window.addEventListener("online", () => { vaciar(); });
  // Y un intento al abrir, por si se cerró la pestaña con cosas dentro.
  setTimeout(() => { vaciar(); }, 4000);
}
