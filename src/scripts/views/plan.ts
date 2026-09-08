/**
 * Módulo 03 · el plan diario, paso a paso.
 *
 * Cada día son cuatro pasos numerados. Los que se resuelven aquí traen la
 * lección, las tarjetas o los ejercicios dentro; los que no, llevan con un
 * botón al sitio exacto (la tarea 3 de Writing, no «el módulo de Writing»).
 * Lo que respondas cuenta igual que si lo hicieras en su módulo.
 */

import { P, save } from "../state";
import { $, el, esc, norm, pct, toast } from "../dom";
import { T, days, unit, deckName } from "../track";
import { FOCUS_LABEL } from "../../data/schedule";
import { isGap } from "../../data/types";
import { challengeFor } from "../../data/challenges";
import {
  bump, isDayDone, setDayDone, daysDone, currentDay, openDay, setOpenDay, weekProgress,
  stepsOf, setStep, stepsDone, challengeState,
} from "../progress";
import { renderPanel } from "./panel";
import { setIntent } from "../intent";
import { go } from "../nav";
import type { Day, DayBlock, StepGoto } from "../../data/types";

const NUM: Record<number, string> = { 1: "un", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis" };

function irA(g: StepGoto): void {
  setIntent(g);
  go(g.module);
}

/* ─────────────── contenido embebido ─────────────── */

/** Cuántos drills toca hoy según el tipo de sesión. */
function cuantosDrills(day: Day): number {
  if (day.focus === "leccion") return 4;
  if (day.focus === "drills") return 6;
  return 2;
}

function leccion(day: Day): HTMLElement {
  const u = unit(day.unit);
  if (!u) return el("div", {});
  const rec = P().gram[u.id] || (P().gram[u.id] = {});
  const box = el("div", {});

  // Una unidad tiene diez drills; cada día se lleva unos pocos, y no los mismos.
  const cuantos = Math.min(cuantosDrills(day), u.dr.length);
  const desde = (day.n * 3) % u.dr.length;
  const indices: number[] = [];
  for (let k = 0; k < cuantos; k++) indices.push((desde + k) % u.dr.length);

  // Se repinta solo esta caja al contestar: el resto del día no se mueve.
  function pintar(): void {
    const acertados = u!.dr.filter((_d, i) => rec[i] === true).length;
    box.innerHTML = "";
    box.append(
      el("div", { class: "row", style: "justify-content:space-between;margin-bottom:8px" },
        el("span", { class: "chip a" }, "Unidad " + u!.n + " · " + u!.lvl),
        el("span", { class: "chip" + (acertados === u!.dr.length ? " ok" : "") }, acertados + "/" + u!.dr.length + " drills de la unidad")),
      el("h4", { style: "font-family:var(--f-display);font-size:19px;margin-bottom:6px" }, u!.t),
      el("p", { class: "small", html: u!.rule }),
      el("div", { class: "explain", style: "margin-top:10px" },
        el("span", { class: "tag" }, "La trampa del hispanohablante"),
        el("span", { html: u!.trap })));

    box.append(el("p", { class: "tiny", style: "margin-top:12px" },
      cuantos === 1 ? "Un drill de esta unidad, el de hoy." : "Los " + NUM[cuantos] + " drills que tocan hoy de esta unidad."));

    indices.forEach((i, k) => {
      const d = u!.dr[i];
      const answered = rec[i] !== undefined;
      const picked = rec["p" + i];
      box.append(el("div", { class: "sheet", "data-state": answered ? (rec[i] ? "ok" : "bad") : "", style: "margin-top:10px" },
        el("div", { class: "margin" },
          el("span", { class: "qn" }, String(k + 1)),
          el("span", { class: "glyph" }, answered ? (rec[i] ? "✓" : "✗") : "")),
        el("div", { class: "body" },
          el("div", { class: "qtext", html: esc(d.q).replace(/___/g, '<span class="hl">______</span>') }),
          el("div", { class: "opts" }, d.o.map((o, j) => el("button", {
            class: "opt", type: "button",
            "data-pick": picked === j ? "1" : null,
            "data-res": answered ? (j === d.a ? "ok" : (picked === j ? "bad" : null)) : null,
            disabled: answered ? "" : null,
            onclick: () => {
              rec["p" + i] = j; rec[i] = j === d.a; save();
              bump("gram", j === d.a);
              pintar();
            },
          }, el("span", { class: "k" }, "ABCD"[j]), el("span", {}, o)))),
          answered ? el("div", { class: "explain" }, el("span", { class: "tag" }, "Por qué"), el("span", { html: d.e })) : null)));
    });

    box.append(el("div", { class: "row", style: "margin-top:12px" },
      el("button", { class: "btn ghost small", type: "button", onclick: () => { indices.forEach(i => { delete rec[i]; delete rec["p" + i]; }); save(); pintar(); } }, "Repetir los de hoy"),
      el("button", { class: "btn ghost small", type: "button", onclick: () => irA({ module: "gram", unit: u!.id }) }, "Ver la unidad completa →")));
  }

  pintar();
  return box;
}

function vocabulario(day: Day): HTMLElement {
  const deck = T().decks.find(d => d.id === day.deck);
  if (!deck || !day.deckCount) return el("div", {});
  const slice: number[] = [];
  for (let i = 0; i < day.deckCount; i++) slice.push((day.deckFrom + i) % deck.cards.length);

  let shown = false;
  const list = el("div", { style: "margin-top:10px" });
  function paint(): void {
    list.innerHTML = "";
    slice.forEach(i => {
      const [term, ipa, es, ex] = deck!.cards[i];
      list.append(el("div", { style: "padding:9px 0;border-bottom:1px solid var(--line)" },
        el("div", { class: "row", style: "justify-content:space-between;gap:12px;align-items:baseline" },
          el("span", { class: "en", style: "font-size:17px" }, term),
          ipa ? el("span", { class: "mono tiny" }, ipa) : null),
        shown ? el("div", { class: "small", style: "margin-top:3px" }, es) : null,
        shown && ex ? el("div", { style: "font-family:var(--f-display);font-style:italic;font-size:15px;color:var(--ink-2);margin-top:3px" }, "“" + ex + "”") : null));
    });
  }
  paint();

  return el("div", {},
    el("div", { class: "row", style: "justify-content:space-between;margin-bottom:4px" },
      el("span", { class: "chip a" }, deckName(day.deck)),
      el("span", { class: "chip" }, day.deckCount + " tarjetas")),
    el("p", { class: "tiny" }, "Léelas en voz alta y di el significado antes de revelarlo."),
    list,
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", { class: "btn small", type: "button", onclick: () => { shown = !shown; paint(); } }, "Mostrar / ocultar significados"),
      el("button", { class: "btn ghost small", type: "button", onclick: () => irA({ module: "vocab", deck: day.deck }) }, "Estudiarlas con repetición espaciada →")));
}

