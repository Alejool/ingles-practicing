/**
 * Escucha de la muestra: el primer audio de la ruta con el protocolo de tres
 * pases (idea general, detalle, transcripción) y la voz del navegador (AC-3).
 * Sin voz inglesa, la transcripción está a la vista desde el principio.
 */

import { anunciar, el } from "../dom.ts";
import { callar, hablarGuion, hayVoz } from "../voice.ts";
import { acciones, ganas, icono, marcar, respuestas } from "./comun.ts";
import type { Montar } from "./comun.ts";

const BOTON = ["Escuchar: idea general", "Escuchar otra vez: detalle", "Escuchar con la transcripción"];

export const montarEscucha: Montar = (t, m) => {
  const a = m.escucha;
  const voz = hayVoz();
  /** Pregunta → opción elegida. */
  const contestadas = new Map<number, number>();
  let pases = 0;
  let sonando = false;
  let vivo = true;

  function pintar(foco?: string): void {
    t.titulo("Pruébalo ahora: escucha, " + a.title);
    t.chip(pases >= 3 ? "3 pases hechos" : "Pase " + (pases + 1) + " de 3");
    const partes: Node[] = [
      el("p", { class: "l-ctx", id: "pruebaFoco", tabindex: "-1" }, a.context),
      el("ol", { class: "l-passes", "aria-hidden": "true" }, [0, 1, 2].map(k => el("li", { "data-done": k < pases ? "" : null }))),
    ];
    if (!voz) {
      partes.push(el("div", { class: "l-banner l-warn", role: "status" }, icono("alert"),
        el("div", { class: "l-tx" }, el("b", {}, "Tu navegador no tiene voz en inglés."), el("span", {}, "Lee la transcripción: es el mismo audio."))));
    } else if (pases < 3) {
      partes.push(el("div", { class: "l-row" },
        el("button", {
          class: "l-btn l-btn-secondary", type: "button", id: "escuchar",
          "aria-busy": sonando ? "true" : null, disabled: sonando ? "" : null, onclick: escuchar,
        }, sonando ? "Reproduciendo…" : BOTON[pases]),
        pases ? el("span", { class: "l-small" }, "Pase " + pases + " de 3 hecho") : null));
    }
    if (pases >= 1 || !voz) partes.push(preguntas());
    else partes.push(el("p", { class: "l-small" }, "Las preguntas aparecen después del primer pase; la transcripción, después del segundo."));
    if (pases >= 2 || !voz) {
      partes.push(el("ul", { class: "l-script", lang: "en" },
        a.lines.map(l => el("li", {}, el("b", {}, (l.s === "A" ? a.speakers.A : a.speakers.B ?? a.speakers.A) + ": "), l.t))));
    }
    if (contestadas.size === a.qs.length) {
      const bien = a.qs.filter((q, k) => contestadas.get(k) === q.a).length;
      partes.push(el("div", { class: "l-fb" },
        el("p", {}, el("b", {}, bien + " de " + a.qs.length + " bien."), " En la app tienes un audio así cada pocos días, con el mismo protocolo."),
        ganas(), acciones("escucha")));
    }
    t.cuerpo.replaceChildren(...partes);
    if (foco) t.enfocar(foco);
  }

  function preguntas(): HTMLElement {
    return el("ol", { class: "l-qs" }, a.qs.map((q, k) => {
      const id = "lq" + k;
      const li = el("li", {}, el("span", { class: "l-qt", id, lang: "en" }, (k + 1) + ". " + q.q));
      const grupo = respuestas(q.o, id, elegida => {
        contestadas.set(k, elegida);
        anunciar(elegida === q.a ? "Correcta." : "No. La correcta es: " + q.o[q.a] + ".");
        const siguiente = a.qs.findIndex((_, j) => !contestadas.has(j));
        pintar(siguiente < 0 ? "[data-ir-correo]" : ".l-qs > li:nth-child(" + (siguiente + 1) + ") .l-ans");
      });
      if (contestadas.has(k)) {
        marcar(grupo, contestadas.get(k)!, q.a);
        li.append(grupo, el("p", { class: "l-small", html: q.e }));
      } else li.append(grupo);
      return li;
    }));
  }

  function escuchar(): void {
    if (sonando) return;
    sonando = true;
    pintar("#escuchar");
    let acabado = false;
    const fin = () => {
      if (acabado || !vivo) return;
      acabado = true;
      sonando = false;
      pases++;
      pintar(pases < 3 ? "#escuchar" : "#pruebaFoco");
      anunciar("Pase " + pases + " de 3 hecho.");
    };
    void hablarGuion(a.lines, { rate: 0.95, onFin: fin, onError: fin });
  }

  pintar();
  return () => { vivo = false; callar(); };
};
