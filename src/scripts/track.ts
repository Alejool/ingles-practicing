/**
 * La ruta activa.
 *
 * Cualquier vista pide su contenido con `T()`, que es síncrono: quien lo llama
 * no tiene que saber nada de cargas. Eso se sostiene porque la ruta se trae con
 * `asegurarRuta()` antes de pintar —al arrancar y al cambiar de ruta—, así que
 * cuando una vista se dibuja el contenido ya está en memoria.
 */

import { TRACK_META, cargarLecturasDe, cargarTrack, metaDe, precargarOtras, trackCargada } from "../data/tracks.ts";
import { buildDays } from "../data/schedule.ts";
import { S, save } from "./state";
import type { Day, Track, TrackId, GrammarUnit } from "../data/types.ts";

export { TRACK_META, metaDe };

export function T(): Track {
  const t = trackCargada(S.track);
  if (t) return t;
  // No debería pasar: significa que alguien pintó antes de esperar la carga.
  throw new Error("La ruta " + S.track + " todavía no está cargada.");
}

/** ¿Se puede pintar ya? Lo usa el arranque para no dibujar en vacío. */
export function rutaLista(): boolean {
  return !!trackCargada(S.track);
}

/** Trae la ruta activa (o la que se le pida) y deja lista la otra por detrás. */
export async function asegurarRuta(id: TrackId = S.track): Promise<Track> {
  const t = await cargarTrack(id);
  // La segunda ruta se precarga en cuanto hay un hueco: cambiar es instantáneo.
  setTimeout(() => precargarOtras(id), 1500);
  return t;
}

/** Los 120 días de la ruta activa. Se construyen una vez por ruta. */
const cache: Partial<Record<TrackId, Day[]>> = {};

export function days(): Day[] {
  const t = T();
  if (!cache[t.id]) {
    cache[t.id] = buildDays(t.weeks, t.decks, id => {
      const u = t.grammar.find(g => g.id === id);
      return u ? `${u.n} · ${u.t}` : id;
    }, {
      writingIds: t.writing.map(w => w.id),
      speakingIds: t.speaking.map(s => s.id),
      readings: t.readingCount,
    });
  }
  return cache[t.id]!;
}

export function unit(id: string): GrammarUnit | undefined {
  return T().grammar.find(g => g.id === id);
}

export function deckName(id: string): string {
  return T().decks.find(d => d.id === id)?.name || id;
}

/* ─────────────── lecturas ─────────────── */

const lecturasPedidas: Partial<Record<TrackId, Promise<void>>> = {};

/**
 * Trae las lecturas de la ruta activa y las mete en `T().readings`.
 *
 * Se rellena el mismo array en vez de sustituirlo, así todo lo que ya tenga una
 * referencia a él sigue funcionando sin enterarse.
 */
export function asegurarLecturas(): Promise<void> {
  const t = T();
  if (t.readings.length) return Promise.resolve();
  if (!lecturasPedidas[t.id]) {
    lecturasPedidas[t.id] = cargarLecturasDe(t.id).then(ls => {
      t.readings.length = 0;
      t.readings.push(...ls);
    }).catch(e => {
      delete lecturasPedidas[t.id];
      throw e;
    });
  }
  return lecturasPedidas[t.id]!;
}

/** ¿Ya están las lecturas en memoria? */
export function hayLecturas(): boolean {
  return T().readings.length > 0;
}

let onTrackChange: () => void = () => {};
export function setTrackListener(fn: () => void): void { onTrackChange = fn; }

/** Avisos de «estoy cargando la otra ruta», para que la interfaz no parezca colgada. */
let onLoading: (cargando: boolean) => void = () => {};
export function setLoadingListener(fn: (cargando: boolean) => void): void { onLoading = fn; }

/** Cambiar de ruta espera a tener su contenido: nunca se pinta a medias. */
export async function setTrack(id: TrackId): Promise<void> {
  if (S.track === id) return;
  if (!trackCargada(id)) onLoading(true);
  try {
    await cargarTrack(id);
  } catch {
    onLoading(false);
    throw new Error("No se pudo cargar la ruta " + metaDe(id).name + ". Comprueba la conexión.");
  }
  onLoading(false);
  S.track = id;
  save();
  onTrackChange();
}
