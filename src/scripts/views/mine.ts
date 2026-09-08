/**
 * Módulo · Mis palabras.
 *
 * El cuaderno de lo que se te atraganta. Aquí no se reconoce: se escribe.
 * Fallar una la manda a la caja 1 y vuelve en esta misma sesión.
 */

import { P, save } from "./../state";
import { $, el, esc, toast } from "../dom";
import { T } from "../track";
import {
  palabras, anadir, quitar, pendientes, calificar, porCaja, masFalladas,
  modoDe, huecoDe, acierta, casi, CAJAS,
} from "../mine";
import { bump, tally } from "../progress";
import { hablar, hayVoz } from "../voice";
import { renderPanel } from "./panel";
import type { MyWord } from "../../data/types";

let actual: MyWord | null = null;
let revelada = false;

export function renderMine(): void {
  const out = $("#mineOut");
  if (!out) return;
  out.innerHTML = "";

  out.append(alta());
  out.append(cajas());
  out.append(practica());
  out.append(lista());
}

/* ─────────────── añadir ─────────────── */

function alta(): HTMLElement {
  const en = el("input", { type: "text", placeholder: "La palabra o expresión en inglés", autocomplete: "off", spellcheck: "false" }) as HTMLInputElement;
  const es = el("input", { type: "text", placeholder: "Qué significa, en español", autocomplete: "off" }) as HTMLInputElement;
  const ex = el("input", { type: "text", placeholder: "Una frase con ella (opcional, pero ayuda mucho)", autocomplete: "off", spellcheck: "false" }) as HTMLInputElement;

  function guardar(): void {
    if (!en.value.trim() || !es.value.trim()) { toast("Hacen falta la palabra y su significado"); return; }
    anadir(en.value, es.value, ex.value, "a mano");
    en.value = ""; es.value = ""; ex.value = "";
    en.focus();
    toast("Añadida. Vuelve a preguntártela hoy mismo.");
    renderMine();
    renderPanel();
  }
  [en, es, ex].forEach(i => i.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") guardar(); }));

  return el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Añadir"),
    el("h3", { style: "margin-top:4px" }, "Una palabra que se te resiste"),
    el("p", { class: "tiny", style: "margin:4px 0 10px" },
      "Apúntala en cuanto la falles, venga de donde venga. Si pones un ejemplo, además de escribirla te la pedirá dentro de la frase."),
    el("div", { class: "grid g3" }, en, es, ex),
    el("div", { class: "row", style: "margin-top:10px" },
      el("button", { class: "btn", type: "button", onclick: guardar }, "Añadir al cuaderno"),
      el("span", { class: "tiny" }, palabras().length + " palabras en el cuaderno")));
}

/* ─────────────── cajas ─────────────── */

function cajas(): HTMLElement {
  const c = porCaja();
  const due = pendientes().length;
  const box = el("div", { class: "card", style: "margin-top:12px" },
    el("div", { class: "row", style: "justify-content:space-between" },
      el("span", { class: "eyebrow" }, "Repetición espaciada"),
      el("span", { class: "chip" + (due ? " warn" : " ok") }, due ? due + " para ahora" : "al día")),
    el("p", { class: "tiny", style: "margin:4px 0 10px" },
      "Cada acierto sube una caja; un fallo la devuelve a la primera y vuelve a salir en esta misma sesión."));
  const fila = el("div", { class: "grid gt" });
  c.forEach((n, i) => fila.append(el("div", { class: "tile" },
    el("span", { class: "l" }, "Caja " + (i + 1)),
    el("span", { class: "v" }, String(n)),
    el("span", { class: "tiny" }, CAJAS[i + 1] === 0 ? "vuelve hoy" : "vuelve en " + CAJAS[i + 1] + (CAJAS[i + 1] === 1 ? " día" : " días")))));
  box.append(fila);
  return box;
}

/* ─────────────── practicar ─────────────── */

