/**
 * Módulo · Gramática.
 *
 * Antes era una unidad entera en vertical: la regla, la trampa y luego los diez
 * drills uno debajo de otro. En el móvil eso son cinco pantallazos de scroll
 * para llegar a la pregunta 7, sin saber nunca cuántas quedan.
 *
 * Ahora la unidad es un recorrido: eliges cuál, lees la regla, y respondes una
 * pregunta por pantalla con «Atrás» y «Siguiente» —se puede volver a mirar lo
 * anterior, que es justo lo que uno quiere hacer cuando falla— y al final un
 * resumen con lo que has acertado.
 */

import { save, P } from "../state";
import { $, el, esc } from "../dom";
import { T } from "../track";
import { bump } from "../progress";
import { takeIntent } from "../intent";
import { crearPasos, navPasos, pantallaCompleta } from "../pasos";
import type { GrammarUnit } from "../../data/types";

export let gramSel = "g1";
/** null = pantalla de elegir unidad; 0 = la regla; 1..n = cada drill; -1 = resumen. */
let paso: number | null = null;

export function gramScore(u: GrammarUnit) {
  const r = P().gram[u.id] || {};
  const done = Object.keys(r).filter(k => !k.startsWith("p")).length;
  const ok = Object.entries(r).filter(([k, v]) => !k.startsWith("p") && v).length;
  return { done, ok, total: u.dr.length };
}

function unidad(): GrammarUnit {
  return T().grammar.find(x => x.id === gramSel) || T().grammar[0];
}

export function renderGram(): void {
  const intent = takeIntent("gram");
  if (intent?.unit && T().grammar.some(u => u.id === intent.unit)) { gramSel = intent.unit; paso = null; }
  if (!T().grammar.some(u => u.id === gramSel)) { gramSel = T().grammar[0].id; paso = null; }

  const out = $("#gramOut");
  if (!out) return;
  out.innerHTML = "";
  pantallaCompleta(paso !== null && paso >= 0, "gram");
  if (paso === null) { elegir(out); return; }
  if (paso < 0) { resumen(out); return; }
  recorrido(out);
}

/* ─────────────── elegir unidad ─────────────── */

function elegir(out: HTMLElement): void {
  const lista = el("div", { class: "listilla" });
  T().grammar.forEach(u => {
    const s = gramScore(u);
    const estado = s.done === 0 ? "" : s.ok === s.total ? " ok" : s.ok / s.total >= 0.75 ? " warn" : " bad";
    lista.append(el("button", {
      class: "fila" + (u.id === gramSel ? " on" : ""), type: "button",
      onclick: () => { gramSel = u.id; paso = 0; renderGram(); },
    },
      el("span", { class: "fila-t" }, String(u.n).padStart(2, "0") + " · " + u.t),
      el("span", { class: "fila-n" }, u.lvl + " · " + u.dr.length + " ejercicios"),
      el("span", { class: "chip" + estado }, s.done ? s.ok + "/" + s.total : "sin hacer")));
  });

  out.append(
    el("div", { class: "card" },
      el("span", { class: "eyebrow" }, "Elige una unidad"),
      el("p", { class: "tiny", style: "margin:4px 0 6px" },
        "Cada una es la regla, la trampa que se nos cuela a los hispanohablantes, y sus ejercicios de uno en uno."),
      lista));
}

/* ─────────────── el recorrido ─────────────── */

