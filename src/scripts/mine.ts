/**
 * Cuaderno de palabras difíciles: refuerzo por escritura.
 *
 * La diferencia con el vocabulario normal es que aquí no se reconoce, se
 * produce: escribes la palabra. Si la escribes mal vuelve a la caja 1 y te la
 * pregunta otra vez el mismo día, no dentro de una semana.
 */

import { P, save } from "./state";
import { norm } from "./dom";
import type { Card, MyWord } from "../data/types";

/** Días que espera cada caja. La 1 vuelve hoy mismo. */
export const CAJAS = [0, 0, 1, 3, 7, 21];

function ahora(): number { return Date.now(); }

export function palabras(): MyWord[] {
  const p = P();
  if (!Array.isArray(p.mine)) p.mine = [];
  return p.mine;
}

/** Ya está en el cuaderno (comparando sin acentos ni mayúsculas). */
export function tiene(en: string): MyWord | undefined {
  const k = norm(en);
  return palabras().find(w => norm(w.en) === k);
}

export function anadir(en: string, es: string, ex = "", from = "a mano"): MyWord | null {
  const limpio = en.trim();
  if (!limpio || !es.trim()) return null;
  const ya = tiene(limpio);
  if (ya) {
    // Volver a añadirla es decir «esta se me sigue atragantando»: baja a la caja 1.
    ya.box = 1;
    ya.due = ahora();
    ya.again = true;
    save();
    return ya;
  }
  const w: MyWord = {
    id: "m" + ahora().toString(36) + Math.random().toString(36).slice(2, 6),
    en: limpio, es: es.trim(), ex: ex.trim(),
    box: 1, due: ahora(), fails: 0, seen: 0, added: ahora(), from,
  };
  palabras().unshift(w);
  save();
  return w;
}

/** Mete una tarjeta de mazo en el cuaderno. Es lo que se llama al fallarla. */
export function anadirCarta(c: Card, mazo: string): MyWord | null {
  return anadir(c[0], c[2], c[3], mazo);
}

export function quitar(id: string): void {
  const p = P();
  p.mine = palabras().filter(w => w.id !== id);
  save();
}

/** Las que tocan ahora: las marcadas para volver hoy y las vencidas. */
export function pendientes(): MyWord[] {
  const t = ahora();
  return palabras()
    .filter(w => w.again || w.due <= t)
    .sort((a, b) => (b.again ? 1 : 0) - (a.again ? 1 : 0) || a.due - b.due);
}

export function calificar(w: MyWord, ok: boolean): void {
  w.seen++;
  if (ok) {
    w.again = false;
    w.box = Math.min(5, w.box + 1);
    w.due = ahora() + CAJAS[w.box] * 86400000;
  } else {
    w.fails++;
    w.box = 1;
    w.due = ahora();
    // Vuelve en esta misma sesión, no mañana.
    w.again = true;
  }
  save();
}

/** Reparto por cajas, para la barra del módulo. */
export function porCaja(): number[] {
  const c = [0, 0, 0, 0, 0];
  palabras().forEach(w => { c[Math.min(5, Math.max(1, w.box)) - 1]++; });
  return c;
}

/** Las que más se resisten. */
export function masFalladas(n = 5): MyWord[] {
  return palabras().filter(w => w.fails > 0).sort((a, b) => b.fails - a.fails).slice(0, n);
}

export type Modo = "escribir" | "hueco";

/** Qué se pregunta de esta palabra. Si no hay ejemplo, solo se puede escribir. */
export function modoDe(w: MyWord): Modo {
  if (!w.ex || !huecoDe(w)) return "escribir";
  // Alterna según las veces vistas: ni siempre lo mismo ni al azar puro.
  return w.seen % 2 === 0 ? "escribir" : "hueco";
}

/** La frase de ejemplo con la palabra tapada, o null si no aparece en ella. */
export function huecoDe(w: MyWord): string | null {
  if (!w.ex) return null;
  const base = w.en.trim().split(/\s+/)[0].replace(/[^A-Za-z'’-]/g, "");
  if (base.length < 3) return null;
  // Busca la palabra o una forma flexionada suya (-s, -ed, -ing, -d).
  const re = new RegExp("\\b" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(s|es|ed|d|ing)?\\b", "i");
  if (!re.test(w.ex)) return null;
  return w.ex.replace(re, "________");
}

/** Compara lo escrito con la respuesta. Tolera el artículo «to» del infinitivo. */
export function acierta(w: MyWord, escrito: string): boolean {
  const suyo = norm(escrito).replace(/^to\s+/, "");
  const bueno = norm(w.en).replace(/^to\s+/, "");
  if (!suyo) return false;
  if (suyo === bueno) return true;
  // «seek / sought / sought» acepta cualquiera de las tres formas.
  return bueno.split("/").map(x => x.trim()).filter(Boolean).includes(suyo);
}

/** Cuánto se parece lo escrito a lo correcto, para decir «casi». */
export function casi(w: MyWord, escrito: string): boolean {
  const a = norm(escrito).replace(/^to\s+/, "");
  const b = norm(w.en).replace(/^to\s+/, "").split("/")[0].trim();
  if (!a || !b || a === b) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  let d = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0, j = 0; i < n; i++, j++) {
    if (a[i] === b[j]) continue;
    if (++d > 2) return false;
    if (a.length > b.length) j--;
    else if (b.length > a.length) i--;
  }
  return true;
}