function respuesta(id: string, aceptadas: string[], expl: string): HTMLElement {
  const wrap = el("div", {});
  const rec = P().uoe[id];
  const inp = el("input", { type: "text", placeholder: "Tu respuesta…", value: rec ? rec.v : "", autocomplete: "off", spellcheck: "false" });
  const fb = el("div", {});
  function paint(ok: boolean): void {
    fb.innerHTML = "";
    fb.append(el("div", {
      class: "explain",
      style: ok ? "border-left-color:var(--ok);background:var(--ok-soft)" : "border-left-color:var(--bad);background:var(--bad-soft)",
    },
      el("span", { class: "tag" }, ok ? "Correcto" : "Respuesta"),
      el("div", { class: "en", style: "margin-bottom:6px" }, aceptadas[0]),
      el("span", { html: expl })));
  }
  function check(): void {
    const v = norm(inp.value);
    const ok = aceptadas.some(a => norm(a) === v);
    P().uoe[id] = { v: inp.value, ok };
    save(); bump("uoe", ok);
    paint(ok);
  }
  inp.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") check(); });
  wrap.append(el("div", { class: "row", style: "align-items:stretch" },
    el("span", { style: "flex:1;min-width:200px" }, inp),
    el("button", { class: "btn small", type: "button", onclick: check }, "Corregir")), fb);
  if (rec) paint(rec.ok);
  return wrap;
}

