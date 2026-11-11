/**
 * Relevo del diagnóstico de la landing a la app (AC-6b).
 *
 * La landing guarda solo las respuestas en `sessionStorage` (sobrevive a
 * recargas y a navegar en la misma pestaña, muere con ella). Si el enlace
 * mágico se abre en otra pestaña, la app pregunta por un `BroadcastChannel` y
 * la landing, si sigue abierta, responde y borra su copia.
 *
 * Nada de lo guardado es de fiar: la nota se recalcula con `puntuar()` contra
 * el contenido real, y aquí se rechaza todo lo que no sean diez respuestas a
 * las diez preguntas de esa ruta.
 */

import { TRACK_META } from "../data/tracks.ts";
import type { DiagItem, TrackId } from "../data/types.ts";

export const CLAVE_RELEVO = "ruta-muestra-diag";
export const CANAL_RELEVO = "ruta-relevo";

export interface RelevoDiag {
  v: 1;
  track: TrackId;
  respuestas: Record<string, number>;
  /** Fecha ISO en que se terminó. */
  hecho: string;
}

export type Lectura = { ok: true; valor: RelevoDiag } | { ok: false; motivo: string };

/** Las diez preguntas de la muestra de una ruta, o null si la ruta no existe. */
export type PreguntasDe = (track: string) => DiagItem[] | null;

export type Mensaje = { tipo: "pide" } | { tipo: "da"; resultado: RelevoDiag };

/** Lo que se usa de `sessionStorage`. */
export interface Almacen {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** Lo que se usa de `BroadcastChannel`. */
export interface Canal {
  postMessage(m: unknown): void;
  addEventListener(tipo: "message", fn: (e: { data: unknown }) => void): void;
  removeEventListener(tipo: "message", fn: (e: { data: unknown }) => void): void;
}

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

export function serializar(r: RelevoDiag): string {
  return JSON.stringify(r);
}

export function validar(x: unknown, preguntasDe: PreguntasDe): Lectura {
  if (!esObjeto(x)) return { ok: false, motivo: "No es un objeto." };
  if (x.v !== 1) return { ok: false, motivo: "Versión desconocida: " + String(x.v) };
  const track = x.track;
  const preguntas = typeof track === "string" && TRACK_META.some(t => t.id === track) ? preguntasDe(track) : null;
  if (!preguntas) return { ok: false, motivo: "Ruta desconocida: " + String(track) };
  if (typeof x.hecho !== "string") return { ok: false, motivo: "Falta la fecha." };
  if (!esObjeto(x.respuestas)) return { ok: false, motivo: "Faltan las respuestas." };

  const porId = new Map(preguntas.map(p => [p.id, p]));
  const respuestas: Record<string, number> = {};
  for (const [id, r] of Object.entries(x.respuestas)) {
    const p = porId.get(id);
    if (!p) return { ok: false, motivo: "Pregunta ajena a la muestra: " + id };
    if (typeof r !== "number" || !Number.isInteger(r) || r < 0 || r >= p.opts.length) {
      return { ok: false, motivo: "Respuesta inválida en " + id };
    }
    respuestas[id] = r;
  }
  if (Object.keys(respuestas).length < preguntas.length) {
    return { ok: false, motivo: "Faltan respuestas: " + Object.keys(respuestas).length + " de " + preguntas.length };
  }
  return { ok: true, valor: { v: 1, track: track as TrackId, respuestas, hecho: x.hecho } };
}

export function leer(texto: string | null, preguntasDe: PreguntasDe): Lectura {
  if (!texto) return { ok: false, motivo: "No hay resultado guardado." };
  let x: unknown;
  try { x = JSON.parse(texto); } catch { return { ok: false, motivo: "JSON roto." }; }
  return validar(x, preguntasDe);
}

export function mensajePide(): Mensaje {
  return { tipo: "pide" };
}

export function mensajeDa(resultado: RelevoDiag): Mensaje {
  return { tipo: "da", resultado };
}

export function leerMensaje(x: unknown, preguntasDe: PreguntasDe): Mensaje | null {
  if (!esObjeto(x)) return null;
  if (x.tipo === "pide") return mensajePide();
  if (x.tipo === "da") {
    const l = validar(x.resultado, preguntasDe);
    return l.ok ? mensajeDa(l.valor) : null;
  }
  return null;
}

/* ── Adaptadores: sessionStorage y BroadcastChannel, inyectables ── */

export function guardar(almacen: Almacen, r: RelevoDiag): void {
  almacen.setItem(CLAVE_RELEVO, serializar(r));
}

/** El resultado guardado en esta pestaña, o null si no hay o no vale. */
export function leerDe(almacen: Almacen, preguntasDe: PreguntasDe): RelevoDiag | null {
  const l = leer(almacen.getItem(CLAVE_RELEVO), preguntasDe);
  return l.ok ? l.valor : null;
}

export function quitar(almacen: Almacen): void {
  almacen.removeItem(CLAVE_RELEVO);
}

/**
 * Lado de la landing: responde a "pide" con el resultado de esta pestaña y lo
 * borra (ya lo tiene la app). Devuelve la función para dejar de escuchar.
 */
export function darAlPedir(almacen: Almacen, canal: Canal, preguntasDe: PreguntasDe): () => void {
  const oyente = (e: { data: unknown }) => {
    if (leerMensaje(e.data, preguntasDe)?.tipo !== "pide") return;
    const r = leerDe(almacen, preguntasDe);
    if (!r) return;
    canal.postMessage(mensajeDa(r));
    quitar(almacen);
  };
  canal.addEventListener("message", oyente);
  return () => canal.removeEventListener("message", oyente);
}

/** Lado de la app: pregunta y espera hasta `ms` a que alguna landing abierta responda. */
export function pedir(canal: Canal, preguntasDe: PreguntasDe, ms = 800): Promise<RelevoDiag | null> {
  return new Promise(resolver => {
    const fin = (r: RelevoDiag | null) => {
      clearTimeout(reloj);
      canal.removeEventListener("message", oyente);
      resolver(r);
    };
    const oyente = (e: { data: unknown }) => {
      const m = leerMensaje(e.data, preguntasDe);
      if (m?.tipo === "da") fin(m.resultado);
    };
    const reloj = setTimeout(() => fin(null), ms);
    canal.addEventListener("message", oyente);
    canal.postMessage(mensajePide());
  });
}
