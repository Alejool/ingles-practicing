/**
 * Módulo · Prueba rápida.
 *
 * Diez preguntas mezcladas, contra el reloj y con corrección al instante.
 * No sustituye al simulacro: sirve para calentar en cinco minutos o para
 * comprobar si una tarde de estudio ha dejado poso.
 */

import { P, save } from "../state";
import { $, el, esc, norm, pct, fmt, toast } from "../dom";
import { T, asegurarLecturas, hayLecturas } from "../track";
import { bump, tally } from "../progress";
import { anadir } from "../mine";
import { renderPanel } from "./panel";
import type { QuizRun } from "../../data/types";

type Area = "gram" | "vocab" | "uoe" | "read";

interface Pregunta {
  area: Area;
  etiqueta: string;
  enunciado: string;
  pista?: string;
  /** Opciones si es de elegir; vacío si es de escribir. */
  opts?: string[];
  /** Índice correcto cuando hay opciones. */
  idx?: number;
  /** Respuestas válidas cuando se escribe. */
  acepta?: string[];
  expl: string;
  /** Para poder mandarla al cuaderno cuando se falla una de vocabulario. */
  palabra?: [string, string, string];
}

const AREAS: Array<[Area, string]> = [
  ["gram", "Gramática"], ["vocab", "Vocabulario"], ["uoe", "Use of English"], ["read", "Lectura"],
];

let seleccion: Area[] = ["gram", "vocab", "uoe"];
let largo = 10;
let preguntas: Pregunta[] = [];
let respuestas: Array<{ ok: boolean; dada: string } | null> = [];
let i = 0;
let empezado = 0;
let reloj: number | null = null;
let segundos = 0;

/* ─────────────── armar la prueba ─────────────── */

function baraja<T>(a: T[]): T[] {
  const c = a.slice();
  for (let k = c.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [c[k], c[j]] = [c[j], c[k]];
  }
  return c;
}

function deGramatica(): Pregunta[] {
  const out: Pregunta[] = [];
  T().grammar.forEach(u => u.dr.forEach(d => out.push({
    area: "gram",
    etiqueta: "Unidad " + u.n + " · " + u.t,
    enunciado: d.q,
    opts: d.o,
    idx: d.a,
    expl: d.e,
  })));
  return out;
}

function deVocabulario(): Pregunta[] {
  const out: Pregunta[] = [];
  const mazos = T().decks;
  const todas = mazos.flatMap(m => m.cards.map(c => [m.name, c] as const));
  todas.forEach(([mazo, c]) => {
    const distractores = baraja(todas.filter(x => x[1][0] !== c[0])).slice(0, 3).map(x => x[1][0]);
    if (distractores.length < 3) return;
    const opts = baraja([c[0], ...distractores]);
    out.push({
      area: "vocab",
      etiqueta: mazo,
      enunciado: "¿Cómo se dice «" + c[2] + "»?",
      opts,
      idx: opts.indexOf(c[0]),
      expl: c[3] ? "<i>" + esc(c[3]) + "</i>" : "«" + esc(c[2]) + "» → <b>" + esc(c[0]) + "</b>.",
      palabra: [c[0], c[2], c[3]],
    });
  });
  return out;
}

function deUoe(): Pregunta[] {
  const t = T();
  const out: Pregunta[] = [];
  t.trans.forEach(it => out.push({
    area: "uoe",
    etiqueta: "Transformación",
    enunciado: it.s1,
    pista: it.key + " → " + it.s2,
    acepta: it.a,
    expl: it.e,
  }));
  t.wform.forEach(it => out.push({
    area: "uoe",
    etiqueta: "Formación de palabras",
    enunciado: it.s,
    pista: "Raíz: " + it.root,
    acepta: it.a,
    expl: it.e,
  }));
  return out;
}