function ejercicios(day: Day): HTMLElement {
  const t = T();
  const set = day.uoe || "trans";
  const cuantos = day.focus === "leccion" ? 4 : 6;
  const box = el("div", {});
  const titulo = set === "trans" ? "Transformaciones" : set === "wform" ? "Formación de palabras" : "Open cloze";
  box.append(el("div", { class: "row", style: "justify-content:space-between;margin-bottom:8px" },
    el("span", { class: "chip a" }, titulo),
    el("span", { class: "chip" }, cuantos + " ítems")));

  if (set === "trans") {
    const pool = t.trans;
    for (let k = 0; k < Math.min(cuantos, pool.length); k++) {
      const it = pool[(day.n * 3 + k) % pool.length];
      const rec = P().uoe["t:" + it.id];
      box.append(el("div", { class: "sheet", "data-state": rec ? (rec.ok ? "ok" : "bad") : "", style: "margin-top:10px" },
        el("div", { class: "margin" }, el("span", { class: "qn" }, String(k + 1)), el("span", { class: "glyph" }, rec ? (rec.ok ? "✓" : "✗") : "")),
        el("div", { class: "body" },
          el("div", { class: "en", style: "margin-bottom:8px" }, it.s1),
          el("div", { class: "row", style: "margin-bottom:8px" }, el("span", { class: "chip a" }, it.key)),
          el("div", { class: "en", style: "margin-bottom:10px", html: esc(it.s2).replace(/_+/g, '<span class="hl">' + "&nbsp;".repeat(22) + "</span>") }),
          respuesta("t:" + it.id, it.a, it.e))));
    }
  } else if (set === "wform") {
    const pool = t.wform;
    for (let k = 0; k < Math.min(cuantos, pool.length); k++) {
      const it = pool[(day.n * 3 + k) % pool.length];
      const rec = P().uoe["w:" + it.id];
      box.append(el("div", { class: "sheet", "data-state": rec ? (rec.ok ? "ok" : "bad") : "", style: "margin-top:10px" },
        el("div", { class: "margin" }, el("span", { class: "qn" }, String(k + 1)), el("span", { class: "glyph" }, rec ? (rec.ok ? "✓" : "✗") : "")),
        el("div", { class: "body" },
          el("div", { class: "row", style: "justify-content:space-between;gap:10px;margin-bottom:10px" },
            el("span", { class: "en", style: "flex:1", html: esc(it.s).replace(/_+/g, '<span class="hl">' + "&nbsp;".repeat(14) + "</span>") }),
            el("span", { class: "chip a" }, it.root)),
          respuesta("w:" + it.id, it.a, it.e))));
    }
  } else {
    const ci = day.n % t.clozes.length;
    const cloze = t.clozes[ci];
    const gaps = cloze.parts.filter(isGap);
    const start = (day.n * 3) % Math.max(1, gaps.length);
    for (let k = 0; k < Math.min(cuantos, gaps.length); k++) {
      const g = gaps[(start + k) % gaps.length];
      const idx = cloze.parts.indexOf(g);
      const antes = cloze.parts.slice(Math.max(0, idx - 1), idx).filter(p => typeof p === "string").join("");
      const despues = cloze.parts.slice(idx + 1, idx + 2).filter(p => typeof p === "string").join("");
      const key = "c" + ci + ":" + g.g;
      const rec = P().uoe[key];
      box.append(el("div", { class: "sheet", "data-state": rec ? (rec.ok ? "ok" : "bad") : "", style: "margin-top:10px" },
        el("div", { class: "margin" }, el("span", { class: "qn" }, String(g.g)), el("span", { class: "glyph" }, rec ? (rec.ok ? "✓" : "✗") : "")),
        el("div", { class: "body" },
          el("div", { class: "en", style: "margin-bottom:10px" },
            "…" + antes.slice(-90).trim() + " ",
            el("span", { class: "hl" }, " ".repeat(10)),
            " " + despues.slice(0, 90).trim() + "…"),
          respuesta(key, g.a, g.e))));
    }
  }

  box.append(el("div", { class: "row", style: "margin-top:12px" },
    el("button", { class: "btn ghost small", type: "button", onclick: () => irA({ module: "uoe", set }) }, "Abrir el módulo completo →")));
  return box;
}

