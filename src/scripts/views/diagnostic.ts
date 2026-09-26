/**
 * Módulo · Diagnóstico.
 *
 * Treinta preguntas seguidas en vertical eran, en el móvil, una pared: nadie
 * sabe por dónde va ni cuánto queda, y a la doce se abandona. Ahora es una
 * pregunta por pantalla, con la barra diciendo cuántas faltan y «Atrás» para
 * revisar, que en una prueba de nivel es imprescindible: uno cambia de idea.
 *
 * La corrección sigue siendo al final y de golpe, a propósito: si corrigiera
 * sobre la marcha dejaría de medir el nivel y pasaría a enseñar, que es lo que
 * hacen los demás módulos.
 */

import { S, save, touchDay, P } from "../state";
import { $, el, esc, toast } from "../dom";
import { T, setTrack } from "../track";
import { levelLabelData, setOpenDay } from "../progress";
import { renderPanel } from "./panel";
import { go } from "../nav";
import { crearPasos, navPasos, pantallaCompleta } from "../pasos";

/** null = portada; 0..n-1 = pregunta; -1 = resultado. */
let paso: number | null = null;

export function renderDiag(): void {
  const out = $("#diagOut");
  if (!out) return;
  out.innerHTML = "";
  // Terminado y sin estar respondiendo: se enseña el resultado directamente.
  if (paso === null && P().diag.done) paso = -1;
  pantallaCompleta(paso !== null && paso >= 0, "diag");

  if (paso === null) { portada(out); return; }
  if (paso < 0) { resultado(out); return; }
  preguntas(out);
}

/* ─────────────── portada ─────────────── */

function portada(out: HTMLElement): void {
  const total = T().diag.length;
  const hechas = Object.keys(P().diag.answers).length;

  out.append(el("div", { class: "card", style: "max-width:560px" },
    el("span", { class: "eyebrow" }, "Antes de empezar"),
    el("h3", { style: "margin:6px 0 8px" }, total + " preguntas, una por pantalla"),
    el("p", { class: "small" },
      "Sin cronómetro y sin buscar nada: responde lo que te suene natural. Puedes volver atrás para " +
      "cambiar una respuesta, y la corrección llega al final, toda junta."),
    hechas && !P().diag.done
      ? el("p", { class: "tiny", style: "margin-top:10px" }, "Tienes " + hechas + " de " + total + " respondidas.")
      : null,
    el("div", { class: "row", style: "margin-top:14px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => {
          if (P().diag.done) { P().diag = { answers: {}, done: false, score: null }; save(); }
          paso = primeraSinResponder();
          renderDiag();
        },
      }, hechas && !P().diag.done ? "Seguir donde lo dejé" : "Empezar la prueba"),
      hechas && !P().diag.done
        ? el("button", {
            class: "btn ghost", type: "button",
            onclick: () => { P().diag = { answers: {}, done: false, score: null }; save(); paso = 0; renderDiag(); },
          }, "Empezar de cero")
        : null,
      P().diag.done
        ? el("button", { class: "btn ghost", type: "button", onclick: () => { paso = -1; renderDiag(); } }, "Ver mi resultado")
        : null)));
}

function primeraSinResponder(): number {
  const i = T().diag.findIndex(it => P().diag.answers[it.id] === undefined);
  return i < 0 ? 0 : i;
}

/* ─────────────── las preguntas ─────────────── */

function preguntas(out: HTMLElement): void {
  const items = T().diag;
  const total = items.length;
  const pasos = crearPasos(out, { alSalir: () => { paso = null; renderDiag(); } });

  const pintar = () => {
    pasos.limpiar();
    const i = paso as number;
    const it = items[i];
    const elegida = P().diag.answers[it.id];
    const respondidas = Object.keys(P().diag.answers).length;
    pasos.progreso(respondidas, total, (i + 1) + " / " + total);

    pasos.cuerpo.append(
      el("div", { class: "row", style: "gap:6px;justify-content:center" },
        el("span", { class: "chip" }, it.area), el("span", { class: "chip a" }, it.lvl)),
      el("div", { class: "qtext", style: "margin-top:14px", html: esc(it.q).replace(/___/g, '<span class="hl">______</span>') }));

    const caja = el("div", { class: "opciones" });
    it.opts.forEach((o, j) => {
      caja.append(el("button", {
        class: "opt" + (elegida === j ? " elegida" : ""), type: "button",
        onclick: () => {
          P().diag.answers[it.id] = j;
          save();
          // Avanzar solo: en una prueba de treinta, cada toque de más pesa.
          if (i + 1 < total) paso = i + 1;
          pintar();
          pasos.medir();
        },
      }, el("span", { class: "k" }, "ABCD"[j]), el("span", {}, o)));
    });
    pasos.cuerpo.append(caja);

    const faltan = total - respondidas;
    pasos.pie.append(navPasos({
      atras: i > 0 ? () => { paso = i - 1; pintar(); pasos.medir(); } : null,
      siguiente: i + 1 < total
        ? () => { paso = i + 1; pintar(); pasos.medir(); }
        : (faltan === 0 ? corregir : null),
      textoSiguiente: i + 1 < total ? "Siguiente ›" : "Corregir las " + total + " ›",
      extra: i + 1 >= total && faltan > 0
        ? el("button", {
            class: "btn ghost", type: "button",
            onclick: () => { paso = primeraSinResponder(); pintar(); pasos.medir(); },
          }, "Faltan " + faltan + ": ir a la primera")
        : null,
    }));
    pasos.medir();
  };

  pintar();
}

