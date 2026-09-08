/** Utilidades de DOM y formato compartidas por todos los módulos. */

export type Child = Node | string | number | null | undefined;

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector(sel) as T | null;

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll(sel)) as T[];

/**
 * Crea un elemento. En `attrs`: `class` va a className, `html` a innerHTML,
 * cualquier clave `onX` se registra como listener y el resto son atributos.
 * Los hijos `null` se ignoran, lo que permite `cond ? el(...) : null`.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs?: Record<string, any>, ...kids: any[]
): HTMLElementTagNameMap[K];
export function el(tag: string, attrs?: Record<string, any>, ...kids: any[]): HTMLElement;
export function el(tag: string, attrs: Record<string, any> = {}, ...kids: any[]): HTMLElement {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, String(v));
  }
  for (const k of kids.flat()) {
    if (k === null || k === undefined) continue;
    n.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return n;
}

export function esc(s: unknown): string {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export function toast(msg: string): void {
  const t = el("div", { class: "toast" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
}

/** Normaliza una respuesta escrita para compararla: minúsculas, apóstrofo recto, sin puntuación final. */
export function norm(s: unknown): string {
  return String(s || "").toLowerCase().trim().replace(/[’']/g, "'").replace(/\s+/g, " ").replace(/[.,;!?]+$/, "");
}

export function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0;
}

/** Segundos → mm:ss */
export function fmt(s: number): string {
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

/** Cuenta palabras de un texto libre. */
export function words(s: string): number {
  return (s.trim().match(/\S+/g) || []).length;
}

/** "140–190" → [140, 190]; "100" → [100, null] */
export function rangeOf(str: string): [number, number | null] {
  const m = String(str).match(/(\d+)\D*(\d+)?/);
  return m ? [parseInt(m[1]), m[2] ? parseInt(m[2]) : null] : [0, null];
}