function practica(): HTMLElement {
  const box = el("div", { class: "card", style: "margin-top:12px" });
  const cola = pendientes();

  if (!palabras().length) {
    box.append(
      el("span", { class: "eyebrow" }, "Practicar"),
      el("h3", { style: "margin-top:4px" }, "El cuaderno está vacío"),
      el("p", { class: "small", style: "margin-top:6px" },
        "Añade la primera arriba, o pulsa «Al cuaderno» en cualquier tarjeta de vocabulario que falles."));
    return box;
  }
  if (!cola.length) {
    box.append(
      el("span", { class: "eyebrow" }, "Practicar"),
      el("h3", { style: "margin-top:4px" }, "Nada pendiente ahora mismo"),
      el("p", { class: "small", style: "margin-top:6px" },
        "Todas están esperando su turno. Vuelve mañana o repasa una al azar."),
      el("div", { class: "row", style: "margin-top:12px" },
        el("button", {
          class: "btn ghost small", type: "button",
          onclick: () => { actual = palabras()[Math.floor(Math.random() * palabras().length)]; revelada = false; renderMine(); },
        }, "Repasar una al azar")));
    return box;
  }

  if (!actual || !palabras().includes(actual)) actual = cola[0];
  const w = actual;
  const modo = modoDe(w);
  const hueco = modo === "hueco" ? huecoDe(w) : null;

  const inp = el("input", {
    type: "text", placeholder: "Escríbela en inglés…", autocomplete: "off",
    spellcheck: "false", autocapitalize: "none",
  }) as HTMLInputElement;
  const fb = el("div", { style: "margin-top:12px" });

  function corregir(): void {
    if (revelada) return;
    const ok = acierta(w, inp.value);
    const cerca = !ok && casi(w, inp.value);
    revelada = true;
    calificar(w, ok);
    bump("mine", ok);
    tally("mine");
    inp.disabled = true;

    fb.innerHTML = "";
    fb.append(el("div", {
      class: "explain",
      style: ok
        ? "border-left-color:var(--ok);background:var(--ok-soft)"
        : "border-left-color:var(--bad);background:var(--bad-soft)",
    },
      el("span", { class: "tag" }, ok ? "Correcto" : cerca ? "Casi" : "No era esa"),
      el("div", { class: "en", style: "font-size:19px;margin-bottom:6px" }, w.en),
      el("div", { class: "small" }, w.es),
      w.ex ? el("div", { style: "font-family:var(--f-display);font-style:italic;margin-top:6px" }, "“" + w.ex + "”") : null,
      el("div", { class: "tiny", style: "margin-top:8px" },
        ok
          ? "Sube a la caja " + w.box + ": vuelve " + (CAJAS[w.box] === 0 ? "hoy" : "en " + CAJAS[w.box] + (CAJAS[w.box] === 1 ? " día" : " días")) + "."
          : cerca
            ? "Te faltó una letra. Vuelve a la caja 1 y te la pregunto otra vez en esta sesión."
            : "A la caja 1. Te la pregunto otra vez antes de terminar hoy.")));
    fb.append(el("div", { class: "row", style: "margin-top:12px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => { actual = null; revelada = false; renderMine(); renderPanel(); },
      }, "Siguiente"),
      hayVoz()
        ? el("button", {
            class: "btn ghost small", type: "button",
            onclick: () => hablar(w.ex || w.en, { rate: 0.85 }),
          }, "♪ Oírla")
        : null,
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { quitar(w.id); actual = null; revelada = false; toast("Fuera del cuaderno"); renderMine(); },
      }, "Ya me la sé: quitarla")));
    (fb.querySelector("button") as HTMLElement)?.focus();
  }

  inp.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") corregir(); });

  box.append(
    el("div", { class: "row", style: "justify-content:space-between" },
      el("span", { class: "eyebrow" }, "Practicar · quedan " + cola.length),
      el("span", { class: "chip" + (w.fails >= 3 ? " bad" : "") },
        "caja " + w.box + (w.fails ? " · fallada " + w.fails + (w.fails === 1 ? " vez" : " veces") : ""))),
    hueco
      ? el("div", { style: "margin-top:10px" },
          el("p", { class: "tiny" }, "Completa la frase. Escribe la forma que pida el hueco."),
          el("div", { class: "en", style: "font-size:19px;line-height:1.6;margin-top:6px" }, hueco),
          el("div", { class: "small", style: "margin-top:8px;color:var(--ink-3)" }, w.es))
      : el("div", { style: "margin-top:10px" },
          el("p", { class: "tiny" }, "¿Cómo se dice en inglés? Escríbela, no vale reconocerla."),
          el("div", { style: "font-family:var(--f-display);font-size:24px;margin-top:6px" }, w.es)),
    el("div", { class: "row", style: "margin-top:12px;align-items:stretch" },
      el("span", { style: "flex:1;min-width:200px" }, inp),
      el("button", { class: "btn", type: "button", onclick: corregir }, "Corregir"),
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { calificar(w, false); actual = null; revelada = false; renderMine(); },
      }, "No me acuerdo")),
    fb);
  setTimeout(() => inp.focus(), 0);
  return box;
}

