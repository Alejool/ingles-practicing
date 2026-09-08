/**
 * Módulo · Speaking.
 *
 * Hablas y el navegador transcribe solo. Al parar, dos capas de corrección: la
 * inmediata y sin coste (ritmo, muletillas, repeticiones, longitud) y la de la
 * IA, con nota por criterio de Cambridge. Si el navegador no tiene dictado, se
 * escribe la transcripción a mano y todo lo demás funciona igual.
 */

import { $, el, toast, fmt } from "../dom";
import { touchDay } from "../state";
import { T } from "../track";
import { ask, aiNote } from "../ai";
import { takeIntent } from "../intent";
import { marcarActividad, tally } from "../progress";
import { dictar, hayDictado, medir } from "../speech";
import type { Dictado } from "../speech";

export let spSel = "sp1";
let spTimer: number | null = null;
let spLeft = 0;
let consigna = 0;

let mic: Dictado | null = null;
let hablando = false;
let arrancado = 0;
let duracion = 0;

export function renderSpeak(): void {
  const out = $("#spOut");
  if (!out) return;

  const intent = takeIntent("speak");
  if (intent?.part && T().speaking.some(s => s.id === intent.part)) { pararTodo(); spSel = intent.part; }
  if (!T().speaking.some(s => s.id === spSel)) { pararTodo(); spSel = T().speaking[0].id; }

  const tabs = $("#spTabs");
  tabs.innerHTML = "";
  T().speaking.forEach(s => tabs.append(el("button", {
    class: "btn " + (s.id === spSel ? "" : "ghost") + " small", type: "button",
    onclick: () => { pararTodo(); spSel = s.id; consigna = 0; renderSpeak(); },
  }, el("span", {}, s.name), el("span", { class: "chip", style: "margin-left:4px" }, s.lvl))));

  const s = T().speaking.find(x => x.id === spSel)!;
  if (consigna >= s.prompts.length) consigna = 0;
  out.innerHTML = "";

  out.append(el("div", { class: "card" },
    el("h2", { class: "h-sec", style: "font-size:24px" }, s.name),
    el("p", { class: "small", style: "margin-top:8px" }, s.what),
    el("div", { class: "explain", style: "margin-top:12px" },
      el("span", { class: "tag" }, "Cómo puntuar alto"),
      el("ul", { style: "margin:0;padding-left:18px" }, s.tips.map(x => el("li", { style: "margin-bottom:4px", html: x }))))));

  /* La consigna de hoy, una sola, grande, para no dispersarse. */
  const consignaBox = el("div", { class: "card", style: "margin-top:12px" },
    el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
      el("span", { class: "eyebrow" }, "Consigna " + (consigna + 1) + " de " + s.prompts.length),
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { consigna = (consigna + 1) % s.prompts.length; renderSpeak(); },
      }, "Otra consigna")),
    el("p", { class: "en", style: "font-size:20px;line-height:1.5;margin-top:10px" }, s.prompts[consigna]),
    el("div", { class: "row", style: "margin-top:12px" },
      el("span", { class: "chip a" }, "Tienes " + fmt(s.time)),
      el("span", { class: "chip" }, "Habla sin parar aunque te trabes")));
  out.append(consignaBox);

  out.append(grabadora(s));

  out.append(el("div", { class: "card", style: "margin-top:12px" },
    el("span", { class: "eyebrow" }, "Lenguaje funcional"),
    el("p", { class: "tiny", style: "margin-top:4px" }, "Mete dos de estas en tu respuesta. Es lo que sube la nota de Discourse Management."),
    el("div", { class: "row", style: "margin-top:8px" },
      s.lang.map(x => el("span", { class: "chip a", style: "font-family:var(--f-display);font-size:14px;letter-spacing:0" }, x)))));
}

/* ─────────────── grabadora y corrección ─────────────── */