function deLectura(): Pregunta[] {
  const out: Pregunta[] = [];
  T().readings.forEach(tx => tx.qs.forEach(q => out.push({
    area: "read",
    etiqueta: "Lectura · " + tx.title,
    enunciado: q.q,
    pista: "Del texto «" + tx.title + "».",
    opts: q.o,
    idx: q.a,
    expl: q.e,
  })));
  return out;
}

function armar(): Pregunta[] {
  const fuentes: Record<Area, () => Pregunta[]> = {
    gram: deGramatica, vocab: deVocabulario, uoe: deUoe, read: deLectura,
  };
  const activas = seleccion.length ? seleccion : (["gram"] as Area[]);
  const porArea = Math.max(1, Math.round(largo / activas.length));
  let bolsa: Pregunta[] = [];
  activas.forEach(a => { bolsa = bolsa.concat(baraja(fuentes[a]()).slice(0, porArea + 2)); });
  return baraja(bolsa).slice(0, largo);
}

/* ─────────────── cronómetro ─────────────── */

function arrancarReloj(): void {
  pararReloj();
  segundos = 0;
  reloj = window.setInterval(() => {
    segundos++;
    const t = $("#quizTimer");
    if (t) t.textContent = fmt(segundos);
  }, 1000);
}
function pararReloj(): void {
  if (reloj) { clearInterval(reloj); reloj = null; }
}

/* ─────────────── pantallas ─────────────── */

export function renderQuiz(): void {
  const out = $("#quizOut");
  if (!out) return;
  out.innerHTML = "";
  if (!preguntas.length) out.append(portada());
  else if (i < preguntas.length) out.append(pantallaPregunta());
  else out.append(resultado());
}

function portada(): HTMLElement {
  const box = el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Prueba rápida"),
    el("h2", { class: "h-sec", style: "margin:4px 0 6px;font-size:26px" }, "Cinco minutos, diez preguntas"),
    el("p", { class: "small" },
      "Se arman con tu contenido de la ruta activa y cambian cada vez. Corrección al instante, con la explicación " +
      "debajo. Lo que falles en vocabulario puedes mandarlo al cuaderno de un clic."));

  const chips = el("div", { class: "row", style: "margin-top:12px" });
  AREAS.forEach(([id, nombre]) => {
    const on = seleccion.includes(id);
    chips.append(el("button", {
      class: "btn " + (on ? "" : "ghost") + " small", type: "button",
      onclick: () => {
        seleccion = on ? seleccion.filter(x => x !== id) : [...seleccion, id];
        if (!seleccion.length) seleccion = [id];
        renderQuiz();
      },
    }, nombre));
  });

  const largos = el("div", { class: "row", style: "margin-top:10px" });
  [5, 10, 20].forEach(n => largos.append(el("button", {
    class: "btn " + (largo === n ? "" : "ghost") + " small", type: "button",
    onclick: () => { largo = n; renderQuiz(); },
  }, n + " preguntas")));

  box.append(
    el("p", { class: "eyebrow", style: "margin-top:16px" }, "De qué"),
    chips,
    el("p", { class: "eyebrow", style: "margin-top:12px" }, "Cuántas"),
    largos,
    el("div", { class: "row", style: "margin-top:16px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => {
          // Si la mezcla lleva lectura y los textos aún no han bajado, se esperan.
          if (seleccion.includes("read") && !hayLecturas()) {
            toast("Trayendo los textos…");
            asegurarLecturas().then(renderQuiz).catch(() => {
              seleccion = seleccion.filter(a => a !== "read");
              toast("Sin los textos: la prueba va sin preguntas de lectura");
              renderQuiz();
            });
            return;
          }
          preguntas = armar();
          if (!preguntas.length) { toast("No hay material para esa selección"); return; }
          respuestas = preguntas.map(() => null);
          i = 0;
          empezado = Date.now();
          arrancarReloj();
          renderQuiz();
        },
      }, "Empezar")));

  const h = P().quiz?.history || [];
  if (h.length) {
    const tabla = el("div", { style: "margin-top:8px" });
    h.slice(-6).reverse().forEach(r => tabla.append(
      el("div", { class: "row", style: "justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)" },
        el("span", { class: "tiny" }, new Date(r.at).toLocaleDateString("es") + " · " + r.areas.join(", ")),
        el("span", { class: "chip" + (r.right / r.total >= 0.8 ? " ok" : r.right / r.total >= 0.6 ? " warn" : " bad") },
          r.right + "/" + r.total + " · " + fmt(r.secs)))));
    return el("div", {}, box, el("div", { class: "card", style: "margin-top:12px" },
      el("span", { class: "eyebrow" }, "Tus últimas pruebas"),
      el("p", { class: "tiny", style: "margin:4px 0 4px" },
        "Mejor marca: " + (P().quiz.best ?? 0) + "% de aciertos."),
      tabla));
  }
  return box;
}

