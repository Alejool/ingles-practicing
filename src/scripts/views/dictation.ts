/**
 * Dictado inverso.
 *
 * La app lee una frase y tú la escribes. Es el ejercicio de comprensión oral
 * más rentable que se puede montar sin ficheros de audio: obliga a distinguir
 * sonidos que en el papel no se confunden (*they’re / their*, *walked / walk*,
 * *can / can’t*) y la corrección es palabra por palabra, no una nota vaga.
 *
 * Las frases salen del contenido que ya tienes: los ejemplos de las tarjetas,
 * las frases de los drills y los párrafos de las lecturas.
 */

import { P, save } from "../state";
import { $, el, toast } from "../dom";
import { T, hayLecturas } from "../track";
import { bump, tally } from "../progress";
import { anadir } from "../mine";
import { hablar, callar, hayVoz, corregirDictado, vocesInglesas } from "../voice";
import type { Correccion } from "../voice";

type Fuente = "vocab" | "drills" | "lectura";
type Largo = "corta" | "media" | "larga";

let fuente: Fuente = "vocab";
let largo: Largo = "media";
let frase: string | null = null;
let corregido: Correccion | null = null;
let velocidad = 0.85;
let escuchas = 0;

/* ─────────────── de dónde salen las frases ─────────────── */

function palabras(s: string): number {
  return s.trim().split(/\s+/).length;
}

function cabe(s: string): boolean {
  const n = palabras(s);
  if (largo === "corta") return n >= 4 && n <= 8;
  if (largo === "media") return n >= 8 && n <= 16;
  return n >= 16 && n <= 32;
}

/** Todas las frases candidatas de la fuente elegida. */
function candidatas(): string[] {
  const t = T();
  const out: string[] = [];

  if (fuente === "vocab") {
    t.decks.forEach(d => d.cards.forEach(c => { if (c[3]) out.push(c[3]); }));
  } else if (fuente === "drills") {
    // La frase del drill con el hueco ya resuelto: así se oye una frase entera.
    t.grammar.forEach(u => u.dr.forEach(d => {
      const buena = d.o[d.a];
      if (!buena || !d.q.includes("___")) return;
      out.push(d.q.replace(/___/g, buena).replace(/\s+/g, " ").trim());
    }));
  } else {
    if (!hayLecturas()) return [];
    t.readings.forEach(tx => tx.body.forEach(p => {
      p.split(/(?<=[.!?])\s+/).forEach(f => { if (f.trim()) out.push(f.trim()); });
    }));
  }

  return out.filter(cabe);
}

function otraFrase(): void {
  const pool = candidatas();
  if (!pool.length) { frase = null; return; }
  let nueva = pool[Math.floor(Math.random() * pool.length)];
  // Que no repita justo la anterior.
  if (pool.length > 1) {
    for (let i = 0; i < 5 && nueva === frase; i++) nueva = pool[Math.floor(Math.random() * pool.length)];
  }
  frase = nueva;
  corregido = null;
  escuchas = 0;
}

/* ─────────────── pantalla ─────────────── */

export function renderDictado(host: HTMLElement): void {
  host.innerHTML = "";

  if (!hayVoz()) {
    host.append(el("div", { class: "card" },
      el("span", { class: "eyebrow" }, "Dictado"),
      el("h3", { style: "margin-top:4px" }, "Este navegador no puede leer en voz alta"),
      el("p", { class: "small", style: "margin-top:6px" },
        "El dictado usa la voz del sistema, que va incluida en Chrome, Edge, Safari y Firefox recientes. " +
        "Prueba en otro navegador o actualiza el que usas.")));
    return;
  }

  host.append(ajustes());

  if (!frase) otraFrase();
  if (!frase) {
    host.append(el("div", { class: "card", style: "margin-top:12px" },
      el("p", { class: "small" },
        fuente === "lectura" && !hayLecturas()
          ? "Los textos aún no han terminado de descargarse. Abre «Biblioteca» un momento y vuelve."
          : "No hay frases de ese largo en esta fuente. Prueba con otra longitud.")));
    return;
  }

  host.append(ejercicio());
}

function ajustes(): HTMLElement {
  const box = el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Dictado · la app lee, tú escribes"),
    el("h3", { style: "margin:4px 0 6px" }, "Entrena el oído, no la vista"),
    el("p", { class: "small" },
      "Escucha y escribe lo que oigas. Se corrige palabra por palabra, así ves exactamente cuál se te escapó. " +
      "No hace falta acertar la puntuación ni las mayúsculas."));

  const fuentes: Array<[Fuente, string]> = [
    ["vocab", "Frases de vocabulario"],
    ["drills", "Frases de gramática"],
    ["lectura", "Frases de las lecturas"],
  ];
  const filaF = el("div", { class: "row", style: "margin-top:12px" });
  fuentes.forEach(([id, n]) => filaF.append(el("button", {
    class: "btn " + (fuente === id ? "" : "ghost") + " small", type: "button",
    onclick: () => { fuente = id; callar(); otraFrase(); repintar(); },
  }, n)));

  const largos: Array<[Largo, string]> = [["corta", "Cortas"], ["media", "Medias"], ["larga", "Largas"]];
  const filaL = el("div", { class: "row", style: "margin-top:8px" });
  largos.forEach(([id, n]) => filaL.append(el("button", {
    class: "btn " + (largo === id ? "" : "ghost") + " small", type: "button",
    onclick: () => { largo = id; callar(); otraFrase(); repintar(); },
  }, n)));

  const vels: Array<[number, string]> = [[0.65, "Muy lento"], [0.85, "Lento"], [1, "Normal"]];
  const filaV = el("div", { class: "row", style: "margin-top:8px" });
  vels.forEach(([v, n]) => filaV.append(el("button", {
    class: "btn " + (velocidad === v ? "" : "ghost") + " small", type: "button",
    onclick: () => { velocidad = v; repintar(); },
  }, n)));

  box.append(filaF, filaL, filaV);
  return box;
}

