/**
 * Módulo · Vocabulario.
 *
 * Los mazos van agrupados por tipo de palabra: comunes, verbos, adjetivos,
 * phrasal verbs, falsos amigos, compuestas, colocaciones, preposiciones,
 * formación de palabras y conectores. Fallar una tarjeta ofrece mandarla al
 * cuaderno de refuerzo, donde ya no se reconoce: se escribe.
 */

import { P } from "../state";
import { $, el, toast } from "../dom";
import { T } from "../track";
import { BOX_DAYS, dueCards, gradeCard } from "../progress";
import { takeIntent } from "../intent";
import { anadirCarta, tiene } from "../mine";
import { go } from "../nav";
import { hablar, hayVoz } from "../voice";
import { DECK_CATS } from "../../data/types";
import type { Card, Deck } from "../../data/types";

export let deckSel = "b1";
let fcIdx: number | null = null;
let fcFlipped = false;
let catSel: string | null = null;

function mazo(): Deck {
  return T().decks.find(d => d.id === deckSel)!;
}

export function renderVocab(): void {
  const intent = takeIntent("vocab");
  if (intent?.deck && T().decks.some(d => d.id === intent.deck)) { deckSel = intent.deck; fcIdx = null; catSel = null; }
  if (!T().decks.some(d => d.id === deckSel)) { deckSel = T().decks[0].id; fcIdx = null; }

  pintarCategorias();
  pintarMazos();
  pintarCajas();
  pintarTarjeta();
}

/* ─────────────── selector en dos niveles ─────────────── */

function catDe(d: Deck): string {
  return d.cat || "comunes";
}

function pintarCategorias(): void {
  const host = $("#deckCats");
  if (!host) return;
  host.innerHTML = "";
  const presentes = DECK_CATS.filter(([id]) => T().decks.some(d => catDe(d) === id));

  host.append(el("button", {
    class: "btn " + (catSel === null ? "" : "ghost") + " small", type: "button",
    onclick: () => { catSel = null; renderVocab(); },
  }, "Todos",
    el("span", { class: "chip", style: "margin-left:4px" }, String(T().decks.length))));

  presentes.forEach(([id, nombre]) => {
    const mazos = T().decks.filter(d => catDe(d) === id);
    const due = mazos.reduce((n, d) => n + dueCards(d.id).length, 0);
    host.append(el("button", {
      class: "btn " + (catSel === id ? "" : "ghost") + " small", type: "button",
      onclick: () => {
        catSel = id;
        if (catDe(mazo()) !== id) { deckSel = mazos[0].id; fcIdx = null; }
        renderVocab();
      },
    },
      el("span", {}, nombre),
      el("span", { class: "chip" + (due ? " warn" : ""), style: "margin-left:4px" }, due ? String(due) : String(mazos.length))));
  });
}

function pintarMazos(): void {
  const t = $("#deckTabs");
  if (!t) return;
  t.innerHTML = "";
  const visibles = catSel ? T().decks.filter(d => catDe(d) === catSel) : T().decks;
  visibles.forEach(d => {
    const due = dueCards(d.id).length;
    t.append(el("button", {
      class: "btn " + (d.id === deckSel ? "" : "ghost") + " small", type: "button",
      onclick: () => { deckSel = d.id; fcIdx = null; fcFlipped = false; renderVocab(); },
    },
      el("span", {}, d.name),
      el("span", { class: "chip" + (due ? " warn" : " ok"), style: "margin-left:4px" }, due ? due + " hoy" : "al día")));
  });
}

/* ─────────────── cajas ─────────────── */

function pintarCajas(): void {
  const d = mazo();
  const boxes = [1, 2, 3, 4, 5].map(b => d.cards.filter((_c, i) => ((P().srs[d.id + ":" + i] || { b: 1 }).b) === b).length);
  const bs = $("#boxStats");
  if (!bs) return;
  bs.innerHTML = "";
  ["Hoy", "Caja 1", "Caja 2", "Caja 3", "Caja 4", "Caja 5"].forEach((lbl, i) => {
    const v = i === 0 ? dueCards(d.id).length : boxes[i - 1];
    bs.append(el("div", { class: "tile" },
      el("span", { class: "l" }, lbl),
      el("span", { class: "v" }, String(v)),
      el("span", { class: "tiny" },
        i === 0 ? "pendientes" : (BOX_DAYS[i] ? "vuelve en " + BOX_DAYS[i] + " día" + (BOX_DAYS[i] > 1 ? "s" : "") : "nueva"))));
  });
}

/* ─────────────── la tarjeta ─────────────── */

