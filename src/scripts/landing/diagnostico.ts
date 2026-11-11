/**
 * Diagnóstico de la muestra: las diez preguntas del onboarding de esa ruta,
 * corrección al momento y resultado por área (AC-3, AC-6b).
 *
 * Es lo único de la landing que se guarda, y solo en `sessionStorage` (muere
 * con la pestaña): si entras con tu correo en esta pestaña, pasa a tu cuenta.
 */

import { anunciar, el } from "../dom.ts";
import { puntuar } from "../diag-muestra.ts";
import type { Banda } from "../diag-muestra.ts";
import { guardar, leerDe } from "../relevo-diag.ts";
import type { RelevoDiag } from "../relevo-diag.ts";
import { GANAS, acciones, ganas, marcar, respuestas } from "./comun.ts";
import type { Montar, Tarjeta } from "./comun.ts";
import { preguntasDe } from "./muestra-datos.ts";
import type { Muestra } from "./muestra-datos.ts";

const BANDA: Record<Banda, string> = { debajo: "por debajo", nivel: "en el nivel", encima: "por encima" };

function sesion(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

/** El resultado guardado en esta pestaña para esa ruta, si lo hay y vale. */
export function guardadoDe(track: string): RelevoDiag | null {
  const s = sesion();
  const r = s ? leerDe(s, preguntasDe) : null;
  return r && r.track === track ? r : null;
}

function pintarResultado(t: Tarjeta, m: Muestra, respuestasDadas: Record<string, number>): void {
  const p = puntuar(m.diag, respuestasDadas);
  t.titulo("Pruébalo ahora: diagnóstico " + t.nombreRuta + ", resultado");
  t.chip("");
  const consejo = p.pct > 75 ? "Vas por encima de lo que pide esta ruta: empezarías más adelante en el plan."
    : p.pct >= 50 ? "Esta ruta es tu sitio: tienes base y se nota dónde flojea."
      : "Te conviene empezar desde el principio de la ruta, sin saltarte nada.";

  const repaso = el("details", {},
    el("summary", { class: "l-btn l-btn-quiet" }, "Repasar las diez preguntas"),
    el("ol", { class: "l-res l-repaso" }, m.diag.map(it => {
      const bien = respuestasDadas[it.id] === it.a;
      return el("li", { style: "flex-direction:column;align-items:flex-start" },
        el("span", { lang: "en" }, it.q),
        el("span", {}, (bien ? "Acertaste: " : "La correcta: "), el("b", { lang: "en" }, it.opts[it.a])),
        el("span", { class: "l-small", html: it.exp }));
    })));

  t.cuerpo.replaceChildren(
    el("div", {},
      el("span", { class: "l-score", id: "pruebaFoco", tabindex: "-1" }, p.aciertos + " de " + p.total),
      el("p", {}, consejo + " Empezarías en la semana " + p.semana + " (día " + p.dia + " de 120).")),
    el("ul", { class: "l-res" }, p.porArea.map(a =>
      el("li", {}, el("span", {}, a.area + ": " + a.ok + " de " + a.n), el("span", { class: "l-chip", "data-banda": a.banda }, BANDA[a.banda])))),
    repaso,
    ganas("Este resultado vive solo en esta pestaña: si entras con tu correo aquí, pasa a tu cuenta como punto de partida "
      + "y no repites el diagnóstico; se pierde al cerrar la pestaña. " + GANAS),
    acciones("diag"));
}

export const montarDiagnostico: Montar = (t, m) => {
  const dadas: Record<string, number> = {};
  let i = 0;

  const previo = guardadoDe(m.track);
  if (previo) { pintarResultado(t, m, previo.respuestas); return; }

  function pregunta(): void {
    const it = m.diag[i];
    t.titulo("Pruébalo ahora: diagnóstico " + t.nombreRuta + ", pregunta " + (i + 1) + " de " + m.diag.length);
    t.chip(it.area);
    const fb = el("div", { class: "l-fb", hidden: "" });
    const grupo = respuestas(it.opts, "pruebaFoco", elegida => {
      dadas[it.id] = elegida;
      marcar(grupo, elegida, it.a);
      const ultima = i === m.diag.length - 1;
      fb.replaceChildren(
        el("p", { html: it.exp }),
        el("div", { class: "l-row" },
          el("button", {
            class: "l-btn l-btn-secondary", type: "button", "data-siguiente": "",
            onclick: () => { i++; if (ultima) terminar(); else pregunta(); t.enfocar("#pruebaFoco"); },
          }, ultima ? "Ver mi resultado" : "Siguiente pregunta"),
          el("button", { class: "l-btn l-btn-quiet", type: "button", "data-ir-correo": "" }, "Usar mi correo")));
      fb.hidden = false;
      anunciar(elegida === it.a ? "Correcta." : "No. La correcta es " + it.opts[it.a] + ".");
      t.enfocar("[data-siguiente]");
    });
    t.cuerpo.replaceChildren(el("p", { class: "l-q", id: "pruebaFoco", tabindex: "-1", lang: "en" }, it.q), grupo, fb);
  }

  function terminar(): void {
    const s = sesion();
    try {
      if (s) guardar(s, { v: 1, track: m.track, respuestas: { ...dadas }, hecho: new Date().toISOString() });
    } catch { /* sin sessionStorage: el resultado se ve, pero no pasaría a la cuenta */ }
    pintarResultado(t, m, dadas);
  }

  pregunta();
};