function grabadora(s: { id: string; name: string; lvl: string; time: number }): HTMLElement {
  const box = el("div", { class: "card", style: "margin-top:12px" });
  const soporta = hayDictado();

  const ta = el("textarea", {
    id: "spText",
    placeholder: soporta
      ? "Aquí va apareciendo lo que dices. También puedes escribirlo o corregirlo a mano."
      : "Tu navegador no tiene dictado. Escribe aquí lo que dijiste, tal cual, con las dudas y los titubeos.",
  }) as HTMLTextAreaElement;

  const timerEl = el("span", { class: "timer", id: "spTimer" }, fmt(s.time));
  const estado = el("span", { class: "tiny" }, soporta ? "Listo para grabar" : "Modo manual");
  const provisional = el("span", { class: "tiny", style: "color:var(--ink-3);font-style:italic" }, "");
  const instant = el("div", { style: "margin-top:12px" });
  const fb = el("div", { style: "margin-top:14px" });

  function medidas(): void {
    const txt = ta.value.trim();
    instant.innerHTML = "";
    if (!txt) return;
    const m = medir(txt, duracion || null);
    const fila = el("div", { class: "metricrow" });
    const datos: Array<[string, string, boolean]> = [
      [String(m.palabras), "palabras", m.palabras >= 60],
      [m.porMinuto ? String(m.porMinuto) : "—", "por minuto", m.porMinuto === null || (m.porMinuto >= 90 && m.porMinuto <= 170)],
      [m.riqueza + "%", "riqueza léxica", m.riqueza >= 45],
      [String(m.relleno), "muletillas", m.relleno <= 3],
    ];
    datos.forEach(([v, l, bien]) => fila.append(el("div", {
      class: "m", style: bien ? "" : "border-color:var(--warn)",
    }, el("b", { style: bien ? "" : "color:var(--warn)" }, v), el("span", {}, l))));
    instant.append(
      el("span", { class: "eyebrow" }, "Al instante · sin gastar cuota"),
      fila,
      el("p", { class: "tiny", style: "margin-top:8px" }, consejo(m)));
    if (m.repetidas.length) {
      instant.append(el("p", { class: "tiny", style: "margin-top:4px" },
        "Repites mucho: " + m.repetidas.map(([w, n]) => w + " (" + n + ")").join(", ") + ". Busca sinónimos para dos de ellas."));
    }
  }

  ta.addEventListener("input", () => { marcarActividad(); medidas(); });

  const btnGrabar = el("button", { class: "btn", type: "button" }, soporta ? "Empezar a hablar" : "Empezar el cronómetro");

  function arrancarCrono(): void {
    pararCrono();
    spLeft = s.time;
    arrancado = Date.now();
    timerEl.textContent = fmt(spLeft);
    timerEl.classList.remove("hot");
    spTimer = window.setInterval(() => {
      spLeft--;
      timerEl.textContent = fmt(Math.max(0, spLeft));
      marcarActividad();
      if (spLeft <= 10) timerEl.classList.add("hot");
      if (spLeft <= 0) { parar("Se acabó el tiempo. Mira la corrección."); }
    }, 1000);
  }

  function parar(msg?: string): void {
    pararCrono();
    duracion = arrancado ? Math.round((Date.now() - arrancado) / 1000) : 0;
    if (mic) { mic.parar(); mic = null; }
    hablando = false;
    provisional.textContent = "";
    btnGrabar.textContent = soporta ? "Empezar a hablar" : "Empezar el cronómetro";
    btnGrabar.classList.remove("ghost");
    estado.textContent = duracion ? "Grabado: " + fmt(duracion) : (soporta ? "Listo para grabar" : "Modo manual");
    if (ta.value.trim()) { touchDay(); tally("speaking"); }
    medidas();
    if (msg) toast(msg);
  }

  btnGrabar.addEventListener("click", () => {
    if (hablando) { parar(); return; }
    hablando = true;
    btnGrabar.textContent = "Parar";
    btnGrabar.classList.add("ghost");
    arrancarCrono();

    if (!soporta) { estado.textContent = "Hablando… escribe después lo que dijiste"; return; }

    const base = ta.value.trim();
    estado.textContent = "Escuchando…";
    mic = dictar({
      lang: "en-GB",
      onText: (firme, prov) => {
        ta.value = (base ? base + " " : "") + firme;
        provisional.textContent = prov;
        marcarActividad();
      },
      onFin: motivo => {
        if (motivo) { estado.textContent = motivo; toast(motivo); }
        parar();
      },
    });
    if (!mic) { estado.textContent = "Este navegador no admite dictado."; parar(); }
  });

  const btnEvaluar = el("button", { class: "btn", type: "button", "data-ai": "1" }, "Evaluar con IA");
  btnEvaluar.addEventListener("click", () => {
    if (!ta.value.trim()) { toast("Habla primero, o escribe tu transcripción"); return; }
    if (hablando) parar();
    tally("corrections");
    ask("speaking", { part: s.name, level: s.lvl, transcript: ta.value }, fb, btnEvaluar);
  });

  box.append(
    el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
      el("span", { class: "eyebrow" }, "Grabar y corregir"),
      el("div", { class: "row", style: "gap:8px" }, timerEl)),
    el("p", { class: "tiny", style: "margin-top:6px" },
      soporta
        ? "Pulsa, habla en inglés y el navegador escribe por ti. La primera vez te pedirá permiso para el micrófono; el audio no sale de tu equipo."
        : "Tu navegador no admite dictado (funciona en Chrome y Edge). Habla con el cronómetro y escribe después lo que dijiste, lo más fiel que puedas."),
    el("div", { class: "row", style: "margin-top:12px" },
      btnGrabar,
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { ta.value = ""; duracion = 0; medidas(); ta.focus(); },
      }, "Limpiar"),
      estado),
    el("div", { style: "margin-top:12px" }, ta),
    provisional,
    instant,
    el("div", { class: "row", style: "margin-top:12px" }, btnEvaluar),
    aiNote(),
    fb);

  medidas();
  return box;
}

function consejo(m: ReturnType<typeof medir>): string {
  if (m.palabras < 40) return "Todavía es corto para juzgarlo. Una respuesta de examen ronda las 100 palabras por minuto de consigna.";
  if (m.porMinuto !== null && m.porMinuto < 90) return "Vas lento: en el examen eso se lee como falta de fluidez. No busques la palabra perfecta, sigue hablando y rodea lo que no sepas.";
  if (m.porMinuto !== null && m.porMinuto > 175) return "Vas muy rápido. Baja el ritmo y marca las pausas entre ideas: la claridad puntúa más que la velocidad.";
  if (m.relleno > 5) return "Demasiadas muletillas. Sustitúyelas por una pausa callada: suena mucho mejor que un «um».";
  if (m.riqueza < 40) return "Estás reciclando poco vocabulario. Mete dos expresiones del lenguaje funcional de abajo.";
  return "Buen equilibrio de ritmo y vocabulario. Ahora pide la evaluación de la IA para la parte gramatical.";
}

/* ─────────────── utilidades ─────────────── */

function pararCrono(): void {
  if (spTimer) { clearInterval(spTimer); spTimer = null; }
}

/** Al cambiar de parte o de ruta hay que soltar el micrófono. */
export function pararTodo(): void {
  pararCrono();
  if (mic) { mic.parar(); mic = null; }
  hablando = false;
}

export const stopSp = pararTodo;
