/**
 * Piezas comunes para armar una ruta.
 *
 * El contenido de cada ruta vive en su propia carpeta y se ensambla en su
 * `index.ts`. Aquí solo están las funciones que las dos comparten, para que
 * ninguna de las dos arrastre a la otra dentro del mismo bundle.
 */

import type { Card, Deck, DeckCat, Drill, GrammarUnit, ReadingText } from "./types";

/** A qué familia pertenece cada mazo. Es lo que agrupa el selector de Vocabulario. */
const CAT: Record<string, DeckCat> = {
  b1: "comunes", b2: "comunes", core1: "comunes", core2: "comunes",
  verb: "verbos", verbs: "verbos",
  adj: "adjetivos",
  phr: "phrasal",
  fa: "falsos",
  comp: "compuestas",
  coll: "colocaciones",
  prep: "preposiciones",
  wf: "formacion",
  conn: "conectores",
};

/** Los mazos base, más el vocabulario adicional, más los mazos por tipo. */
export function armarMazos(base: Deck[], extra: Record<string, Card[]>, nuevos: Deck[]): Deck[] {
  const todos = [
    ...base.map(d => (extra[d.id] ? { ...d, cards: [...d.cards, ...extra[d.id]] } : d)),
    ...nuevos,
  ];
  return todos.map(d => ({ ...d, cat: d.cat || CAT[d.id] || "comunes" }));
}

/** Las unidades con sus drills adicionales detrás de los originales. */
export function conDrills(base: GrammarUnit[], extra: Record<string, Drill[]>): GrammarUnit[] {
  return base.map(u => (extra[u.id] ? { ...u, dr: [...u.dr, ...extra[u.id]] } : u));
}

/** READ9…READ20 de un módulo de lecturas, en orden. */
export function lecturasNumeradas(mod: Record<string, unknown>): ReadingText[] {
  const out: ReadingText[] = [];
  for (let i = 9; i <= 20; i++) {
    const t = mod["READ" + i];
    if (t) out.push(t as ReadingText);
  }
  return out;
}
