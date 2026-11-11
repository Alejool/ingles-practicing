/**
 * El diagnóstico corto: diez preguntas, su nota y dónde colocarte.
 *
 * Lo usan el onboarding de la app y la muestra de la landing, para que un
 * resultado hecho en la landing sea indistinguible del de la app. Solo tipos:
 * no lee ni escribe estado (la landing no puede importar `state.ts`).
 */

import type { DiagItem } from "../data/types.ts";
import type { AppState, TrackProgress } from "./state.ts";

export type Banda = "debajo" | "nivel" | "encima";

export interface NotaArea {
  area: string;
  ok: number;
  n: number;
  banda: Banda;
}

export interface Puntuacion {
  /** Solo las respuestas a las preguntas puntuadas. */
  respuestas: Record<string, number>;
  aciertos: number;
  /** Cuántas preguntas se puntuaron. */
  total: number;
  pct: number;
  /** En el orden en que aparece cada área en el diagnóstico. */
  porArea: NotaArea[];
  semana: number;
  dia: number;
}

/**
 * Diez preguntas repartidas por área y nivel.
 *
 * Se cogen a saltos regulares del diagnóstico completo en vez de al azar, para
 * que siempre salga una muestra pareja de fácil a difícil.
 */
export function muestraDiag(items: DiagItem[], n = 10): DiagItem[] {
  if (items.length <= n) return items.slice();
  const paso = items.length / n;
  const out: DiagItem[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(i * paso)]);
  return out;
}

/** Mismos umbrales que la guía del harness: < 50 % por debajo, 50–75 % en nivel, > 75 % por encima. */
function banda(ok: number, n: number): Banda {
  const pct = n ? (ok / n) * 100 : 0;
  return pct < 50 ? "debajo" : pct <= 75 ? "nivel" : "encima";
}

/** La misma escala que el diagnóstico largo, para que no se contradigan. */
export function semanaDe(pct: number): number {
  return pct < 50 ? 1 : pct < 65 ? 4 : pct < 78 ? 9 : 13;
}

export function puntuar(items: DiagItem[], respuestas: Record<string, number>): Puntuacion {
  const faltan = items.filter(i => typeof respuestas[i.id] !== "number").length;
  if (faltan) throw new Error("Faltan " + faltan + " respuesta" + (faltan === 1 ? "" : "s") + " del diagnóstico.");

  const propias: Record<string, number> = {};
  const areas = new Map<string, { ok: number; n: number }>();
  let aciertos = 0;
  for (const it of items) {
    const r = respuestas[it.id];
    propias[it.id] = r;
    const a = areas.get(it.area) || { ok: 0, n: 0 };
    a.n++;
    if (r === it.a) { a.ok++; aciertos++; }
    areas.set(it.area, a);
  }

  const pct = items.length ? Math.round((aciertos / items.length) * 100) : 0;
  const semana = semanaDe(pct);
  return {
    respuestas: propias,
    aciertos,
    total: items.length,
    pct,
    porArea: [...areas].map(([area, { ok, n }]) => ({ area, ok, n, banda: banda(ok, n) })),
    semana,
    dia: (semana - 1) * 5 + 1,
  };
}

/**
 * Lleva un resultado al estado como lo hace el paso 3 del onboarding: el
 * diagnóstico queda guardado con su nota y la ruta abre en el día que toca.
 * Si esa ruta ya tiene un diagnóstico empezado o hecho, no lo pisa.
 */
export function aplicarResultado(estado: AppState, ruta: string, p: Puntuacion): "aplicado" | "ignorado" {
  const t = (estado.tracks as Record<string, TrackProgress>)[ruta];
  if (!t) throw new Error("La ruta " + ruta + " no tiene progreso en el estado.");
  if (t.diag?.done || Object.keys(t.diag?.answers || {}).length) return "ignorado";

  t.diag = { answers: { ...p.respuestas }, done: false, score: { right: p.aciertos, pct: p.pct } };
  t.stats.diag = { ok: p.aciertos, n: p.total };
  t.current = p.dia;
  estado.track = ruta as AppState["track"];
  return "aplicado";
}
