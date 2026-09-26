/**
 * Módulo · Vocabulario.
 *
 * Tres pantallas, nunca las tres a la vez: **elegir** qué estudiar, la **tanda**
 * (una tarjeta por pantalla, sin scroll) y el **resumen**. En el móvil eso es la
 * diferencia entre estudiar y perderse: cada pantalla hace una sola pregunta y
 * se avanza con el pulgar, sin buscar nada arriba.
 *
 * Cinco maneras de estudiar la misma palabra, porque reconocerla no es saberla:
 *
 *   reconocer  inglés → cuatro significados        (la más fácil: se empieza aquí)
 *   inverso    significado → cuatro palabras       (ya cuesta más)
 *   contexto   la frase con un hueco               (es como cae en el examen)
 *   escribir   significado → escribirla, con pistas escalonadas
 *   oírla      la escuchas y la escribes           (solo si el navegador habla)
 *
 * Las pistas son el corazón del asunto: en vez de rendirse y ver la respuesta,
 * se pide una ayuda —la inicial, el hueco en su frase, la transcripción— y se
 * sigue intentando. Acertar con pistas cuenta, pero la tarjeta no sube de caja:
 * volverá pronto, que es exactamente lo que hace falta.
 */

import { P, save } from "../state";
import { $, el } from "../dom";
import { T } from "../track";
import { BOX_DAYS, dueCards, gradeCard } from "../progress";
import { takeIntent } from "../intent";
import { anadirCarta, tiene } from "../mine";
import { go } from "../nav";
import { hablar, hayVoz } from "../voice";
import { ajustarAlto, pantallaCompleta } from "../pasos";
import { DECK_CATS } from "../../data/types";
import type { Card, Deck } from "../../data/types";

export let deckSel = "b1";
let catSel: string | null = null;

/* ─────────────── modos ─────────────── */

type Modo = "reconocer" | "inverso" | "contexto" | "escribir" | "oirla" | "mixto";

const MODOS: Array<[Modo, string, string]> = [
  ["mixto", "Sesión mixta", "Va cambiando de forma de preguntar. Es la que más se parece a saberla de verdad."],
  ["reconocer", "Reconocer", "Ves la palabra y eliges su significado entre cuatro."],
  ["inverso", "Del español al inglés", "Ves el significado y eliges la palabra. Cuesta más que reconocer."],
  ["contexto", "En contexto", "La frase con un hueco. Así es como cae en el examen."],
  ["escribir", "Escribirla", "Sin opciones: la escribes tú, con pistas si te atascas."],
  ["oirla", "Oírla y escribirla", "La escuchas y la escribes. Entra por el oído y sale por la mano."],
];

/** Los que pueden salir en una sesión mixta, de menos a más difícil. */
const RUEDA: Array<Exclude<Modo, "mixto">> = ["reconocer", "contexto", "inverso", "escribir"];

const TANDA = 10;

interface Turno {
  i: number;            // índice de la tarjeta en el mazo
  modo: Exclude<Modo, "mixto">;
}

interface Sesion {
  deck: string;
  modo: Modo;
  turnos: Turno[];
  pos: number;
  aciertos: number;
  fallos: number;
  conPista: number;
  /** Palabras que fueron al cuaderno en esta tanda. */
  alCuaderno: string[];
  /** Ya respondida la actual: guarda si acertó, para pintar el resultado. */
  resuelto: null | { ok: boolean; conPista: boolean };
  pistas: number;
}

let sesion: Sesion | null = null;

/* ─────────────── datos ─────────────── */

function mazo(id = deckSel): Deck {
  return T().decks.find(d => d.id === id) || T().decks[0];
}

function catDe(d: Deck): string {
  return d.cat || "comunes";
}