function pantallaPregunta(): HTMLElement {
  const q = preguntas[i];
  const ya = respuestas[i];
  const box = el("div", { class: "card" });

  box.append(el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
    el("div", { class: "row", style: "gap:6px" },
      el("span", { class: "chip a" }, i + 1 + " de " + preguntas.length),
      el("span", { class: "chip" }, q.etiqueta)),
    el("div", { class: "row", style: "gap:8px" },
      el("span", { class: "timer", id: "quizTimer" }, fmt(segundos)),
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { pararReloj(); preguntas = []; renderQuiz(); },
      }, "Dejarlo"))));

  box.append(el("span", { class: "bar", style: "margin-top:12px;display:block" },
    el("i", { style: "width:" + Math.round((i / preguntas.length) * 100) + "%" })));

  box.append(el("div", {
    class: "qtext", style: "margin-top:14px;font-size:19px",
    html: esc(q.enunciado).replace(/_{2,}|___/g, '<span class="hl">' + "&nbsp;".repeat(12) + "</span>"),
  }));
  if (q.pista) box.append(el("div", { class: "small", style: "margin-top:8px;color:var(--ink-3)" }, q.pista));

  const fb = el("div", { style: "margin-top:12px" });

  function resolver(ok: boolean, dada: string): void {
    respuestas[i] = { ok, dada };
    bump(q.area === "read" ? "read" : q.area, ok);
    tally("quiz");
    fb.innerHTML = "";
    fb.append(el("div", {
      class: "explain",
      style: ok ? "border-left-color:var(--ok);background:var(--ok-soft)" : "border-left-color:var(--bad);background:var(--bad-soft)",
    },
      el("span", { class: "tag" }, ok ? "Correcto" : "Respuesta"),
      el("div", { class: "en", style: "margin-bottom:6px" },
        q.opts && q.idx !== undefined ? q.opts[q.idx] : (q.acepta || [""])[0]),
      el("span", { html: q.expl })));
    const acciones = el("div", { class: "row", style: "margin-top:12px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => { i++; renderQuiz(); },
      }, i + 1 < preguntas.length ? "Siguiente" : "Ver el resultado"));
    if (!ok && q.palabra) {
      acciones.append(el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { anadir(q.palabra![0], q.palabra![1], q.palabra![2], "prueba rápida"); toast("Al cuaderno"); },
      }, "Mandar al cuaderno"));
    }
    fb.append(acciones);
    (acciones.querySelector("button") as HTMLElement)?.focus();
  }

  if (q.opts) {
    const opts = el("div", { class: "opts", style: "margin-top:14px" });
    q.opts.forEach((o, j) => opts.append(el("button", {
      class: "opt", type: "button",
      "data-res": ya ? (j === q.idx ? "ok" : (ya.dada === String(j) ? "bad" : null)) : null,
      disabled: ya ? "" : null,
      onclick: () => { resolver(j === q.idx, String(j)); renderOpts(); },
    }, el("span", { class: "k" }, "ABCD"[j]), el("span", {}, o))));
    box.append(opts);
    function renderOpts(): void {
      const r = respuestas[i]!;
      Array.from(opts.children).forEach((b, j) => {
        (b as HTMLButtonElement).disabled = true;
        b.setAttribute("data-res", j === q.idx ? "ok" : (r.dada === String(j) ? "bad" : ""));
      });
    }
  } else {
    const inp = el("input", { type: "text", placeholder: "Tu respuesta…", autocomplete: "off", spellcheck: "false" }) as HTMLInputElement;
    const comprobar = (): void => {
      if (respuestas[i]) return;
      const v = norm(inp.value);
      const ok = (q.acepta || []).some(a => norm(a) === v);
      inp.disabled = true;
      resolver(ok, inp.value);
    };
    inp.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") comprobar(); });
    box.append(el("div", { class: "row", style: "margin-top:14px;align-items:stretch" },
      el("span", { style: "flex:1;min-width:200px" }, inp),
      el("button", { class: "btn", type: "button", onclick: comprobar }, "Corregir")));
    setTimeout(() => inp.focus(), 0);
  }

  box.append(fb);
  return box;
}