/* ─────────────── lista ─────────────── */

function lista(): HTMLElement {
  const todas = palabras();
  const box = el("div", { class: "card", style: "margin-top:12px" },
    el("div", { class: "row", style: "justify-content:space-between" },
      el("span", { class: "eyebrow" }, "El cuaderno"),
      todas.length
        ? el("button", {
            class: "btn ghost small", type: "button",
            onclick: () => {
              if (!confirm("¿Vaciar el cuaderno entero? Las palabras de los mazos no se tocan.")) return;
              P().mine = []; save(); actual = null; renderMine();
            },
          }, "Vaciar")
        : null));

  if (!todas.length) {
    box.append(el("p", { class: "small", style: "margin-top:8px" }, "Aún no hay nada aquí."));
    return box;
  }

  const duras = masFalladas(3);
  if (duras.length) {
    box.append(el("p", { class: "tiny", style: "margin:6px 0 10px" },
      "Las que más se te resisten: " + duras.map(w => w.en + " (" + w.fails + ")").join(" · ")));
  }

  const tabla = el("div", { style: "margin-top:6px" });
  todas.slice(0, 200).forEach(w => {
    tabla.append(el("div", { class: "row", style: "gap:10px;padding:8px 0;border-bottom:1px solid var(--line);align-items:flex-start" },
      el("div", { style: "flex:1;min-width:0" },
        el("div", { class: "row", style: "gap:8px;align-items:baseline" },
          el("span", { class: "en", style: "font-size:16px" }, w.en),
          el("span", { class: "chip" + (w.box >= 4 ? " ok" : w.fails >= 3 ? " bad" : "") }, "caja " + w.box)),
        el("div", { class: "tiny", style: "margin-top:2px" }, w.es + (w.from ? " · de " + w.from : ""))),
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { actual = w; revelada = false; renderMine(); window.scrollTo({ top: 0, behavior: "smooth" }); },
      }, "Preguntar"),
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { quitar(w.id); if (actual === w) actual = null; renderMine(); },
      }, "Quitar")));
  });
  box.append(tabla);
  if (todas.length > 200) box.append(el("p", { class: "tiny", style: "margin-top:8px" }, "…y " + (todas.length - 200) + " más."));
  return box;
}

/** Botón «Al cuaderno» reutilizable desde Vocabulario. */
export function botonAlCuaderno(en: string, es: string, ex: string, from: string): HTMLElement {
  return el("button", {
    class: "btn ghost small", type: "button",
    onclick: () => { anadir(en, es, ex, from); toast("«" + en + "» va al cuaderno"); },
  }, "Al cuaderno");
}
