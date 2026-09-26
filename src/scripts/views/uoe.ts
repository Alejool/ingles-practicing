/**
 * Módulo · Use of English.
 *
 * Tres tipos de ejercicio y, antes, tres listas larguísimas: veinte
 * transformaciones seguidas, los textos de open cloze con doce huecos y las
 * word formation una detrás de otra. Ahora cada ejercicio ocupa su pantalla y
 * se avanza con «Siguiente», con «Atrás» para releer el anterior.
 *
 * El open cloze es la excepción a propósito: sus doce huecos van en un mismo
 * texto y separarlos sería quitarle lo que lo hace difícil —hay que leer el
 * párrafo entero para saber qué falta—, así que ahí se avanza hueco a hueco
 * pero con el texto siempre delante, resaltando en cuál estás.
 */

import { save, P } from "../state";
import { $, el, esc, norm } from "../dom";
import { T } from "../track";
import { takeIntent } from "../intent";
import { isGap } from "../../data/types";
import { bump } from "../progress";
import { crearPasos, navPasos, pantallaCompleta } from "../pasos";
import type { ClozeGap } from "../../data/types";

export let uoeSel = "trans";
let clozeIdx = 0;
/** null = elegir; 0..n = ejercicio; -1 = resumen. */
let paso: number | null = null;

type Serie = { id: string; nombre: string; total: number; hechos: number; aciertos: number };

function series(): Serie[] {
  const cuenta = (pre: string, ids: string[]) => {
    const recs = ids.map(x => P().uoe[pre + x]).filter(Boolean);
    return { hechos: recs.length, aciertos: recs.filter(r => r!.ok).length };
  };
  const t = cuenta("t:", T().trans.map(x => x.id));
  const w = cuenta("w:", T().wform.map(x => x.id));
  const huecos = T().clozes.flatMap((c, i) => c.parts.filter(isGap).map(g => i + ":" + g.g));
  const c = { hechos: huecos.filter(k => P().uoe["c" + k]).length, aciertos: huecos.filter(k => (P().uoe["c" + k] || {}).ok).length };
  return [
    { id: "trans", nombre: "Transformaciones", total: T().trans.length, ...t },
    { id: "cloze", nombre: "Open cloze", total: huecos.length, ...c },
    { id: "wf", nombre: "Word formation", total: T().wform.length, ...w },
  ];
}

export function renderUoe(): void {
  const intent = takeIntent("uoe");
  if (intent?.set) { uoeSel = intent.set; paso = null; }
  if (T().clozes.length <= clozeIdx) clozeIdx = 0;

  const out = $("#uoeOut");
  if (!out) return;
  out.innerHTML = "";
  pantallaCompleta(paso !== null && paso >= 0, "uoe");
  if (paso === null) { elegir(out); return; }
  if (paso < 0) { resumen(out); return; }
  if (uoeSel === "trans") recorridoTrans(out);
  else if (uoeSel === "wf") recorridoWform(out);
  else recorridoCloze(out);
}

/* ─────────────── elegir ─────────────── */

const EXPLICA: Record<string, string> = {
  trans: "Reescribe la frase con la palabra clave. Entre dos y cinco palabras y la clave no se toca.",
  cloze: "Un texto con doce huecos: una sola palabra en cada uno, casi siempre gramatical.",
  wf: "Transforma la palabra en mayúsculas para que encaje en la frase.",
};

function elegir(out: HTMLElement): void {
  const lista = el("div", { class: "listilla" });
  series().forEach(s => {
    const estado = !s.hechos ? "" : s.aciertos / s.hechos >= 0.8 ? " ok" : s.aciertos / s.hechos >= 0.5 ? " warn" : " bad";
    lista.append(el("button", {
      class: "fila" + (s.id === uoeSel ? " on" : ""), type: "button",
      onclick: () => { uoeSel = s.id; paso = 0; renderUoe(); },
    },
      el("span", { class: "fila-t" }, s.nombre),
      el("span", { class: "fila-n" }, EXPLICA[s.id]),
      el("span", { class: "chip" + estado }, s.hechos ? s.aciertos + "/" + s.hechos : s.total + " sin hacer")));
  });

  const textos = el("div", { class: "row", style: "margin-top:10px" });
  T().clozes.forEach((c, i) => {
    const g = c.parts.filter(isGap);
    const hechos = g.filter(x => P().uoe["c" + i + ":" + x.g]).length;
    textos.append(el("button", {
      class: "btn " + (i === clozeIdx ? "" : "ghost") + " small", type: "button",
      onclick: () => { clozeIdx = i; uoeSel = "cloze"; paso = 0; renderUoe(); },
    }, "Texto " + (i + 1),
      el("span", { class: "chip" + (hechos === g.length ? " ok" : ""), style: "margin-left:6px" }, hechos + "/" + g.length)));
  });

  out.append(
    el("div", { class: "card" },
      el("span", { class: "eyebrow" }, "Qué vas a practicar"),
      lista),
    el("div", { class: "card", style: "margin-top:12px" },
      el("span", { class: "eyebrow" }, "Textos de open cloze"),
      el("p", { class: "tiny", style: "margin:4px 0 0" }, "Cada uno son doce huecos sobre el mismo párrafo."),
      textos));
}