function resultado(): HTMLElement {
  pararReloj();
  const right = respuestas.filter(r => r?.ok).length;
  const total = preguntas.length;
  const p = pct(right, total);
  const secs = Math.round((Date.now() - empezado) / 1000);

  const run: QuizRun = {
    at: Date.now(), right, total, secs,
    areas: [...new Set(preguntas.map(q => AREAS.find(a => a[0] === q.area)![1]))],
  };
  const q = P().quiz || (P().quiz = { best: null, history: [] });
  q.history.push(run);
  if (q.history.length > 40) q.history = q.history.slice(-40);
  if (q.best === null || p > q.best) q.best = p;
  save();
  renderPanel();

  const falladas = preguntas.filter((_x, k) => respuestas[k] && !respuestas[k]!.ok);
  const box = el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Resultado"),
    el("h2", { class: "h-sec", style: "margin:4px 0 8px;font-size:30px" }, right + " de " + total + " · " + p + "%"),
    el("p", { class: "small" },
      p >= 80 ? "Buen ritmo. Sube el número de preguntas o mete Use of English en la mezcla."
        : p >= 60 ? "Aprobado justo. Lo que fallaste es exactamente lo que toca repasar."
          : "Toca volver a las unidades de lo que fallaste antes de seguir avanzando en el plan."),
    el("div", { class: "row", style: "margin-top:8px" },
      el("span", { class: "chip" }, "Tiempo: " + fmt(secs)),
      el("span", { class: "chip" }, Math.round(secs / Math.max(1, total)) + " s por pregunta"),
      el("span", { class: "chip" }, "Mejor marca: " + (q.best ?? p) + "%")));

  if (falladas.length) {
    const lista = el("div", { style: "margin-top:8px" });
    falladas.forEach(f => lista.append(el("div", { style: "padding:8px 0;border-bottom:1px solid var(--line)" },
      el("div", { class: "row", style: "justify-content:space-between;gap:8px" },
        el("span", { class: "small", style: "flex:1" }, f.enunciado),
        el("span", { class: "chip bad" }, AREAS.find(a => a[0] === f.area)![1])),
      el("div", { class: "tiny", style: "margin-top:4px" },
        "Era: " + (f.opts && f.idx !== undefined ? f.opts[f.idx] : (f.acepta || [""])[0])))));
    box.append(el("h3", { class: "h-sec", style: "margin:18px 0 4px;font-size:18px" }, "Lo que se te escapó"), lista);
  }

  box.append(el("div", { class: "row", style: "margin-top:16px" },
    el("button", {
      class: "btn", type: "button",
      onclick: () => {
        preguntas = armar(); respuestas = preguntas.map(() => null); i = 0;
        empezado = Date.now(); arrancarReloj(); renderQuiz();
      },
    }, "Otra prueba"),
    el("button", { class: "btn ghost", type: "button", onclick: () => { preguntas = []; renderQuiz(); } }, "Cambiar la mezcla")));
  return box;
}