function ejercicio(): HTMLElement {
  const texto = frase!;
  const box = el("div", { class: "card", style: "margin-top:12px" });

  const ta = el("textarea", {
    id: "dictText",
    placeholder: "Escribe aquí lo que oigas. Pulsa «Escuchar» las veces que quieras.",
    spellcheck: "false", autocapitalize: "none",
  }) as HTMLTextAreaElement;

  const contador = el("span", { class: "tiny" }, "");
  function pintarContador(): void {
    contador.textContent = escuchas
      ? escuchas + (escuchas === 1 ? " escucha" : " escuchas")
      : "Aún no lo has escuchado";
  }
  pintarContador();

  const btnOir = el("button", { class: "btn", type: "button" }, "Escuchar");
  btnOir.addEventListener("click", () => {
    escuchas++;
    pintarContador();
    btnOir.textContent = "Sonando…";
    (btnOir as HTMLButtonElement).disabled = true;
    hablar(texto, {
      rate: velocidad,
      onFin: () => { btnOir.textContent = "Escuchar otra vez"; (btnOir as HTMLButtonElement).disabled = false; },
      onError: m => { toast(m); btnOir.textContent = "Escuchar"; (btnOir as HTMLButtonElement).disabled = false; },
    });
  });

  const fb = el("div", { style: "margin-top:14px" });

  function corregir(): void {
    if (!ta.value.trim()) { toast("Escribe lo que has oído primero"); return; }
    callar();
    corregido = corregirDictado(texto, ta.value);
    bump("listen", corregido.pct >= 80);
    tally("dictados");
    save();
    pintarCorreccion();
  }

  function pintarCorreccion(): void {
    const c = corregido!;
    fb.innerHTML = "";

    const tira = el("p", { class: "en", style: "font-size:18px;line-height:2;margin-bottom:10px" });
    c.palabras.forEach((w, i) => {
      if (i) tira.append(document.createTextNode(" "));
      tira.append(el("span", { class: "dw", "data-e": w.estado, title: rotulo(w.estado) }, w.texto));
    });

    fb.append(el("div", {
      class: "explain",
      style: c.pct >= 80
        ? "border-left-color:var(--ok);background:var(--ok-soft)"
        : "border-left-color:var(--warn);background:var(--warn-soft)",
    },
      el("span", { class: "tag" }, c.aciertos + " de " + c.total + " palabras · " + c.pct + "%"),
      tira,
      el("p", { class: "tiny" },
        "Verde: bien. Rojo tachado: no estaba y la escribiste. Amarillo: se te escapó."),
      el("div", { class: "en", style: "margin-top:10px;font-size:17px" }, texto)));

    const falladas = c.palabras.filter(w => w.estado === "falta" && w.texto.length > 3);
    const acciones = el("div", { class: "row", style: "margin-top:12px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => { ta.value = ""; otraFrase(); repintar(); },
      }, "Otra frase"),
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => hablar(texto, { rate: 0.65 }),
      }, "Oírla despacio"));

    if (falladas.length) {
      acciones.append(el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => {
          falladas.slice(0, 3).forEach(w => anadir(w.texto, "(del dictado)", texto, "dictado"));
          toast(falladas.slice(0, 3).map(w => w.texto).join(", ") + " → al cuaderno");
        },
      }, "Las que fallé, al cuaderno"));
    }
    fb.append(acciones);
  }

  ta.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) corregir();
  });

  box.append(
    el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
      el("span", { class: "eyebrow" }, "Frase de " + palabras(texto) + " palabras"),
      contador),
    el("div", { class: "row", style: "margin-top:10px" },
      btnOir,
      el("button", { class: "btn ghost small", type: "button", onclick: () => hablar(texto, { rate: 0.65 }) }, "Más despacio"),
      el("button", { class: "btn ghost small", type: "button", onclick: () => { callar(); otraFrase(); repintar(); } }, "Saltar")),
    el("div", { style: "margin-top:12px" }, ta),
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", { class: "btn", type: "button", onclick: corregir }, "Corregir"),
      el("span", { class: "tiny" }, "También con Ctrl+Enter")),
    fb);

  if (corregido) setTimeout(pintarCorreccion, 0);
  setTimeout(() => { vocesInglesas(); ta.focus(); }, 0);
  return box;
}

function rotulo(e: string): string {
  if (e === "bien") return "Correcta";
  if (e === "falta") return "Estaba y no la escribiste";
  if (e === "sobra") return "La escribiste y no estaba";
  return "";
}

/* El host lo pone el módulo de lectura; aquí solo hace falta poder repintarlo. */
let anfitrion: HTMLElement | null = null;

export function montarDictado(host: HTMLElement): void {
  anfitrion = host;
  renderDictado(host);
}

function repintar(): void {
  if (anfitrion) renderDictado(anfitrion);
}

/** Al salir del módulo hay que callar la voz. */
export function pararDictado(): void {
  callar();
}