function recorrido(out: HTMLElement): void {
  const u = unidad();
  const total = u.dr.length;
  const rec = P().gram[u.id] || (P().gram[u.id] = {});
  const pasos = crearPasos(out, { alSalir: () => { paso = null; renderGram(); } });

  const pintar = () => {
    pasos.limpiar();
    const i = (paso as number) - 1;      // -1 → la regla
    pasos.progreso(Math.max(0, paso as number), total + 1,
      paso === 0 ? "la regla" : (i + 1) + " / " + total);

    if (paso === 0) {
      pasos.cuerpo.append(
        el("div", { class: "row", style: "gap:6px;justify-content:center" },
          el("span", { class: "chip a" }, "Unidad " + u.n), el("span", { class: "chip" }, u.lvl)),
        el("h2", { class: "h-sec", style: "margin:10px 0 0;font-size:24px" }, u.t),
        el("div", { class: "regla", html: u.rule }),
        el("div", { class: "explain", style: "margin-top:14px;text-align:left" },
          el("span", { class: "tag" }, "La trampa del hispanohablante"),
          el("span", { html: u.trap })));
      pasos.pie.append(navPasos({
        siguiente: () => { paso = 1; pintar(); pasos.medir(); },
        textoSiguiente: "Empezar los " + total + " ejercicios ›",
      }));
      pasos.medir();
      return;
    }

    const d = u.dr[i];
    const contestada = rec[i] !== undefined;
    const elegida = rec["p" + i];

    pasos.cuerpo.append(el("div", { class: "qtext", html: esc(d.q).replace(/___/g, '<span class="hl">______</span>') }));
    const caja = el("div", { class: "opciones" });
    d.o.forEach((o, j) => {
      const clase = contestada ? (j === d.a ? " ok" : (elegida === j ? " mal" : "")) : "";
      caja.append(el("button", {
        class: "opt" + clase, type: "button", disabled: contestada ? "" : null,
        onclick: () => {
          rec["p" + i] = j;
          rec[i] = j === d.a;
          save();
          bump("gram", j === d.a);
          pintar();
          pasos.medir();
        },
      }, el("span", { class: "k" }, "ABCD"[j]), el("span", {}, o)));
    });
    pasos.cuerpo.append(caja);
    if (contestada) {
      pasos.cuerpo.append(el("div", { class: "explain", style: "margin-top:14px;text-align:left" },
        el("span", { class: "tag" }, rec[i] ? "Correcto · por qué" : "Por qué"),
        el("span", { html: d.e })));
    }

    pasos.pie.append(navPasos({
      atras: () => { paso = (paso as number) - 1; pintar(); pasos.medir(); },
      siguiente: contestada
        ? () => { paso = i + 2 <= total ? i + 2 : -1; renderGram(); }
        : null,
      textoSiguiente: i + 1 >= total ? "Ver el resultado ›" : "Siguiente ›",
      extra: contestada ? null : el("span", { class: "tiny", style: "align-self:center" }, "Elige una respuesta"),
    }));
    pasos.medir();
  };

  pintar();
}

/* ─────────────── resumen ─────────────── */

function resumen(out: HTMLElement): void {
  const u = unidad();
  const s = gramScore(u);
  const falladas = u.dr.map((_d, i) => i).filter(i => (P().gram[u.id] || {})[i] === false);
  const siguiente = T().grammar[(T().grammar.findIndex(x => x.id === gramSel) + 1) % T().grammar.length];

  out.append(el("div", { class: "card", style: "max-width:560px;margin:0 auto;text-align:center" },
    el("span", { class: "eyebrow" }, "Unidad " + u.n + " terminada"),
    el("div", { class: "res-num" }, s.ok + " / " + s.total),
    el("p", { class: "small" }, u.t),
    falladas.length
      ? el("div", { class: "fb err", style: "margin-top:12px;text-align:left" },
          el("div", { style: "font-weight:600" }, "Repasa estas " + falladas.length),
          el("div", { class: "small", style: "margin-top:4px" }, "Ejercicios " + falladas.map(i => i + 1).join(", ")))
      : el("p", { class: "small", style: "margin-top:10px" }, "Sin fallos. A por la siguiente."),
    el("div", { class: "row", style: "justify-content:center;margin-top:16px" },
      falladas.length
        ? el("button", { class: "btn", type: "button", onclick: () => { paso = falladas[0] + 1; renderGram(); } }, "Volver a los fallos")
        : null,
      el("button", {
        class: "btn" + (falladas.length ? " ghost" : ""), type: "button",
        onclick: () => { gramSel = siguiente.id; paso = 0; renderGram(); },
      }, "Unidad " + siguiente.n + " ›")),
    el("div", { class: "row", style: "justify-content:center;margin-top:8px" },
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { P().gram[u.id] = {}; save(); paso = 1; renderGram(); },
      }, "Repetir esta unidad"),
      el("button", { class: "btn ghost small", type: "button", onclick: () => { paso = null; renderGram(); } }, "Elegir otra"))));
}

/** El módulo ya no tiene pestañas: la lista de unidades es la primera pantalla. */
export function renderGramTabs(): void { /* se conserva por compatibilidad */ }
