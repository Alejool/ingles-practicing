/**
 * Escucha · los audios de la ruta con el protocolo de tres pases.
 *
 * No hay ficheros de audio: el guion lo lee la voz del navegador, con una voz
 * distinta para cada hablante. Eso permite tener escucha real dentro del plan,
 * sin conexión y sin pesar nada.
 *
 *   Pase 1 · escuchar sin nada delante, para la idea general.
 *   Pase 2 · escuchar con las preguntas y contestarlas.
 *   Pase 3 · escuchar con el transcript y ver por qué cada respuesta es la que es.
 */

import { P, save } from "../state";
import { el, toast } from "../dom";
import { T, days } from "../track";
import { bump, tally, currentDay } from "../progress";
import { renderPanel } from "./panel";
import { hablarGuion, callar, hayVoz, hablando } from "../voice";
import type { ListeningTrack } from "../../data/types";

type Pase = 1 | 2 | 3;

let abierto: number | null = null;
let pase: Pase = 1;
let velocidad = 0.9;
let lineaViva = -1;
let host: HTMLElement | null = null;

const clave = (a: ListeningTrack, j: number) => "l:" + a.id + ":" + j;
const hechas = (a: ListeningTrack) => a.qs.filter((_q, j) => P().uoe[clave(a, j)]).length;
const aciertos = (a: ListeningTrack) => a.qs.filter((_q, j) => P().uoe[clave(a, j)]?.ok).length;

/** El audio que asigna el día en curso, si hoy toca escucha. */
function audioDelDia(): number | null {
  const b = days()[currentDay() - 1]?.blocks.find(x => x.goto?.listen !== undefined);
  return b ? Math.min(T().listening.length - 1, b.goto!.listen!) : null;
}

/** El audio que le toca al día en curso, o el siguiente sin terminar. */
export function audioDeHoy(): number {
  const t = T();
  const delDia = audioDelDia();
  if (delDia !== null) return delDia;
  const pendiente = t.listening.findIndex(a => hechas(a) < a.qs.length);
  return pendiente < 0 ? 0 : pendiente;
}

/** Abre un audio concreto (lo usa el plan al pulsar «Abrir el audio de hoy»). */
export function abrirAudio(i: number): void {
  if (abierto !== i) { abierto = i; pase = 1; }
}

export function pararEscucha(): void {
  callar();
  lineaViva = -1;
}

export function montarEscucha(destino: HTMLElement): void {
  host = destino;
  const t = T();
  if (!t.listening.length) {
    destino.append(el("div", { class: "card" }, el("p", { class: "small" }, "Esta ruta aún no tiene audios.")));
    return;
  }
  if (abierto === null || !t.listening[abierto]) abierto = audioDeHoy();
  pintar();
}

function pintar(): void {
  if (!host) return;
  host.innerHTML = "";
  const t = T();
  const a = t.listening[abierto!];
  host.append(selector(), ficha(a));
  if (pase >= 2) host.append(preguntas(a));
  if (pase === 3) host.append(transcript(a));
}

/* ─────────────── la lista de audios ─────────────── */

function selector(): HTMLElement {
  const t = T();
  const hoy = audioDeHoy();
  const marca = audioDelDia() === null ? " · siguiente" : " · hoy";
  const fila = el("div", { class: "row", style: "gap:6px;margin-bottom:14px;flex-wrap:wrap" });
  t.listening.forEach((a, i) => {
    const hecho = hechas(a) === a.qs.length;
    fila.append(el("button", {
      class: "btn small " + (i === abierto ? "" : "ghost"), type: "button",
      title: a.title,
      onclick: () => { pararEscucha(); abierto = i; pase = hecho ? 3 : 1; pintar(); },
    }, "Audio " + (i + 1) + (hecho ? " ✓" : i === hoy ? marca : "")));
  });
  return fila;
}

/* ─────────────── ficha y reproductor ─────────────── */