function pintarTarjeta(): void {
  const area = $("#fcArea");
  if (!area) return;
  const d = mazo();
  area.innerHTML = "";

  const due = dueCards(d.id);
  if (!due.length) {
    area.append(el("div", { class: "card", style: "text-align:center" },
      el("h3", {}, "Mazo al día"),
      el("p", { class: "small", style: "margin-top:6px" },
        "No hay tarjetas vencidas en " + d.name + " (" + d.cards.length + " en total). Vuelve mañana o repasa otro mazo."),
      el("div", { class: "row", style: "justify-content:center;margin-top:12px" },
        el("button", {
          class: "btn ghost small", type: "button",
          onclick: () => { fcIdx = Math.floor(Math.random() * d.cards.length); fcFlipped = false; carta(d, fcIdx, true); },
        }, "Repasar una al azar"),
        el("button", { class: "btn ghost small", type: "button", onclick: () => go("mine") }, "Ir a mis palabras"))));
    return;
  }
  if (fcIdx === null || !due.includes(fcIdx)) fcIdx = due[0];
  carta(d, fcIdx, false);
}

function carta(d: Deck, i: number, extra: boolean): void {
  const area = $("#fcArea");
  area.innerHTML = "";
  const c = d.cards[i] as Card;
  const [term, ipa, es, ex] = c;
  const rec = P().srs[d.id + ":" + i] || { b: 1 };

  area.append(el("div", { class: "fc" },
    el("span", { class: "chip" }, d.name + " · caja " + rec.b),
    el("div", { class: "term" }, term),
    ipa ? el("div", { class: "ipa" }, ipa) : null,
    // Oírla antes de revelar el significado: la pronunciación entra con la palabra.
    hayVoz()
      ? el("div", { class: "row", style: "justify-content:center;margin-top:8px" },
          el("button", {
            class: "btn ghost small", type: "button",
            onclick: (ev: Event) => { ev.stopPropagation(); hablar(term, { rate: 0.9 }); },
          }, "♪ Oírla"),
          ex ? el("button", {
            class: "btn ghost small", type: "button",
            onclick: (ev: Event) => { ev.stopPropagation(); hablar(ex, { rate: 0.9 }); },
          }, "♪ La frase") : null)
      : null,
    fcFlipped
      ? el("div", { class: "back" },
          el("div", { class: "es" }, es),
          ex ? el("div", { class: "ex" }, "“" + ex + "”") : null)
      : el("p", { class: "tiny", style: "margin-top:14px" },
          "Di el significado en voz alta y una frase con la palabra. Luego revela.")));

  const row = el("div", { class: "row", style: "justify-content:center;margin-top:14px" });
  if (!fcFlipped) {
    row.append(el("button", { class: "btn", type: "button", onclick: () => { fcFlipped = true; carta(d, i, extra); } }, "Revelar"));
  } else {
    row.append(
      el("button", {
        class: "btn ghost", type: "button",
        onclick: () => {
          if (!extra) gradeCard(d.id, i, false);
          // Fallar es la señal más honesta de que esa palabra va al cuaderno.
          anadirCarta(c, d.name);
          toast("«" + term + "» va a tus palabras difíciles");
          fcFlipped = false; fcIdx = null; renderVocab();
        },
      }, "No la sabía"),
      el("button", {
        class: "btn", type: "button",
        onclick: () => { if (!extra) gradeCard(d.id, i, true); fcFlipped = false; fcIdx = null; renderVocab(); },
      }, "La sabía"));
  }
  row.append(el("button", {
    class: "btn ghost small", type: "button",
    onclick: () => {
      fcFlipped = false;
      const resto = dueCards(d.id).filter(x => x !== i);
      fcIdx = resto.length ? resto[0] : null;
      renderVocab();
    },
  }, "Saltar"));
  area.append(row);

  const yaEsta = !!tiene(term);
  area.append(el("div", { class: "row", style: "justify-content:center;margin-top:10px" },
    el("button", {
      class: "btn ghost small", type: "button", disabled: yaEsta ? "" : null,
      onclick: () => { anadirCarta(c, d.name); toast("Añadida al cuaderno"); renderVocab(); },
    }, yaEsta ? "Ya está en tu cuaderno" : "Al cuaderno de difíciles")));

  area.append(el("p", { class: "tiny", style: "text-align:center;margin-top:10px" },
    "Quedan " + dueCards(d.id).length + " tarjetas hoy en este mazo · " + d.cards.length + " en total."));
}

/** Compatibilidad con quien la importaba antes. */
export const showCard = carta;
