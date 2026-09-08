/** Módulos, navegación por hash y tema claro/oscuro. */

import { S } from "./state";
import { TRACK_META, setTrack } from "./track";
import { $, $$, el } from "./dom";
import { anotarVisita } from "./pulse";

/** [id, número de módulo, etiqueta] — el id casa con el <section id="v-…">. */
export const MODULES: Array<[string, string, string]> = [
  ["panel", "00", "Panel"], ["examenes", "01", "Qué examen"], ["diag", "02", "Diagnóstico"],
  ["plan", "03", "Plan diario"], ["gram", "04", "Gramática"], ["vocab", "05", "Vocabulario"],
  ["mine", "06", "Mis palabras"], ["uoe", "07", "Use of English"], ["writing", "08", "Writing"],
  ["input", "09", "Listening & Reading"], ["speak", "10", "Speaking"], ["quiz", "11", "Prueba rápida"],
  ["mock", "12", "Simulacro"], ["errors", "13", "Errores"], ["tutor", "14", "Tutor"],
  ["res", "15", "Recursos"], ["ajustes", "16", "Ajustes"], ["cuenta", "17", "Cuenta"]
];

/** Cada módulo se vuelve a pintar al entrar en él: así ve lo que hiciste en otro. */
let repintar: (id: string) => void = () => {};
export function setModuleRenderer(fn: (id: string) => void): void { repintar = fn; }

export function go(id: string): void {
  anotarVisita(id);
  try { repintar(id); } catch (e) { console.error("[nav] falló al repintar", id, e); }
  $$(".view").forEach(v => v.classList.toggle("on", v.id === "v-" + id));
  $$("#nav button").forEach(b => b.setAttribute("aria-current", String((b as HTMLElement).dataset.go === id)));
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  location.hash = id;
}

export function buildNav(): void {
  const nav = $("#nav");
  if (!nav) return;
  MODULES.forEach(([id, n, label]) => {
    nav.append(el("button", { type: "button", "data-go": id, onclick: () => go(id) },
      el("span", { class: "n" }, n), el("span", {}, label)));
  });
}

/** Selector de ruta: cambiarlo cambia todo el contenido de la app. */
export function buildTrackPicker(): void {
  const host = $("#trackPick");
  if (!host) return;
  host.innerHTML = "";
  host.append(el("span", { class: "tlabel" }, "Tu ruta"));
  TRACK_META.forEach(t => {
    host.append(el("button", {
      type: "button",
      "aria-pressed": String(t.id === S.track),
      title: t.who + " · " + t.exam,
      // Cambiar de ruta puede tener que descargar su contenido: por eso es asíncrono.
      onclick: () => { setTrack(t.id).catch(e => alert(e.message)); },
    },
      el("span", { class: "tname" }, t.name),
      el("span", { class: "twho" }, t.who)));
  });
}

export type Tema = "light" | "dark" | null;

/** Quién avisa a Ajustes y al botón del menú de que el tema cambió. */
const oyentes: Array<(t: Tema) => void> = [];
export function onTheme(fn: (t: Tema) => void): void { oyentes.push(fn); }

/** Lo que se ve de verdad ahora mismo: la elección, o lo que diga el sistema. */
export function temaEfectivo(): "light" | "dark" {
  if (S.theme) return S.theme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * La barra del navegador y la del móvil también se pintan: sin esto, en la app
 * instalada queda una franja del color anterior encima del contenido.
 */
function pintarBarra(): void {
  const fondo = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
  if (!fondo) return;
  // Se quitan los dos condicionales del HTML: manda la elección, no el sistema.
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = fondo;
  document.head.append(meta);
}

export function applyTheme(): void {
  if (S.theme) document.documentElement.setAttribute("data-theme", S.theme);
  else document.documentElement.removeAttribute("data-theme");
  pintarBarra();
  oyentes.forEach(fn => { try { fn(S.theme); } catch { /* un oyente roto no rompe el tema */ } });
}

/** Elegir directamente, que es lo que hace el control de Ajustes. */
export function setTheme(t: Tema): void {
  S.theme = t;
  applyTheme();
}

export function cycleTheme(): Tema {
  const order: Tema[] = [null, "light", "dark"];
  S.theme = order[(order.indexOf(S.theme) + 1) % 3];
  applyTheme();
  return S.theme;
}

/* Si el tema va con el sistema y el sistema cambia (de día a noche), la barra
   del navegador tiene que seguirlo. */
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (!S.theme) applyTheme();
});