function ficha(a: ListeningTrack): HTMLElement {
  const quien = a.speakers.B ? a.speakers.A + " y " + a.speakers.B : a.speakers.A;
  const palabras = a.lines.reduce((n, l) => n + l.t.split(/\s+/).length, 0);

  const pasos = el("ol", { class: "pases" },
    ([[1, "Sin texto", "Solo la idea general: quién habla, de qué y para qué."],
      [2, "Con las preguntas", "Léelas antes de pulsar y contesta mientras escuchas."],
      [3, "Con el transcript", "Marca lo que tu oído no reconoció y relee el porqué."]] as Array<[Pase, string, string]>)
      .map(([n, nombre, que]) => el("li", { class: n === pase ? "activo" : n < pase ? "hecho" : "" },
        el("b", {}, "Pase " + n + " · " + nombre), el("span", { class: "tiny" }, que))));

  const play = el("button", { class: "btn", type: "button" }, "▶ Escuchar");
  const cambiar = (sonando: boolean) => { play.textContent = sonando ? "■ Parar" : "▶ Escuchar"; };
  play.addEventListener("click", () => {
    if (hablando()) { pararEscucha(); cambiar(false); marcarLinea(-1); return; }
    cambiar(true);
    hablarGuion(a.lines, {
      rate: velocidad,
      onLinea: i => marcarLinea(i),
      onFin: () => { cambiar(false); marcarLinea(-1); },
      onError: m => toast(m),
    });
  });

  const vel = el("select", { id: "escuchaVelocidad", class: "small", "aria-label": "Velocidad" },
    ...[[0.75, "Lenta"], [0.9, "Normal"], [1, "Examen"]].map(([v, n]) =>
      el("option", { value: String(v), selected: v === velocidad ? "" : null }, n as string))) as HTMLSelectElement;
  vel.addEventListener("change", () => { velocidad = Number(vel.value); });

  const siguiente = pase === 1
    ? el("button", { class: "btn ghost", type: "button", onclick: () => { pase = 2; pintar(); } }, "Ya lo he oído: ver preguntas ›")
    : pase === 2 && hechas(a) === a.qs.length
      ? el("button", { class: "btn ghost", type: "button", onclick: () => { pase = 3; pintar(); } }, "Ver el transcript ›")
      : null;

  return el("div", { class: "card" },
    el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
      el("span", { class: "eyebrow" }, a.kind + " · " + palabras + " palabras"),
      el("span", { class: "chip" + (hechas(a) === a.qs.length ? " ok" : "") },
        hechas(a) === a.qs.length ? aciertos(a) + "/" + a.qs.length + " aciertos" : hechas(a) + "/" + a.qs.length)),
    el("h3", { style: "margin:6px 0 6px;font-size:24px" }, a.title),
    el("p", { class: "small" }, a.context + " Voces: " + quien + "."),
    pasos,
    hayVoz()
      ? el("div", { class: "row", style: "gap:10px;margin-top:12px;align-items:center" }, play, vel, siguiente)
      : el("p", { class: "small", style: "margin-top:12px" },
          "Este navegador no puede leer en voz alta. Abre la app en Chrome, Edge o Safari para oír el audio; mientras, puedes hacer el ejercicio leyendo el transcript.",
          el("div", { class: "row", style: "margin-top:8px" },
            el("button", { class: "btn ghost small", type: "button", onclick: () => { pase = 3; pintar(); } }, "Ver el transcript"))));
}

function marcarLinea(i: number): void {
  lineaViva = i;
  host?.querySelectorAll<HTMLElement>(".guion p").forEach((p, k) => p.classList.toggle("viva", k === i));
}

/* ─────────────── preguntas ─────────────── */

function preguntas(a: ListeningTrack): HTMLElement {
  const box = el("div", { class: "card", style: "margin-top:14px" },
    el("span", { class: "eyebrow" }, "Preguntas · tres opciones, una correcta"));
  a.qs.forEach((q, j) => {
    const k = clave(a, j);
    const rec = P().uoe[k];
    const caja = el("div", { class: "opciones", style: "max-width:none;margin-top:8px" });
    q.o.forEach((o, n) => {
      const estado = rec ? (n === q.a ? " ok" : rec.v === n ? " mal" : "") : "";
      caja.append(el("button", {
        class: "opt" + estado, type: "button", disabled: rec ? "" : null,
        onclick: () => {
          P().uoe[k] = { v: n, ok: n === q.a };
          save();
          bump("listen", n === q.a);
          if (hechas(a) === a.qs.length) terminar(a);
          pintar();
        },
      }, el("span", { class: "k" }, "ABC"[n]), el("span", {}, o)));
    });
    box.append(el("div", { style: "margin-top:16px" },
      el("div", { class: "qtext", style: "font-size:17px;margin-bottom:0" }, (j + 1) + ". " + q.q),
      caja,
      rec && pase === 3
        ? el("div", { class: "explain" }, el("span", { class: "tag" }, rec.ok ? "Correcto · por qué" : "Por qué"), el("span", { html: q.e }))
        : null));
  });
  if (hechas(a) > 0) {
    box.append(el("div", { class: "row", style: "margin-top:14px" },
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => { a.qs.forEach((_q, j) => delete P().uoe[clave(a, j)]); save(); pase = 1; pintar(); },
      }, "Reiniciar y volver a escucharlo en frío")));
  }
  return box;
}

function terminar(a: ListeningTrack): void {
  const p = P();
  if (!p.read) p.read = {};
  p.read["l:" + a.id] = (p.read["l:" + a.id] || 0) + 1;
  save();
  tally("escuchas");
  toast(aciertos(a) + " de " + a.qs.length + ". Ahora el tercer pase: el transcript.");
  pase = 3;
  renderPanel();
}

/* ─────────────── transcript ─────────────── */

function transcript(a: ListeningTrack): HTMLElement {
  return el("div", { class: "card", style: "margin-top:14px" },
    el("span", { class: "eyebrow" }, "Transcript · la línea que suena se resalta"),
    el("div", { class: "guion" },
      a.lines.map((l, i) => el("p", { class: "en" + (i === lineaViva ? " viva" : "") },
        el("b", {}, (l.s === "B" ? a.speakers.B : a.speakers.A) + ": "), l.t))),
    el("p", { class: "tiny", style: "margin-top:10px" },
      "Vuelve a pulsar Escuchar con el transcript delante. Subraya mentalmente cada palabra que no reconociste al oído: esas son las que hay que entrenar con el dictado."));
}
