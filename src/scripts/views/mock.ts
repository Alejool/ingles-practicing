/**
 * Módulo · Simulacro.
 *
 * Es un examen, así que se parece a uno: reloj que no se para, cuatro partes y
 * corrección solo al entregar. Lo que ha cambiado es la forma de recorrerlo.
 *
 * Antes eran las treinta y dos preguntas en una página; en el móvil, con el
 * texto de la parte 1 arriba, había que subir y bajar por cada hueco. Ahora es
 * un ítem por pantalla **con el texto de su parte siempre delante** y el hueco
 * en el que estás resaltado, más una hoja de respuestas para saltar a cualquier
 * ítem, que es justo lo que se hace en el examen de verdad cuando uno deja una
 * en blanco y vuelve al final.
 */

import { save, touchDay, P } from "../state";
import { $, el, esc, norm, pct, fmt } from "../dom";
import { T } from "../track";
import { renderPanel } from "./panel";
import { crearPasos, navPasos, pantallaCompleta } from "../pasos";

export let mockAns: Record<number, any> = {};
let mockRunning = false;
let mockT: ReturnType<typeof setInterval> | null = null;
let mockLeft = 40 * 60;
/** Ítem que se está viendo (0..total-1). */
let idx = 0;
/** Terminado: se enseña el resultado y el repaso. */
let corregido = false;

/* ─────────────── qué simulacro ─────────────── */

/** El simulacro elegido. Cada ruta trae cuatro, de dificultad creciente. */
function M() {
  const ms = T().mocks;
  const i = Math.min(ms.length - 1, Math.max(0, P().mock.current ?? 0));
  return ms[i];
}
function mockIdx() { return Math.min(T().mocks.length - 1, Math.max(0, P().mock.current ?? 0)); }

/** Cuántos ítems tiene: no son 32 en las dos rutas. */
function TOTAL() {
  const m = M();
  return m.p1.items.length + m.p2.items.length + m.p3.items.length + m.p4.items.length;
}

/** Minuto y cuarto por ítem, redondeado: 40 min para 32, 30 para 24. */
function MINUTOS() { return Math.round(TOTAL() * 1.25); }

export function mockItems() {
  return [...M().p1.items.map(i => ({ ...i, part: 1 })), ...M().p2.items.map(i => ({ ...i, part: 2 })),
    ...M().p3.items.map(i => ({ ...i, part: 3 })), ...M().p4.items.map(i => ({ ...i, part: 4 }))];
}

function parteDe(n: number) {
  const m = M();
  return n === 1 ? m.p1 : n === 2 ? m.p2 : n === 3 ? m.p3 : m.p4;
}

/** ¿Está respondido? Vale para los de opción y los de escribir. */
function respondido(n: number): boolean {
  const v = mockAns[n];
  return v !== undefined && String(v).trim() !== "";
}

function aciertaItem(it: any): boolean {
  const v = mockAns[it.n];
  return it.o ? v === it.a : ((it.a || []) as string[]).some(a => norm(a) === norm(v));
}

/* ─────────────── portada ─────────────── */

function selectorSimulacros(): HTMLElement {
  const fila = el("div", { class: "row", style: "margin-top:12px" });
  T().mocks.forEach((_m, i) => {
    const hechos = P().mock.history.filter(h => h.m === i).length;
    fila.append(el("button", {
      class: "btn " + (i === mockIdx() ? "" : "ghost") + " small", type: "button",
      onclick: () => { P().mock.current = i; save(); renderMockBlank(); },
    },
      el("span", {}, "Simulacro " + (i + 1)),
      hechos ? el("span", { class: "chip ok", style: "margin-left:4px" }, "×" + hechos) : null));
  });
  return el("div", {},
    el("span", { class: "eyebrow" }, "Cuál haces"),
    fila,
    el("p", { class: "tiny", style: "margin-top:8px" },
      "Van de menos a más difícil. Haz el 1 al empezar y guárdate el 4 para la semana antes del examen; " +
      "repetir siempre el mismo deja de medir a la segunda."));
}

