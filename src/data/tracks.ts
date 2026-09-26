/**
 * Las rutas del curso, en dos piezas.
 *
 * La ficha (`TRACK_META`) es minúscula y viaja siempre: es lo que necesita el
 * selector del lateral para pintarse antes de cargar nada. El contenido de cada
 * ruta —diagnóstico, plan, gramática, mazos, ejercicios, writing, speaking,
 * lecturas y simulacro— vive en su carpeta y se trae con `import()` solo cuando
 * eliges esa ruta. Así quien estudie A2 → B1 no se descarga las 594 tarjetas de
 * la otra.
 *
 * Añadir una tercera ruta es crear la carpeta con su `index.ts` y sumarla aquí.
 */

import type { ReadingText, Track, TrackId } from "./types";

export interface TrackMeta {
  id: TrackId;
  name: string;
  who: string;
  exam: string;
}

export const TRACK_META: TrackMeta[] = [
  {
    id: "a2b1",
    name: "A2 → B1",
    who: "Te defiendes con frases sueltas pero se te caen los tiempos verbales y las preguntas.",
    exam: "Cambridge A2 Key y B1 Preliminary",
  },
  {
    id: "b1b2",
    name: "B1 → B2",
    who: "Te comunicas sin problema pero te falta precisión, léxico y estructuras complejas.",
    exam: "Cambridge B2 First, IELTS 5.5–6.5, TOEFL 72–94",
  },
];

const CARGADORES: Record<TrackId, () => Promise<Track>> = {
  a2b1: () => import("./a2b1/index.ts").then(m => m.TRACK),
  b1b2: () => import("./b1b2/index.ts").then(m => m.TRACK),
};

/** Las lecturas van en su propio bundle: son un tercio del peso de la ruta. */
const LECTURAS: Record<TrackId, () => Promise<ReadingText[]>> = {
  a2b1: () => import("./a2b1/index.ts").then(m => m.cargarLecturas()),
  b1b2: () => import("./b1b2/index.ts").then(m => m.cargarLecturas()),
};

export function cargarLecturasDe(id: TrackId): Promise<ReadingText[]> {
  return LECTURAS[id]();
}

const cache: Partial<Record<TrackId, Track>> = {};
const enVuelo: Partial<Record<TrackId, Promise<Track>>> = {};

export function metaDe(id: TrackId): TrackMeta {
  return TRACK_META.find(t => t.id === id) || TRACK_META[1];
}

/** Ya está en memoria: las vistas pueden pintarla sin esperar. */
export function trackCargada(id: TrackId): Track | undefined {
  return cache[id];
}

/** Trae una ruta. Si ya está cargada devuelve la misma; si está en camino, espera. */
export function cargarTrack(id: TrackId): Promise<Track> {
  if (cache[id]) return Promise.resolve(cache[id]!);
  if (!enVuelo[id]) {
    enVuelo[id] = CARGADORES[id]().then(t => {
      cache[id] = t;
      delete enVuelo[id];
      return t;
    }).catch(e => {
      delete enVuelo[id];
      throw e;
    });
  }
  return enVuelo[id]!;
}

/** Deja lista la otra ruta en segundo plano, sin bloquear nada. */
export function precargarOtras(actual: TrackId): void {
  TRACK_META.forEach(t => {
    if (t.id !== actual && !cache[t.id]) cargarTrack(t.id).catch(() => { /* ya se reintentará al cambiar */ });
  });
}