function barajar<X>(a: X[]): X[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tres distractores que se parezcan lo justo.
 *
 * Del mismo mazo, y si puede ser de longitud parecida: unas opciones absurdas
 * se aciertan sin saber la palabra, y entonces la pregunta no mide nada.
 */
function distractores(d: Deck, i: number, campo: 0 | 2): string[] {
  const bueno = d.cards[i][campo];
  const otros = d.cards
    .map((c, j) => ({ v: c[campo], j }))
    .filter(x => x.j !== i && x.v && x.v !== bueno);
  const cerca = otros
    .map(x => ({ ...x, d: Math.abs(x.v.length - bueno.length) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 12);
  return barajar(cerca.length >= 3 ? cerca : otros).slice(0, 3).map(x => x.v);
}

/* ─────────────── pantalla 1 · elegir ─────────────── */

export function renderVocab(): void {
  const intent = takeIntent("vocab");
  if (intent?.deck && T().decks.some(d => d.id === intent.deck)) { deckSel = intent.deck; catSel = null; sesion = null; }
  if (!T().decks.some(d => d.id === deckSel)) deckSel = T().decks[0].id;

  const host = $("#vocabApp");
  if (!host) return;
  host.innerHTML = "";
  // Durante la tanda, la presentación del módulo estorba: la pantalla es para
  // la pregunta. Se esconde con una clase y vuelve al salir.
  // En el móvil el menú ocupa media pantalla: durante la tanda se quita entero
  // y la pregunta se queda con todo el alto. Para salir está el botón «Salir».
  pantallaCompleta(!!sesion && sesion.pos < sesion.turnos.length, "vocab");
  if (sesion) { pintarSesion(host); return; }
  pintarElegir(host);
}

function pintarElegir(host: HTMLElement): void {
  const d = mazo();
  const due = dueCards(d.id);

  /* familias */
  const cats = el("div", { class: "row", style: "margin-top:4px" });
  const presentes = DECK_CATS.filter(([id]) => T().decks.some(x => catDe(x) === id));
  cats.append(el("button", {
    class: "btn " + (catSel === null ? "" : "ghost") + " small", type: "button",
    onclick: () => { catSel = null; renderVocab(); },
  }, "Todas", el("span", { class: "chip", style: "margin-left:6px" }, String(T().decks.length))));
  presentes.forEach(([id, nombre]) => {
    const mazos = T().decks.filter(x => catDe(x) === id);
    const pend = mazos.reduce((n, x) => n + dueCards(x.id).length, 0);
    cats.append(el("button", {
      class: "btn " + (catSel === id ? "" : "ghost") + " small", type: "button",
      onclick: () => {
        catSel = id;
        if (catDe(mazo()) !== id) deckSel = mazos[0].id;
        renderVocab();
      },
    }, nombre, el("span", { class: "chip" + (pend ? " warn" : ""), style: "margin-left:6px" },
      pend ? String(pend) : String(mazos.length))));
  });

  /* mazos de la familia elegida */
  const mazos = el("div", { class: "listilla" });
  (catSel ? T().decks.filter(x => catDe(x) === catSel) : T().decks).forEach(x => {
    const n = dueCards(x.id).length;
    mazos.append(el("button", {
      class: "fila" + (x.id === deckSel ? " on" : ""), type: "button",
      "aria-pressed": String(x.id === deckSel),
      onclick: () => { deckSel = x.id; renderVocab(); },
    },
      el("span", { class: "fila-t" }, x.name),
      el("span", { class: "fila-n" }, String(x.cards.length) + " palabras"),
      el("span", { class: "chip" + (n ? " warn" : " ok") }, n ? n + " hoy" : "al día")));
  });

  /* modos */
  const modos = el("div", { class: "listilla", style: "margin-top:4px" });
  MODOS.forEach(([id, nombre, ayuda]) => {
    if (id === "oirla" && !hayVoz()) return;
    modos.append(el("button", {
      class: "fila", type: "button",
      onclick: () => empezar(id),
    },
      el("span", { class: "fila-t" }, nombre),
      el("span", { class: "fila-n" }, ayuda),
      el("span", { class: "fila-ir" }, "→")));
  });

  host.append(
    el("div", { class: "card" },
      el("span", { class: "eyebrow" }, "1 · Qué familia"),
      cats),
    el("div", { class: "card", style: "margin-top:12px" },
      el("span", { class: "eyebrow" }, "2 · Qué mazo"),
      mazos,
      el("div", { class: "cajitas" }, ...cajitas(d))),
    el("div", { class: "card", style: "margin-top:12px" },
      el("span", { class: "eyebrow" }, "3 · Cómo lo estudias"),
      el("p", { class: "tiny", style: "margin:4px 0 10px" },
        due.length
          ? "Tandas de " + TANDA + " tarjetas. Hoy tocan " + due.length + " en «" + d.name + "»."
          : "«" + d.name + "» está al día. Puedes repasarlo igual: no cuenta para las cajas."),
      modos),
    el("div", { class: "row", style: "margin-top:12px;justify-content:center" },
      el("button", { class: "btn ghost small", type: "button", onclick: () => go("mine") }, "Mis palabras difíciles →")));
}

function cajitas(d: Deck): HTMLElement[] {
  const boxes = [1, 2, 3, 4, 5].map(b => d.cards.filter((_c, i) => ((P().srs[d.id + ":" + i] || { b: 1 }).b) === b).length);
  return ["Hoy", "1", "2", "3", "4", "5"].map((lbl, i) =>
    el("div", { class: "cajita" + (i === 0 ? " hoy" : "") },
      el("span", { class: "cajita-v" }, String(i === 0 ? dueCards(d.id).length : boxes[i - 1])),
      el("span", { class: "cajita-l" }, i === 0 ? "hoy" : "caja " + lbl),
      el("span", { class: "cajita-d" }, i === 0 ? "pendientes" : BOX_DAYS[i] ? BOX_DAYS[i] + " d" : "nueva")));
}

/* ─────────────── armar la tanda ─────────────── */

function empezar(modo: Modo): void {
  const d = mazo();
  const due = dueCards(d.id);
  // Sin nada vencido se repasa igualmente, pero eligiendo al azar y sin tocar cajas.
  const base = due.length ? due : barajar(d.cards.map((_c, i) => i)).slice(0, TANDA);
  const elegidas = barajar(base).slice(0, TANDA);

  sesion = {
    deck: d.id, modo, pos: 0, aciertos: 0, fallos: 0, conPista: 0,
    alCuaderno: [], resuelto: null, pistas: 0,
    turnos: elegidas.map((i, n) => ({ i, modo: modoDe(modo, n, d, i) })),
  };
  renderVocab();
}

/** En mixto va rotando; en los demás, siempre el mismo (con red de seguridad). */
function modoDe(modo: Modo, n: number, d: Deck, i: number): Exclude<Modo, "mixto"> {
  let m: Exclude<Modo, "mixto"> = modo === "mixto" ? RUEDA[n % RUEDA.length] : modo;
  // El modo contexto necesita que la palabra aparezca en su frase de ejemplo.
  if (m === "contexto" && !hueco(d.cards[i])) m = "reconocer";
  if (m === "oirla" && !hayVoz()) m = "escribir";
  return m;
}

/** La frase de ejemplo con la palabra tapada, o null si no se puede tapar. */
function hueco(c: Card): { texto: string; palabra: string } | null {
  const [term, , , ex] = c;
  if (!ex) return null;
  const raiz = term.split(" ")[0];
  if (raiz.length < 3) return null;
  const re = new RegExp("\\b" + raiz.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w*", "i");
  if (!re.test(ex)) return null;
  return { texto: ex.replace(re, "______"), palabra: term };
}

/* ─────────────── pantalla 2 · la tanda ─────────────── */

function pintarSesion(host: HTMLElement): void {
  const s = sesion!;
  const d = mazo(s.deck);
  if (s.pos >= s.turnos.length) { pintarResumen(host); return; }

  const turno = s.turnos[s.pos];
  const c = d.cards[turno.i] as Card;

  const cab = el("div", { class: "ses-cab" },
    el("button", { class: "btn ghost small", type: "button", onclick: () => { sesion = null; renderVocab(); } }, "‹ Salir"),
    el("div", { class: "ses-barra" }, el("i", { style: "width:" + Math.round(s.pos / s.turnos.length * 100) + "%" })),
    el("span", { class: "mono tiny" }, (s.pos + 1) + " / " + s.turnos.length));

  const cuerpo = el("div", { class: "ses-cuerpo" });
  const pie = el("div", { class: "ses-pie" });

  pregunta(d, turno, c, cuerpo, pie);

  const caja = el("div", { class: "sesion" }, cab, cuerpo, pie);
  host.append(caja);
  ajustarAlto(caja);
}

function siguiente(): void {
  const s = sesion!;
  s.pos++;
  s.resuelto = null;
  s.pistas = 0;
  renderVocab();
}

/** Apunta el resultado, califica la caja y deja el pie listo para seguir. */
function resolver(d: Deck, turno: Turno, c: Card, ok: boolean, pie: HTMLElement, extra?: HTMLElement | null): void {
  const s = sesion!;
  if (s.resuelto) return;
  const conPista = s.pistas > 0;
  s.resuelto = { ok, conPista };
  if (ok) { s.aciertos++; if (conPista) s.conPista++; } else s.fallos++;

  // Con pista no sube de caja: se la vuelve a encontrar pronto, que es el objetivo.
  if (dueCards(d.id).includes(turno.i) || !conPista) gradeCard(d.id, turno.i, ok && !conPista);

  if (!ok && !tiene(c[0])) { anadirCarta(c, d.name); s.alCuaderno.push(c[0]); }
  save();

  pie.innerHTML = "";
  // Ojo: append() del DOM escribe "null" si le pasas null (a diferencia de el()).
  if (extra) pie.append(extra);
  pie.append(
    el("div", { class: "fb " + (ok ? "" : "err"), style: "text-align:left" },
      el("div", { style: "font-weight:600" }, ok ? (conPista ? "Bien, con ayuda" : "Correcto") : "Era: " + c[0]),
      el("div", { class: "small", style: "margin-top:4px" }, c[0] + " · " + c[2] + (c[1] ? "  " + c[1] : "")),
      c[3] ? el("div", { class: "tiny", style: "margin-top:6px;font-style:italic" }, "“" + c[3] + "”") : null,
      !ok ? el("div", { class: "tiny", style: "margin-top:6px" }, "Va a tu cuaderno de difíciles.") : null),
    el("div", { class: "row", style: "margin-top:10px" },
      hayVoz() ? el("button", { class: "btn ghost", type: "button", onclick: () => hablar(c[0], { rate: 0.9 }) }, "♪ Oírla") : null,
      el("button", { class: "btn crece", type: "button", onclick: siguiente }, "Siguiente →")));
  (pie.querySelector(".crece") as HTMLElement | null)?.focus();
}

/* ─────────────── las cinco preguntas ─────────────── */

function pregunta(d: Deck, turno: Turno, c: Card, cuerpo: HTMLElement, pie: HTMLElement): void {
  const [term, ipa, es] = c;
  const rec = P().srs[d.id + ":" + turno.i] || { b: 1 };
  const etiqueta = (t: string) => el("span", { class: "ses-modo" }, t, el("span", { class: "chip" }, "caja " + rec.b));

  if (turno.modo === "reconocer" || turno.modo === "inverso") {
    const alReves = turno.modo === "inverso";
    const campo: 0 | 2 = alReves ? 0 : 2;
    const correcta = c[campo];
    const opciones = barajar([correcta, ...distractores(d, turno.i, campo)]);
    cuerpo.append(
      etiqueta(alReves ? "¿Cómo se dice?" : "¿Qué significa?"),
      el("div", { class: "ses-term" }, alReves ? es : term),
      !alReves && ipa ? el("div", { class: "ipa" }, ipa) : null,
      !alReves && hayVoz()
        ? el("button", { class: "btn ghost small", style: "margin-top:10px", type: "button", onclick: () => hablar(term, { rate: 0.9 }) }, "♪ Oírla")
        : null);
    const caja = el("div", { class: "opciones" });
    opciones.forEach(o => {
      caja.append(el("button", {
        class: "opt", type: "button",
        onclick: () => {
          if (sesion!.resuelto) return;
          const ok = o === correcta;
          caja.querySelectorAll(".opt").forEach(b => {
            const t = (b.textContent || "").trim();
            if (t === correcta) b.classList.add("ok");
            else if (t === o) b.classList.add("mal");
            (b as HTMLButtonElement).disabled = true;
          });
          resolver(d, turno, c, ok, pie);
        },
      }, o));
    });
    cuerpo.append(caja);
    return;
  }

  if (turno.modo === "contexto") {
    const h = hueco(c)!;
    const opciones = barajar([term, ...distractores(d, turno.i, 0)]);
    cuerpo.append(
      etiqueta("Completa la frase"),
      el("div", { class: "ses-frase" }, h.texto),
      el("div", { class: "tiny", style: "margin-top:8px" }, es));
    const caja = el("div", { class: "opciones" });
    opciones.forEach(o => {
      caja.append(el("button", {
        class: "opt", type: "button",
        onclick: () => {
          if (sesion!.resuelto) return;
          const ok = o === term;
          caja.querySelectorAll(".opt").forEach(b => {
            const t = (b.textContent || "").trim();
            if (t === term) b.classList.add("ok");
            else if (t === o) b.classList.add("mal");
            (b as HTMLButtonElement).disabled = true;
          });
          resolver(d, turno, c, ok, pie);
        },
      }, o));
    });
    cuerpo.append(caja);
    return;
  }

  /* escribir / oírla: entrada libre con pistas escalonadas */
  const deOido = turno.modo === "oirla";
  if (deOido) hablar(term, { rate: 0.85 });

  const inp = el("input", {
    type: "text", id: "vocIn", placeholder: "escríbela en inglés",
    autocomplete: "off", autocapitalize: "off", spellcheck: "false",
  }) as HTMLInputElement;
  const zonaPista = el("div", { class: "pistas" });

  cuerpo.append(
    etiqueta(deOido ? "Escucha y escríbela" : "¿Cómo se escribe?"),
    deOido
      ? el("button", { class: "btn ghost", style: "margin-top:6px", type: "button", onclick: () => hablar(term, { rate: 0.8 }) }, "♪ Repetir")
      : el("div", { class: "ses-term chico" }, es),
    el("div", { style: "margin-top:14px" }, inp),
    zonaPista);

  const comprobar = () => {
    if (sesion!.resuelto) return;
    const dado = inp.value.trim().toLowerCase().replace(/\s+/g, " ");
    const ok = dado === term.toLowerCase() || dado === term.toLowerCase().replace(/^to /, "");
    inp.disabled = true;
    inp.classList.add(ok ? "ok" : "mal");
    resolver(d, turno, c, ok, pie);
  };
  inp.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") comprobar(); });

  const PISTAS = pistasDe(c, deOido);
  const btnPista = el("button", {
    class: "btn ghost", type: "button",
    onclick: () => {
      const s = sesion!;
      if (s.pistas >= PISTAS.length) return;
      zonaPista.append(el("div", { class: "pista" }, PISTAS[s.pistas]));
      s.pistas++;
      if (s.pistas >= PISTAS.length) (btnPista as HTMLButtonElement).disabled = true;
      btnPista.textContent = s.pistas >= PISTAS.length ? "No hay más pistas" : "Otra pista (" + (PISTAS.length - s.pistas) + ")";
      inp.focus();
    },
  }, "Pista (" + PISTAS.length + ")");

  pie.append(el("div", { class: "row" },
    btnPista,
    el("button", { class: "btn crece", type: "button", onclick: comprobar }, "Comprobar")));
  setTimeout(() => inp.focus(), 60);
}

/**
 * Las pistas, de la más barata a la más cara.
 *
 * Van en este orden a propósito: primero la forma de la palabra, luego dónde
 * vive, y solo al final los sonidos. Cada una obliga a pensar un poco más antes
 * de rendirse; ninguna la regala entera.
 */
function pistasDe(c: Card, deOido: boolean): string[] {
  const [term, ipa, es, ex] = c;
  const out: string[] = [];
  const forma = term.replace(/[a-zá-úñ]/gi, "_");
  out.push("Empieza por «" + term[0].toUpperCase() + "» y tiene esta forma:  " + term[0] + forma.slice(1));
  if (deOido) out.push("Significa: " + es);
  const h = hueco(c);
  if (h) out.push("Va en esta frase:  " + h.texto);
  else if (ex) out.push("Aparece en:  " + ex);
  if (term.length > 4) out.push("Las tres primeras letras:  " + term.slice(0, 3) + "…");
  if (ipa && !deOido) out.push("Suena así:  " + ipa);
  return out;
}

/* ─────────────── pantalla 3 · resumen ─────────────── */

function pintarResumen(host: HTMLElement): void {
  const s = sesion!;
  const d = mazo(s.deck);
  const total = s.turnos.length;
  const pct = Math.round(s.aciertos / total * 100);

  host.append(el("div", { class: "card", style: "max-width:560px;margin:0 auto;text-align:center" },
    el("span", { class: "eyebrow" }, "Tanda terminada"),
    el("div", { class: "res-num" }, s.aciertos + " / " + total),
    el("p", { class: "small" },
      pct >= 90 ? "Casi perfecto. Sube de mazo o cambia a un modo más difícil."
        : pct >= 60 ? "Bien. Las que fallaste vuelven pronto."
          : "Toca insistir: repite esta misma tanda antes de seguir."),
    s.conPista ? el("p", { class: "tiny", style: "margin-top:8px" },
      s.conPista + " con pista: esas no suben de caja y vuelven antes.") : null,
    s.alCuaderno.length
      ? el("div", { class: "fb", style: "margin-top:12px;text-align:left" },
          el("div", { style: "font-weight:600" }, "Al cuaderno de difíciles"),
          el("div", { class: "small", style: "margin-top:4px" }, s.alCuaderno.join(", ")))
      : null,
    el("div", { class: "row", style: "justify-content:center;margin-top:16px" },
      el("button", { class: "btn", type: "button", onclick: () => empezar(s.modo) }, "Otra tanda"),
      el("button", { class: "btn ghost", type: "button", onclick: () => { sesion = null; renderVocab(); } }, "Cambiar mazo o modo")),
    s.alCuaderno.length
      ? el("div", { class: "row", style: "justify-content:center;margin-top:8px" },
          el("button", { class: "btn ghost small", type: "button", onclick: () => { sesion = null; go("mine"); } }, "Practicar las difíciles →"))
      : null,
    el("p", { class: "tiny", style: "margin-top:12px" },
      "Quedan " + dueCards(d.id).length + " tarjetas hoy en «" + d.name + "».")));
}