/* ─────────────── los pasos ─────────────── */

interface PasoUI { node: HTMLElement; refrescar: () => void }

/**
 * Un paso. Marcarlo no repinta la pantalla entera: se actualiza en sitio, así
 * no se pierde lo que tuvieras abierto ni la posición del scroll.
 */
function paso(day: Day, b: DayBlock, i: number, total: number, alMarcar: () => void): PasoUI {
  const estado = () => {
    const done = !!stepsOf(day.n)[i];
    return { done, abierto: !done && stepsDone(day.n, total) === i };
  };
  let { done, abierto } = estado();
  // Si el usuario abre o cierra el paso a mano, mandamos nosotros y no el orden.
  let manual: boolean | null = null;

  const cuerpo = el("div", { style: "margin-top:12px" });
  if (b.inline === "leccion") cuerpo.append(leccion(day));
  else if (b.inline === "vocab") cuerpo.append(vocabulario(day));
  else if (b.inline === "uoe") cuerpo.append(ejercicios(day));
  else if (b.goto) {
    cuerpo.append(el("button", { class: "btn", type: "button", onclick: () => irA(b.goto!) },
      b.goto.label || "Abrir el módulo →"));
  }

  const caret = el("span", { class: "caret", title: "Abrir o cerrar este paso", "aria-hidden": "true" }, "▾");
  const circulo = el("span", { class: "stepn" }, "");
  const chk = el("input", { type: "checkbox" }) as HTMLInputElement;
  const card = el("div", { class: "card stepcard" });

  // Abierto solo el paso en curso: los terminados se pliegan y los siguientes esperan.
  function visible(): boolean {
    return manual === null ? abierto : manual;
  }
  function pintar(): void {
    ({ done, abierto } = estado());
    cuerpo.style.display = visible() ? "" : "none";
    caret.textContent = visible() ? "▾" : "▸";
    circulo.textContent = done ? "✓" : String(i + 1);
    circulo.setAttribute("data-state", done ? "done" : abierto ? "now" : "");
    card.setAttribute("data-state", done ? "done" : abierto ? "now" : "");
    chk.checked = done;
  }

  chk.addEventListener("change", () => {
    setStep(day.n, i, chk.checked);
    // Al terminar el último paso el día se cierra solo: no hay que marcar nada más.
    if (stepsDone(day.n, total) === total && !isDayDone(day.n)) {
      setDayDone(day.n, true);
      toast("Día " + day.n + " completado");
    }
    manual = null;
    alMarcar();
  });

  const cab = el("div", { class: "row", style: "gap:12px;align-items:flex-start;cursor:pointer" });
  cab.addEventListener("click", ev => {
    if ((ev.target as HTMLElement).closest("input,button,a,select,textarea,label")) return;
    manual = !visible();
    pintar();
  });
  cab.append(
    circulo,
    el("div", { style: "flex:1;min-width:0" },
      el("div", { class: "row", style: "gap:8px;align-items:baseline" },
        el("span", { style: "font-weight:600;font-size:15px" }, b.name),
        el("span", { class: "mono tiny" }, b.min + " min")),
      el("div", { class: "small", style: "margin-top:2px" }, b.what)),
    caret,
    el("label", { class: "row", style: "gap:6px;flex:0 0 auto;cursor:pointer" },
      chk, el("span", { class: "tiny" }, "hecho")));

  card.append(cab, cuerpo);
  pintar();
  return { node: card, refrescar: pintar };
}