export function renderMockBlank(): void {
  const out = $("#mockOut");
  if (!out) return;
  out.innerHTML = "";
  pantallaCompleta(mockRunning, "mock");

  if (mockRunning) { examen(out); return; }
  if (corregido) { resultado(out); return; }

  out.append(el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Antes de empezar"),
    el("h3", { style: "margin:4px 0 8px" }, "Reglas del simulacro"),
    el("ul", { style: "margin:0;padding-left:18px" }, [
      MINUTOS() + " minutos para " + TOTAL() + " ítems. El reloj no se para.",
      "Un ítem por pantalla, con el texto de su parte delante y la hoja de respuestas para saltar.",
      "Nada de diccionario, traductor ni pestañas abiertas.",
      "Si no sabes un ítem, responde igualmente: no hay penalización por error.",
      "La corrección llega al entregar o cuando se acabe el tiempo, no antes.",
      "Cuatro partes: multiple-choice cloze, open cloze, word formation y transformaciones.",
    ].map(x => el("li", { class: "small", style: "margin-bottom:5px" }, x))),
    selectorSimulacros(),
    el("div", { class: "row", style: "margin-top:14px" },
      el("button", { class: "btn", type: "button", onclick: empezar }, "Empezar el simulacro " + (mockIdx() + 1))),
    P().mock.history.length ? el("div", { style: "margin-top:14px" },
      el("span", { class: "eyebrow" }, "Historial"),
      el("div", { class: "tblwrap", style: "margin-top:8px" }, el("table", {},
        el("thead", {}, el("tr", {}, el("th", {}, "Fecha"), el("th", {}, "Cuál"), el("th", {}, "Aciertos"), el("th", {}, "Escala Cambridge"))),
        el("tbody", {}, P().mock.history.slice(-8).reverse().map(h =>
          el("tr", {}, el("td", {}, h.d), el("td", {}, "nº " + ((h.m ?? 0) + 1)),
            el("td", { class: "num" }, h.s + "/" + (h.t ?? 32)), el("td", { class: "num" }, String(h.cs)))))))) : null));
}

function empezar(): void {
  mockAns = {};
  mockRunning = true;
  corregido = false;
  idx = 0;
  mockLeft = MINUTOS() * 60;
  touchDay();
  renderMockBlank();
  mockT = setInterval(tickMock, 1000);
}

/* ─────────────── el examen ─────────────── */