/* ─────────────── piezas comunes ─────────────── */

/** Campo de respuesta con corrección: devuelve el input y una función de comprobar. */
function campo(id: string, aceptadas: string[], expl: string, cuerpo: HTMLElement,
  alResolver: () => void): { inp: HTMLInputElement; comprobar: () => void; hecho: boolean } {
  const rec = P().uoe[id];
  const inp = el("input", {
    type: "text", placeholder: "Tu respuesta…", value: rec ? rec.v : "",
    autocomplete: "off", spellcheck: "false", autocapitalize: "off",
  }) as HTMLInputElement;

  const pintarFb = (ok: boolean) => {
    inp.disabled = true;
    inp.classList.add(ok ? "ok" : "mal");
    const fb = el("div", { class: "explain", style: "margin-top:14px;text-align:left;" + (ok ? "border-left-color:var(--ok);background:var(--ok-soft)" : "border-left-color:var(--bad);background:var(--bad-soft)") },
      el("span", { class: "tag" }, ok ? "Correcto" : "La respuesta"),
      el("div", { class: "en", style: "margin-bottom:6px" }, aceptadas[0]),
      el("span", { html: expl }));
    cuerpo.append(fb);
    // Que se vea sin tener que buscarlo: el texto de arriba puede ser largo.
    setTimeout(() => fb.scrollIntoView({ block: "nearest" }), 30);
  };

  const comprobar = () => {
    if (inp.disabled) return;
    const v = norm(inp.value);
    const ok = aceptadas.some(a => norm(a) === v);
    P().uoe[id] = { v: inp.value, ok };
    save();
    bump("uoe", ok);
    pintarFb(ok);
    alResolver();
  };
  inp.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") comprobar(); });
  cuerpo.append(el("div", { style: "margin-top:14px;width:100%;max-width:420px" }, inp));
  if (rec) pintarFb(rec.ok);
  return { inp, comprobar, hecho: !!rec };
}

/* ─────────────── transformaciones ─────────────── */

function recorridoTrans(out: HTMLElement): void {
  const items = T().trans;
  const pasos = crearPasos(out, { alSalir: () => { paso = null; renderUoe(); } });

  const pintar = () => {
    pasos.limpiar();
    const i = paso as number;
    const t = items[i];
    pasos.progreso(i, items.length, (i + 1) + " / " + items.length);

    pasos.cuerpo.append(
      el("span", { class: "ses-modo" }, "Reescribe la frase"),
      el("div", { class: "en", style: "margin-top:12px;font-size:18px;max-width:44ch" }, t.s1),
      el("div", { class: "row", style: "justify-content:center;margin-top:10px" }, el("span", { class: "chip a" }, t.key)),
      el("div", { class: "en", style: "margin-top:10px;font-size:18px;max-width:44ch", html: esc(t.s2).replace(/_+/g, '<span class="hl">' + "&nbsp;".repeat(18) + "</span>") }));

    const c = campo("t:" + t.id, t.a, t.e, pasos.cuerpo, () => { pintar(); pasos.medir(); });
    ponerPie(pasos, i, items.length, c);
  };
  pintar();
}

/* ─────────────── word formation ─────────────── */

function recorridoWform(out: HTMLElement): void {
  const items = T().wform;
  const pasos = crearPasos(out, { alSalir: () => { paso = null; renderUoe(); } });

  const pintar = () => {
    pasos.limpiar();
    const i = paso as number;
    const w = items[i];
    pasos.progreso(i, items.length, (i + 1) + " / " + items.length);

    pasos.cuerpo.append(
      el("span", { class: "ses-modo" }, "Transforma la palabra"),
      el("div", { class: "row", style: "justify-content:center;margin-top:12px" }, el("span", { class: "chip a" }, w.root)),
      el("div", { class: "en", style: "margin-top:12px;font-size:18px;max-width:46ch", html: esc(w.s).replace(/_+/g, '<span class="hl">' + "&nbsp;".repeat(12) + "</span>") }));

    const c = campo("w:" + w.id, w.a, w.e, pasos.cuerpo, () => { pintar(); pasos.medir(); });
    ponerPie(pasos, i, items.length, c);
  };
  pintar();
}