/* ─────────────── reto del día ─────────────── */

function reto(day: Day): HTMLElement {
  const c = challengeFor(day.n);
  const st = challengeState(c);
  const p = Math.min(100, Math.round((st.have / st.goal) * 100));
  return el("div", { class: "card", style: "margin-top:12px" + (st.done ? ";border-color:var(--ok)" : "") },
    el("div", { class: "row", style: "justify-content:space-between" },
      el("span", { class: "eyebrow" }, "Reto de hoy"),
      el("span", { class: "chip" + (st.done ? " ok" : " warn") }, st.done ? "Conseguido" : st.have + " / " + st.goal)),
    el("h3", { style: "margin:6px 0 4px;font-size:20px" }, c.t),
    el("p", { class: "small" }, c.d),
    el("div", { class: "bar", style: "margin-top:10px" }, el("i", { style: "width:" + p + "%" + (st.done ? ";background:var(--ok)" : "") })),
    c.goto && !st.done
      ? el("div", { class: "row", style: "margin-top:12px" },
          el("button", { class: "btn ghost small", type: "button", onclick: () => irA(c.goto!) }, c.goto.label || "Ir"))
      : null);
}

/* ─────────────── la pantalla ─────────────── */

function cabecera(day: Day, total: number, refrescar: () => void): HTMLElement {
  const done = isDayDone(day.n);
  const hechos = stepsDone(day.n, day.blocks.length);
  const p = Math.round((hechos / day.blocks.length) * 100);
  return el("div", { class: "card" },
    el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
      el("div", { class: "row", style: "gap:6px" },
        el("span", { class: "chip a" }, "Día " + day.n + " de " + total),
        el("span", { class: "chip" }, "Semana " + day.week),
        el("span", { class: "chip warn" }, FOCUS_LABEL[day.focus])),
      el("div", { class: "row" },
        el("button", { class: "btn ghost small", type: "button", disabled: day.n <= 1 ? "" : null, onclick: () => { setOpenDay(day.n - 1); render(); } }, "‹ Anterior"),
        el("button", { class: "btn ghost small", type: "button", disabled: day.n >= total ? "" : null, onclick: () => { setOpenDay(day.n + 1); render(); } }, "Siguiente ›"))),
    el("h2", { class: "h-sec", style: "margin:12px 0 6px;font-size:26px" }, day.t),
    el("p", { class: "small" }, day.goal),
    el("div", { class: "row", style: "margin-top:12px;gap:10px" },
      el("span", { class: "bar", style: "flex:1" }, el("i", { style: "width:" + p + "%" + (done ? ";background:var(--ok)" : "") })),
      el("span", { class: "mono tiny" }, hechos + "/" + day.blocks.length + " pasos")),
    el("div", { class: "explain", style: "margin-top:14px" },
      el("span", { class: "tag" }, "Producción de hoy"),
      el("span", {}, day.task)),
    el("div", { class: "row", style: "margin-top:14px" },
      el("button", {
        class: "btn" + (done ? " ghost" : ""), type: "button",
        onclick: () => {
          setDayDone(day.n, !done);
          if (!done && day.n < total) { setOpenDay(day.n + 1); render(); }
          else refrescar();
          renderPanel();
          toast(done ? "Día desmarcado" : "Día " + day.n + " completado");
        },
      }, done ? "✓ Hecho · desmarcar" : "Dar el día por terminado")));
}