function examen(out: HTMLElement): void {
  const items = mockItems();
  const total = items.length;
  const reloj = el("span", { class: "timer", id: "mockTimer" }, fmt(Math.max(0, mockLeft)));
  const pasos = crearPasos(out, {
    alSalir: () => {
      if (!confirm("¿Salir del simulacro? Se pierde lo respondido.")) return;
      pararReloj();
      mockRunning = false;
      renderMockBlank();
    },
    salir: "Abandonar",
    extraCab: reloj,
  });

  const pintar = () => {
    pasos.limpiar();
    const it: any = items[idx];
    const parte = parteDe(it.part);
    const hechos = items.filter(x => respondido(x.n)).length;
    pasos.progreso(hechos, total, "ítem " + it.n + " / " + total);

    const cabecera = el("div", { class: "mock-parte" },
      el("span", { class: "chip a" }, "Parte " + it.part),
      el("span", { class: "tiny" }, parte.title));

    /* Partes 1 y 2: el texto va delante, con el hueco actual marcado. */
    if (it.part === 1 || it.part === 2) {
      const texto = el("p", { class: "en", style: "line-height:2.2;margin:0" });
      (parte as any).text.forEach((raw: any) => {
        if (typeof raw === "string") { texto.append(document.createTextNode(raw)); return; }
        const esActual = raw.n === it.n;
        const valor = it.part === 2 ? mockAns[raw.n] : undefined;
        texto.append(el("span", {
          class: "cloze-hueco" + (esActual ? " ahora" : "") + (respondido(raw.n) && !esActual ? " puesto" : ""),
        }, it.part === 2 ? (valor || "(" + raw.n + ")") : "(" + raw.n + ")"));
      });
      pasos.cuerpo.classList.add("lector");
      pasos.cuerpo.append(
        el("div", { class: "lec-texto" }, cabecera, el("p", { class: "tiny", style: "margin:6px 0 10px" }, parte.intro), texto),
        el("div", { class: "lec-pregunta" }, ...cuerpoItem(it, pintar, pasos)));
      setTimeout(() => pasos.cuerpo.querySelector(".cloze-hueco.ahora")?.scrollIntoView({ block: "center" }), 30);
    } else {
      pasos.cuerpo.classList.remove("lector");
      pasos.cuerpo.append(cabecera, ...cuerpoItem(it, pintar, pasos));
    }

    pasos.pie.append(navPasos({
      atras: idx > 0 ? () => { idx--; pintar(); pasos.medir(); } : null,
      siguiente: idx + 1 < total
        ? () => { idx++; pintar(); pasos.medir(); }
        : () => submitMock(false),
      textoSiguiente: idx + 1 < total ? "Siguiente ›" : "Entregar ›",
      extra: hoja(items, pintar, pasos),
    }));
    pasos.medir();
  };

  /**
   * Al escribir no se repinta el ítem —se perdería el cursor—, así que solo se
   * refrescan las dos cosas que cambian: el contador y la casilla de la hoja.
   */
  marcarRespondido = () => {
    const items2 = mockItems();
    pasos.progreso(items2.filter(x => respondido(x.n)).length, items2.length, "ítem " + items2[idx].n + " / " + items2.length);
    document.querySelectorAll<HTMLElement>(".hoja-n").forEach((b, i) => {
      b.classList.toggle("hecho", respondido(items2[i].n));
    });
    const resumen = document.querySelector(".hoja > summary");
    if (resumen) resumen.textContent = "Hoja de respuestas · " + items2.filter(x => respondido(x.n)).length + " de " + items2.length;
  };

  pintar();
}

/** Lo llama el campo de texto en cada tecla; se reasigna al montar el examen. */
let marcarRespondido: () => void = () => {};

/** El ítem en sí: opciones en la parte 1, campo de texto en las demás. */
function cuerpoItem(it: any, pintar: () => void, pasos: ReturnType<typeof crearPasos>): HTMLElement[] {
  const fuera: HTMLElement[] = [];

  if (it.part === 1) {
    fuera.push(el("div", { class: "qtext", style: "margin-bottom:4px" }, "Hueco " + it.n + ": ¿cuál encaja?"));
    const caja = el("div", { class: "opciones", style: "max-width:none" });
    it.o.forEach((o: string, j: number) => {
      caja.append(el("button", {
        class: "opt" + (mockAns[it.n] === j ? " elegida" : ""), type: "button",
        onclick: () => { mockAns[it.n] = j; pintar(); pasos.medir(); },
      }, el("span", { class: "k" }, "ABCD"[j]), el("span", {}, o)));
    });
    fuera.push(caja);
    return fuera;
  }

  if (it.part === 2) {
    fuera.push(el("div", { class: "qtext", style: "margin-bottom:8px" }, "Hueco " + it.n + ": una sola palabra"));
  } else if (it.part === 3) {
    fuera.push(
      el("div", { class: "row", style: "justify-content:center;margin-bottom:8px" }, el("span", { class: "chip a" }, it.root)),
      el("div", { class: "en", style: "margin-bottom:10px", html: esc(it.s).replace(/_+/g, '<span class="hl">' + "&nbsp;".repeat(12) + "</span>") }));
  } else {
    fuera.push(
      el("div", { class: "en", style: "margin-bottom:8px" }, it.s1),
      el("div", { class: "row", style: "justify-content:center;margin-bottom:8px" }, el("span", { class: "chip a" }, it.key)),
      el("div", { class: "en", style: "margin-bottom:10px", html: esc(it.s2).replace(/_+/g, '<span class="hl">' + "&nbsp;".repeat(18) + "</span>") }));
  }

  const inp = el("input", {
    type: "text", value: mockAns[it.n] || "", autocomplete: "off", spellcheck: "false", autocapitalize: "off",
    placeholder: it.part === 4 ? "2–5 palabras…" : "Tu respuesta…",
    oninput: (e: Event) => { mockAns[it.n] = (e.target as HTMLInputElement).value; marcarRespondido(); },
  }) as HTMLInputElement;
  fuera.push(el("div", { style: "max-width:420px;margin:0 auto;width:100%" }, inp));
  setTimeout(() => inp.focus(), 40);
  return fuera;
}

