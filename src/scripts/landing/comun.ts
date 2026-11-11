/**
 * Piezas comunes de las actividades de la muestra: la tarjeta donde se juegan,
 * los iconos y el cierre de cada actividad con su invitación a entrar (AC-6).
 */

import { el } from "../dom.ts";
import type { Muestra } from "./muestra-datos.ts";

export type Actividad = "diag" | "tarjetas" | "escucha" | "uoe";

/** Lo que una actividad necesita de la página. Devuelve una función para pararla. */
export interface Tarjeta {
  cuerpo: HTMLElement;
  /** Título visible de la tarjeta ("Pruébalo ahora: …"). */
  titulo(texto: string): void;
  /** Etiqueta a la derecha (área, "Tarjeta 3 de 8"…); vacía la oculta. */
  chip(texto: string): void;
  /** Nombre de la ruta elegida, "B1 → B2". */
  nombreRuta: string;
  /** Lleva el foco a un elemento de la tarjeta sin mover la página. */
  enfocar(sel: string): void;
}

export type Montar = (t: Tarjeta, m: Muestra) => (() => void) | void;

export const GANAS =
  "Con cuenta guardas el progreso, tienes el plan de 24 semanas, tu seguimiento personal y un agente que adapta el estudio a tus errores.";

export function icono(nombre: "mail" | "alert" | "check" | "x", clase = "l-icon"): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", clase);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "#i-" + nombre);
  svg.append(use);
  return svg;
}

/** Cierre de cada actividad: entrar (secundario), repetir y probar otra, sin bloquear nada. */
export function acciones(repetir: Actividad): HTMLElement {
  return el("div", { class: "l-row" },
    el("button", { class: "l-btn l-btn-secondary", type: "button", "data-ir-correo": "" }, icono("mail"), "Entrar con tu correo"),
    el("button", { class: "l-btn l-btn-quiet", type: "button", "data-probar": repetir }, "Repetir"),
    el("button", { class: "l-btn l-btn-quiet", type: "button", "data-otra": "" }, "Probar otra actividad"));
}

export function ganas(texto = GANAS): HTMLElement {
  return el("p", { class: "l-gain" }, texto);
}

/** Botones de respuesta de opción múltiple. `lang="en"` en el texto de la opción. */
export function respuestas(opciones: string[], etiquetadoPor: string, alElegir: (i: number) => void): HTMLElement {
  return el("div", { class: "l-answers", role: "group", "aria-labelledby": etiquetadoPor },
    opciones.map((o, i) => el("button", { class: "l-ans", type: "button", "data-ans": i, onclick: () => alElegir(i) },
      el("span", { lang: "en" }, o), el("span", { class: "l-tag" }))));
}

/** Marca la correcta y, si no coincide, la elegida; desactiva el grupo. */
export function marcar(grupo: HTMLElement, elegida: number, correcta: number): void {
  grupo.querySelectorAll<HTMLButtonElement>("[data-ans]").forEach(b => {
    const k = Number(b.dataset.ans);
    b.disabled = true;
    const tag = b.querySelector(".l-tag")!;
    if (k === correcta) { b.dataset.mark = "ok"; tag.replaceChildren(icono("check"), "Correcta"); }
    else if (k === elegida) { b.dataset.mark = "bad"; tag.replaceChildren(icono("x"), "Tu respuesta"); }
  });
}
