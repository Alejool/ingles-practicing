/**
 * Navegación con destino concreto.
 *
 * Un paso del plan no dice «vete a Writing»: dice «abre la tarea 3 de Writing».
 * Aquí se deja anotado a dónde hay que ir y la vista de destino lo recoge al pintarse.
 */

import type { StepGoto } from "../data/types";

let pending: StepGoto | null = null;

export function setIntent(g: StepGoto): void {
  pending = g;
}

/** La vista `module` recoge su destino, si lo hay. Se consume una sola vez. */
export function takeIntent(module: string): StepGoto | null {
  if (!pending || pending.module !== module) return null;
  const g = pending;
  pending = null;
  return g;
}