/**
 * La hoja de respuestas.
 *
 * En un examen de verdad se salta una pregunta y se vuelve al final; sin esto,
 * llegar al ítem 19 desde el 4 serían quince toques.
 */
function hoja(items: any[], pintar: () => void, pasos: ReturnType<typeof crearPasos>): HTMLElement {
  const det = el("details", { class: "hoja" });
  const rejilla = el("div", { class: "hoja-rejilla" });
  items.forEach((it, i) => {
    rejilla.append(el("button", {
      class: "hoja-n" + (respondido(it.n) ? " hecho" : "") + (i === idx ? " ahora" : ""),
      type: "button",
      onclick: () => { idx = i; det.open = false; pintar(); pasos.medir(); },
    }, String(it.n)));
  });
  det.append(
    el("summary", {}, "Hoja de respuestas · " + items.filter(x => respondido(x.n)).length + " de " + items.length),
    rejilla);
  return det;
}

export function tickMock(): void {
  const t = document.getElementById("mockTimer");
  if (t) {
    t.textContent = fmt(Math.max(0, mockLeft));
    t.classList.toggle("hot", mockLeft <= 300);
  }
  if (mockLeft <= 0) { submitMock(true); return; }
  mockLeft--;
}

function pararReloj(): void {
  if (mockT) clearInterval(mockT);
  mockT = null;
}

/* ─────────────── entregar y corregir ─────────────── */

export function submitMock(auto?: boolean): void {
  if (!mockRunning) return;
  const sinResponder = mockItems().filter(it => !respondido(it.n)).length;
  if (!auto && sinResponder && !confirm("Te quedan " + sinResponder + " ítems sin responder. ¿Entregar igualmente?")) return;

  pararReloj();
  mockRunning = false;
  corregido = true;

  let score = 0;
  const byPart: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  mockItems().forEach(it => { if (aciertaItem(it)) { score++; byPart[(it as any).part]++; } });

  const total = TOTAL();
  const p = pct(score, total);
  const cs = Math.round(120 + p * 0.8);
  P().mock.history.push({ d: new Date().toISOString().slice(0, 10), s: score, cs, m: mockIdx(), t: total });
  // La mejor marca se guarda en porcentaje: comparar aciertos entre simulacros
  // de distinta longitud no diría nada.
  P().mock.best = P().mock.best === null ? p : Math.max(P().mock.best, p);
  P().stats.mock = { ok: (P().stats.mock?.ok || 0) + score, n: (P().stats.mock?.n || 0) + total };
  save();
  renderPanel();
  ultimo = { score, total, p, cs, byPart, auto: !!auto };
  renderMockBlank();
}

let ultimo: { score: number; total: number; p: number; cs: number; byPart: Record<number, number>; auto: boolean } | null = null;