function corregir(): void {
  let right = 0;
  T().diag.forEach(it => { if (P().diag.answers[it.id] === it.a) right++; });
  P().diag.done = true;
  P().diag.score = { right, pct: Math.round(right / T().diag.length * 100) };
  P().stats.diag = { ok: right, n: T().diag.length };
  save();
  touchDay();
  paso = -1;
  renderDiag();
  renderPanel();
}

/* ─────────────── resultado ─────────────── */

function resultado(out: HTMLElement): void {
  const sc = P().diag.score!;
  const byArea: Record<string, { ok: number; n: number }> = {};
  T().diag.forEach(it => {
    const a = byArea[it.area] || (byArea[it.area] = { ok: 0, n: 0 });
    a.n++;
    if (P().diag.answers[it.id] === it.a) a.ok++;
  });
  const weak = Object.entries(byArea).filter(([, v]) => v.ok / v.n < 0.7).map(([k]) => k);
  const lv = levelLabelData();
  const start = sc.pct < 50 ? 1 : sc.pct < 65 ? 4 : sc.pct < 78 ? 9 : 13;

  out.append(el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Resultado"),
    el("h3", { style: "margin:4px 0 6px;font-size:26px" },
      "Nivel estimado: " + lv.v + " · " + sc.right + "/" + T().diag.length + " (" + sc.pct + "%)"),
    el("p", { class: "small" }, sc.pct < 50 ? "Base de B1 aún incompleta. El plan te sirve entero: no saltes el Bloque A."
      : sc.pct < 65 ? "B1 razonable con agujeros claros. Empieza en la semana 4 y no descuides las áreas rojas."
        : sc.pct < 78 ? "B1 sólido, entrando en B2. Empieza en la semana 9; el salto está en producción, no en comprensión."
          : "B2 en marcha. Empieza en la semana 13 y prioriza precisión, léxico preciso y formato de examen."),
    el("div", { class: "row", style: "margin-top:12px" },
      el("span", { class: "chip a" }, "Empieza en la semana " + start),
      ...weak.slice(0, 6).map(w => el("span", { class: "chip bad" }, w))),
    otraRuta(sc.pct),
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => {
          setOpenDay((start - 1) * 5 + 1);
          go("plan");
          toast("Te dejo en el día " + ((start - 1) * 5 + 1) + ", que es donde te toca empezar");
        },
      }, "Empezar en la semana " + start),
      el("button", { class: "btn ghost", type: "button", onclick: () => { paso = 0; renderDiag(); } }, "Revisar mis respuestas"),
      el("button", {
        class: "btn ghost", type: "button",
        onclick: () => {
          P().diag = { answers: {}, done: false, score: null };
          save();
          paso = null;
          renderDiag();
          toast("Diagnóstico reiniciado");
        },
      }, "Repetir la prueba"))));

  // Repaso: cada pregunta con lo que marcaste, lo correcto y el porqué. Va
  // plegado para que la lista se pueda recorrer de un vistazo.
  const lista = el("div", { class: "listilla", style: "margin-top:8px" });
  T().diag.forEach((it, i) => {
    const elegida = P().diag.answers[it.id];
    const ok = elegida === it.a;
    lista.append(el("details", { class: "repaso" + (ok ? " ok" : " mal") },
      el("summary", {},
        el("span", { class: "mono tiny" }, String(i + 1).padStart(2, "0")),
        el("span", { class: "repaso-q", html: esc(it.q).replace(/___/g, "______") }),
        el("span", { class: "chip " + (ok ? "ok" : "bad") }, ok ? "✓" : "✗")),
      el("div", { class: "repaso-body" },
        el("div", { class: "small" }, "Correcta: " + it.opts[it.a]),
        !ok && elegida !== undefined
          ? el("div", { class: "small", style: "color:var(--bad)" }, "Tú marcaste: " + it.opts[elegida])
          : null,
        el("div", { class: "explain", style: "margin-top:8px" },
          el("span", { class: "tag" }, "Por qué"), el("span", { html: it.exp })))));
  });
  out.append(el("div", { class: "card", style: "margin-top:14px" },
    el("span", { class: "eyebrow" }, "Repaso pregunta a pregunta"),
    el("p", { class: "tiny", style: "margin:4px 0 8px" }, "Pulsa cualquiera para ver la explicación."),
    lista));
}

/**
 * Si el resultado se sale por arriba o por abajo, la ruta elegida no es la suya:
 * mejor decirlo aquí que dejar a alguien meses en el sitio equivocado.
 */
function otraRuta(pct: number): HTMLElement | null {
  const esA2 = S.track === "a2b1";
  if (esA2 && pct >= 88) {
    return el("div", { class: "explain", style: "margin-top:12px;border-left-color:var(--ok);background:var(--ok-soft)" },
      el("span", { class: "tag" }, "Se te queda corta"),
      el("span", {}, "Con este resultado la ruta A2 → B1 te va a aburrir. "),
      el("button", {
        class: "btn small", style: "margin-left:8px", type: "button",
        onclick: () => { setTrack("b1b2").then(() => { paso = null; go("diag"); }).catch(e => toast(e.message)); },
      }, "Cambiar a B1 → B2"));
  }
  if (!esA2 && pct < 40) {
    return el("div", { class: "explain", style: "margin-top:12px;border-left-color:var(--warn);background:var(--warn-soft)" },
      el("span", { class: "tag" }, "Vas a sufrir de más"),
      el("span", {}, "Con menos del 40% en B1 → B2 conviene afianzar la base antes. "),
      el("button", {
        class: "btn small", style: "margin-left:8px", type: "button",
        onclick: () => { setTrack("a2b1").then(() => { paso = null; go("diag"); }).catch(e => toast(e.message)); },
      }, "Cambiar a A2 → B1"));
  }
  return null;
}

/** El panel la llama al recalcular el nivel. */
export function renderDiagResult(): void { renderDiag(); }
