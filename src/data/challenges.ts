/**
 * Retos diarios. Se sortean por día, así que cada jornada trae uno distinto,
 * y se cumplen solos con lo que vas haciendo: no hay nada que marcar a mano.
 */

import type { Challenge } from "./types";

export const CHALLENGES: Challenge[] = [
  { id: "c1", t: "Veinte de golpe", d: "Acierta 20 tarjetas de vocabulario hoy.", metric: "cards", goal: 20, goto: { module: "vocab", label: "Ir al mazo" } },
  { id: "c2", t: "Sin fallar una", d: "Responde 8 drills de gramática hoy.", metric: "drills", goal: 8, goto: { module: "gram", label: "Abrir gramática" } },
  { id: "c3", t: "Diez de Use of English", d: "Corrige 10 ítems de Use of English hoy.", metric: "uoe", goal: 10, goto: { module: "uoe", label: "Abrir el módulo" } },
  { id: "c4", t: "Ciento cincuenta palabras", d: "Escribe 150 palabras en una tarea de Writing.", metric: "words", goal: 150, goto: { module: "writing", label: "Abrir Writing" } },
  { id: "c5", t: "Media hora limpia", d: "Suma 30 minutos de estudio hoy.", metric: "minutes", goal: 30 },
  { id: "c6", t: "Cuarenta tarjetas", d: "Acierta 40 tarjetas hoy. Se puede.", metric: "cards", goal: 40, goto: { module: "vocab", label: "Ir al mazo" } },
  { id: "c7", t: "Doce drills", d: "Doce drills de gramática en un día.", metric: "drills", goal: 12, goto: { module: "gram", label: "Abrir gramática" } },
  { id: "c8", t: "Doscientas palabras", d: "Escribe 200 palabras hoy.", metric: "words", goal: 200, goto: { module: "writing", label: "Abrir Writing" } },
  { id: "c9", t: "Quince transformaciones", d: "Quince ítems de Use of English hoy.", metric: "uoe", goal: 15, goto: { module: "uoe", label: "Abrir el módulo" } },
  { id: "c10", t: "Sesión completa", d: "Cuarenta y cinco minutos de estudio.", metric: "minutes", goal: 45 },
];

/** El reto de un día concreto. Estable: el mismo día siempre da el mismo reto. */
export function challengeFor(dayNumber: number): Challenge {
  return CHALLENGES[(dayNumber * 7) % CHALLENGES.length];
}