function resultado(out: HTMLElement): void {
  const r = ultimo;
  if (!r) { corregido = false; renderMockBlank(); return; }
  const lvl = r.cs < 140 ? "por debajo de B1" : r.cs < 160 ? "B1" : r.cs < 180 ? "B2" : "C1";

  out.append(el("div", { class: "card" },
    r.auto ? el("span", { class: "chip bad" }, "Se acabó el tiempo") : null,
    el("h3", { style: "font-size:27px;margin:6px 0" },
      "Simulacro " + (mockIdx() + 1) + " · " + r.score + " / " + r.total + " · " + r.p + "% · escala " + r.cs + " (" + lvl + ")"),
    el("p", { class: "small" }, r.p >= 80 ? "Nivel de aprobado holgado en Reading & Use of English. Trabaja ahora Writing y Speaking, que es donde se pierden los B2."
      : r.p >= 65 ? "Estás en la franja de aprobado justo. El margen está en la parte 4: las transformaciones son las que más suben la nota con menos horas."
        : r.p >= 45 ? "Todavía por debajo del corte. Vuelve a los módulos 04 y 06 antes de repetir el simulacro."
          : "Muy por debajo. No repitas simulacros todavía: la mejora vendrá de gramática y vocabulario, no de más exámenes."),
    el("div", { class: "grid g3", style: "margin-top:14px" },
      ([["Parte 1 · Cloze múltiple", r.byPart[1], M().p1.items.length],
        ["Parte 2 · Open cloze", r.byPart[2], M().p2.items.length],
        ["Parte 3 · Word formation", r.byPart[3], M().p3.items.length],
        ["Parte 4 · Transformaciones", r.byPart[4], M().p4.items.length]] as Array<[string, number, number]>)
        .map(([n, v, de]) => el("div", { class: "tile" }, el("span", { class: "l" }, n), el("span", { class: "v" }, v + "/" + de),
          el("span", { class: "tiny" }, v / de >= 0.75 ? "Sólido" : v / de >= 0.5 ? "Justo" : "Prioridad")))),
    el("p", { class: "tiny", style: "margin-top:12px" },
      "La escala es una estimación orientativa a partir del porcentaje de aciertos, no una nota oficial de Cambridge."),
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", { class: "btn ghost small", type: "button", onclick: () => { corregido = false; renderMockBlank(); } }, "Volver a las reglas"),
      mockIdx() + 1 < T().mocks.length
        ? el("button", {
            class: "btn ghost small", type: "button",
            onclick: () => { P().mock.current = mockIdx() + 1; save(); corregido = false; renderMockBlank(); },
          }, "Preparar el simulacro " + (mockIdx() + 2) + " para otro día")
        : null)));

  /* Repaso ítem a ítem, plegado: lo que falta después de un examen es entender
     los fallos, no volver a ver los aciertos. */
  const lista = el("div", { class: "listilla", style: "margin-top:8px" });
  mockItems().forEach((it: any) => {
    const ok = aciertaItem(it);
    const tuya = it.o ? (mockAns[it.n] !== undefined ? it.o[mockAns[it.n]] : "—") : (mockAns[it.n] || "—");
    const buena = it.o ? it.o[it.a] : it.a[0];
    lista.append(el("details", { class: "repaso" + (ok ? " ok" : " mal") },
      el("summary", {},
        el("span", { class: "mono tiny" }, String(it.n).padStart(2, "0")),
        el("span", { class: "repaso-q" }, "Parte " + it.part + " · " + (ok ? buena : "tú: " + tuya)),
        el("span", { class: "chip " + (ok ? "ok" : "bad") }, ok ? "✓" : "✗")),
      el("div", { class: "repaso-body" },
        el("div", { class: "small" }, "Correcta: " + buena),
        !ok ? el("div", { class: "small", style: "color:var(--bad)" }, "Tú: " + tuya) : null,
        el("div", { class: "explain", style: "margin-top:8px" }, el("span", { class: "tag" }, "Por qué"), el("span", { html: it.e })))));
  });
  out.append(el("div", { class: "card", style: "margin-top:14px" },
    el("span", { class: "eyebrow" }, "Repaso ítem a ítem"),
    el("p", { class: "tiny", style: "margin:4px 0 8px" }, "Pulsa cualquiera para ver la explicación."),
    lista));
}

/** Se conservan porque otros módulos las importaban. */
export function renderMock(): void { renderMockBlank(); }
export function updMockCount(): void { /* el contador vive ahora en la cabecera */ }