function ponerPie(pasos: ReturnType<typeof crearPasos>, i: number, total: number,
  c: { comprobar: () => void; hecho: boolean }): void {
  pasos.pie.append(navPasos({
    atras: i > 0 ? () => { paso = i - 1; renderUoe(); } : null,
    siguiente: c.hecho
      ? () => { paso = i + 1 < total ? i + 1 : -1; renderUoe(); }
      : c.comprobar,
    textoSiguiente: c.hecho ? (i + 1 < total ? "Siguiente ›" : "Ver el resultado ›") : "Corregir",
  }));
  pasos.medir();
}

/* ─────────────── open cloze ─────────────── */

function recorridoCloze(out: HTMLElement): void {
  const texto = T().clozes[clozeIdx];
  const huecos = texto.parts.filter(isGap) as ClozeGap[];
  const pasos = crearPasos(out, { alSalir: () => { paso = null; renderUoe(); } });

  const pintar = () => {
    pasos.limpiar();
    const i = paso as number;
    const g = huecos[i];
    const id = "c" + clozeIdx + ":" + g.g;
    pasos.progreso(i, huecos.length, "hueco " + (i + 1) + " / " + huecos.length);

    // El texto entero, con el hueco actual marcado: sin el párrafo delante,
    // este ejercicio no mide nada.
    const parrafo = el("p", { class: "en cloze-texto" });
    texto.parts.forEach(raw => {
      if (!isGap(raw)) { parrafo.append(document.createTextNode(raw)); return; }
      const rec = P().uoe["c" + clozeIdx + ":" + raw.g];
      const actual = raw.g === g.g;
      parrafo.append(el("span", {
        class: "cloze-hueco" + (actual ? " ahora" : "") + (rec ? (rec.ok ? " ok" : " mal") : ""),
      }, rec ? rec.v : "(" + raw.g + ")"));
    });

    pasos.cuerpo.append(
      el("span", { class: "ses-modo" }, texto.title),
      parrafo);
    // Con doce huecos, el que toca puede quedar fuera de vista: se acerca solo.
    setTimeout(() => parrafo.querySelector(".cloze-hueco.ahora")?.scrollIntoView({ block: "center" }), 30);

    const c = campo(id, g.a, g.e, pasos.cuerpo, () => { pintar(); pasos.medir(); });
    ponerPie(pasos, i, huecos.length, c);
  };
  pintar();
}

/* ─────────────── resumen ─────────────── */

function resumen(out: HTMLElement): void {
  const s = series().find(x => x.id === uoeSel)!;
  const otra = series().find(x => x.id !== uoeSel && x.hechos < x.total) || series().find(x => x.id !== uoeSel)!;

  out.append(el("div", { class: "card", style: "max-width:560px;margin:0 auto;text-align:center" },
    el("span", { class: "eyebrow" }, s.nombre + " · terminado"),
    el("div", { class: "res-num" }, s.aciertos + " / " + s.hechos),
    el("p", { class: "small" },
      s.hechos && s.aciertos / s.hechos >= 0.8 ? "Ese nivel es de aprobado holgado."
        : s.hechos && s.aciertos / s.hechos >= 0.5 ? "Vas bien; las explicaciones de los fallos son lo que sube la nota."
          : "Repite la serie leyendo cada explicación: aquí se gana mucho."),
    el("div", { class: "row", style: "justify-content:center;margin-top:16px" },
      el("button", { class: "btn", type: "button", onclick: () => { paso = 0; renderUoe(); } }, "Repasar desde el principio"),
      el("button", { class: "btn ghost", type: "button", onclick: () => { uoeSel = otra.id; paso = 0; renderUoe(); } }, otra.nombre + " ›")),
    el("div", { class: "row", style: "justify-content:center;margin-top:8px" },
      el("button", { class: "btn ghost small", type: "button", onclick: () => { paso = null; renderUoe(); } }, "Elegir otra cosa"))));
}

/** Ya no hay pestañas: la primera pantalla es la lista. */
export function renderUoeTabs(): void { /* compatibilidad */ }
export function checkCloze(): void { /* el open cloze se corrige hueco a hueco */ }