function calendario(total: number): HTMLElement {
  const all = days();
  const hoy = openDay();
  const wrap = el("div", { class: "card", style: "margin-top:12px" },
    el("span", { class: "eyebrow" }, "Las 24 semanas"),
    el("p", { class: "tiny", style: "margin:4px 0 10px" }, "Pulsa cualquier día para abrirlo. Verde: hecho. Amarillo: donde estás."));
  const grid = el("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px" });
  for (let w = 1; w <= 24; w++) {
    const wp = weekProgress(w);
    const fila = el("div", { style: "border:1px solid var(--line);border-radius:var(--rs);padding:8px 9px;background:var(--surface)" },
      el("div", { class: "row", style: "justify-content:space-between;margin-bottom:6px" },
        el("span", { class: "mono tiny" }, "SEM " + String(w).padStart(2, "0")),
        el("span", { class: "mono tiny", style: wp.pct === 100 ? "color:var(--ok)" : "" }, wp.d + "/" + wp.t)));
    const row = el("div", { class: "row", style: "gap:4px" });
    all.filter(d => d.week === w).forEach(d => {
      const done = isDayDone(d.n);
      // El tamaño lo pone .dcell en el CSS: con el dedo crece a 44 px y con
      // ratón se queda pequeño, que es donde caben las 24 semanas de un vistazo.
      row.append(el("button", {
        type: "button", class: "dcell", title: "Día " + d.n + " · " + d.t,
        style: "border:1px solid " + (d.n === hoy ? "var(--mark)" : done ? "var(--ok)" : "var(--line-2)") + ";" +
          "background:" + (done ? "var(--ok-soft)" : d.n === hoy ? "var(--mark)" : "var(--surface)") + ";" +
          "color:" + (done ? "var(--ok)" : d.n === hoy ? "var(--mark-ink)" : "var(--ink-3)"),
        onclick: () => { setOpenDay(d.n); render(); window.scrollTo({ top: 0, behavior: "smooth" }); },
      }, String(d.n)));
    });
    fila.append(row);
    grid.append(fila);
  }
  wrap.append(grid);
  return wrap;
}

export function renderPlan(): void { render(); }

function render(): void {
  const out = $("#planOut");
  if (!out) return;
  const all = days();
  const n = openDay();
  const day = all[n - 1] || all[0];

  out.innerHTML = "";
  const cabHost = el("div", {});
  const retoHost = el("div", {});
  out.append(cabHost, retoHost);
  out.append(el("h3", { class: "h-sec", style: "margin:22px 0 2px;font-size:20px" }, "Los " + NUM[day.blocks.length] + " pasos de hoy"));
  out.append(el("p", { class: "tiny", style: "margin-bottom:6px" }, "Van en orden. Marca cada uno al terminarlo y el día se cierra solo. Pulsa la cabecera de cualquier paso para abrirlo o cerrarlo."));

  const pasos: PasoUI[] = [];
  function refrescar(): void {
    pasos.forEach(p => p.refrescar());
    cabHost.innerHTML = "";
    cabHost.append(cabecera(day, all.length, refrescar));
    retoHost.innerHTML = "";
    retoHost.append(reto(day));
    marcadores();
    renderPanel();
  }
  day.blocks.forEach((b, i) => {
    const ui = paso(day, b, i, day.blocks.length, refrescar);
    pasos.push(ui);
    out.append(ui.node);
  });
  out.append(calendario(all.length));

  cabHost.append(cabecera(day, all.length, refrescar));
  retoHost.append(reto(day));
  marcadores();
}

/** Los dos rótulos de la cabecera del módulo. */
function marcadores(): void {
  const hecho = daysDone();
  const chip = $("#planPct");
  if (chip) chip.textContent = `${hecho.d} de ${hecho.t} días · ${pct(hecho.d, hecho.t)}%`;
  const hoy = $("#planHoy");
  if (hoy) hoy.textContent = "Vas por el día " + currentDay();
}

$("#planToday")?.addEventListener("click", () => { setOpenDay(currentDay()); render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
