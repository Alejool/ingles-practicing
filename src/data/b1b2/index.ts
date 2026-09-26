/**
 * Ruta B1 → B2, ensamblada.
 *
 * Este archivo es el único punto de entrada de la ruta: se carga con `import()`
 * desde `tracks.ts`, así que todo su contenido queda en un bundle aparte y no
 * lo descarga quien estudie la otra ruta.
 */

import type { ReadingText, Track } from "../types";
import { armarMazos, conDrills, lecturasNumeradas } from "../build.ts";

import { DIAG } from "./diagnostic.ts";
import { GRAM } from "./grammar.ts";
import { EXTRA_DRILLS } from "./drills2.ts";
import { DECKS } from "./decks.ts";
import { EXTRA } from "./decks2.ts";
import { DECKS3 } from "./decks3.ts";
import { TRANS, CLOZE, WFORM } from "./uoe.ts";
import { TRANS2, CLOZE2, CLOZE3, CLOZE4, WFORM2 } from "./uoe2.ts";
import { TRANS3, CLOZE5, CLOZE6, WFORM3 } from "./uoe3.ts";
import { RUBRIC, WRITING } from "./writing.ts";
import { WRITING2, SPEAK2 } from "./writing2.ts";
import { SPEAK } from "./speaking.ts";
import { STRATS } from "./strategies.ts";
import { MOCK } from "./mock.ts";
import { MOCK2, MOCK3, MOCK4 } from "./mock2.ts";
import { RES } from "./resources.ts";
import { WEEKS } from "./weeks.ts";
import { LISTENING } from "./listening.ts";

export const TRACK: Track = {
  id: "b1b2",
  name: "B1 → B2",
  who: "Te comunicas sin problema pero te falta precisión, léxico y estructuras complejas.",
  exam: "Cambridge B2 First, IELTS 5.5–6.5, TOEFL 72–94",
  diag: DIAG,
  grammar: conDrills(GRAM, EXTRA_DRILLS),
  decks: armarMazos(DECKS, EXTRA, DECKS3),
  trans: [...TRANS, ...TRANS2, ...TRANS3],
  clozes: [CLOZE, CLOZE2, CLOZE3, CLOZE4, CLOZE5, CLOZE6],
  wform: [...WFORM, ...WFORM2, ...WFORM3],
  rubric: RUBRIC,
  writing: [...WRITING, ...WRITING2],
  speaking: [...SPEAK, ...SPEAK2],
  readings: [],
  readingCount: 20,
  listening: LISTENING,
  strategies: STRATS,
  mocks: [MOCK, MOCK2, MOCK3, MOCK4],
  resources: RES,
  weeks: WEEKS,
};

/**
 * Las veinte lecturas, en su propio bundle.
 *
 * Pesan un tercio de la ruta y solo hacen falta en el módulo de Reading, así
 * que se traen aparte y en segundo plano.
 */
export async function cargarLecturas(): Promise<ReadingText[]> {
  const [uno, dos, tres, cuatro] = await Promise.all([
    import("./reading.ts"),
    import("./reading2.ts"),
    import("./reading3.ts"),
    import("./reading4.ts"),
  ]);
  return [
    uno.READTEXT,
    dos.READ2, dos.READ3, dos.READ4,
    tres.READ5, tres.READ6, tres.READ7, tres.READ8,
    ...lecturasNumeradas(cuatro),
  ];
}
