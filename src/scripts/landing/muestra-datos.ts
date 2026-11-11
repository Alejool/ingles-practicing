/**
 * Lo que se juega en la landing: una pieza real de cada tipo por ruta.
 *
 * Importa archivos sueltos de `src/data/` (no la ruta entera): el bundle de la
 * landing queda pequeño y se precachea con ella (plan K-11). Nada se copia ni
 * se edita (principio 7): son los mismos objetos que usa la app.
 */

import { DIAG as DIAG_A2B1 } from "../../data/a2b1/diagnostic.ts";
import { DECKS as DECKS_A2B1 } from "../../data/a2b1/decks.ts";
import { LISTENING as LISTENING_A2B1 } from "../../data/a2b1/listening.ts";
import { TRANS as TRANS_A2B1 } from "../../data/a2b1/uoe.ts";
import { DIAG as DIAG_B1B2 } from "../../data/b1b2/diagnostic.ts";
import { DECKS as DECKS_B1B2 } from "../../data/b1b2/decks.ts";
import { LISTENING as LISTENING_B1B2 } from "../../data/b1b2/listening.ts";
import { TRANS as TRANS_B1B2 } from "../../data/b1b2/uoe.ts";
import { muestraDiag } from "../diag-muestra.ts";
import type { Card, Deck, DiagItem, ListeningTrack, Transformation, TrackId } from "../../data/types.ts";

export interface Muestra {
  track: TrackId;
  /** Las diez del diagnóstico corto, las mismas que el onboarding. */
  diag: DiagItem[];
  /** Nombre del mazo del que salen las tarjetas. */
  mazo: string;
  tarjetas: Card[];
  escucha: ListeningTrack;
  uoe: Transformation;
}

const FUENTES: Record<TrackId, { diag: DiagItem[]; decks: Deck[]; escucha: ListeningTrack[]; trans: Transformation[] }> = {
  a2b1: { diag: DIAG_A2B1, decks: DECKS_A2B1, escucha: LISTENING_A2B1, trans: TRANS_A2B1 },
  b1b2: { diag: DIAG_B1B2, decks: DECKS_B1B2, escucha: LISTENING_B1B2, trans: TRANS_B1B2 },
};

export function muestraDe(track: TrackId): Muestra {
  const f = Object.hasOwn(FUENTES, track) ? FUENTES[track] : null;
  if (!f) throw new Error("No hay muestra para la ruta " + track);
  return {
    track,
    diag: muestraDiag(f.diag, 10),
    mazo: f.decks[0].name,
    tarjetas: f.decks[0].cards.slice(0, 8),
    escucha: f.escucha[0],
    uoe: f.trans[0],
  };
}

/** Las diez preguntas de una ruta, o null si no existe (para `relevo-diag.ts`). */
export function preguntasDe(track: string): DiagItem[] | null {
  return Object.hasOwn(FUENTES, track) ? muestraDe(track as TrackId).diag : null;
}
