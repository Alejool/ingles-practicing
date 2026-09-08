/**
 * Módulo · Listening & Reading.
 *
 * Tres submenús: la lectura que toca hoy, la biblioteca entera (relee lo que
 * quieras, cuando quieras) y un generador con IA que escribe un texto a medida
 * con sus preguntas y lo guarda para siempre.
 */

import { P, save } from "../state";
import { $, el, toast } from "../dom";
import { T, days, asegurarLecturas, hayLecturas } from "../track";
import { bump, tally, currentDay } from "../progress";
import { takeIntent } from "../intent";
import { streamAi, AiError, aiCopy, aiNote, needsAccount, refreshAi } from "../ai";
import { go } from "../nav";
import { renderPanel } from "./panel";
import { montarDictado, pararDictado } from "./dictation";
import { hablar, callar, hayVoz, hablando } from "../voice";
import { compartidas, refrescar, publicar, contarLectura } from "../library";
import type { GenText, ReadingText } from "../../data/types";

type Sub = "hoy" | "biblioteca" | "generar" | "dictado" | "estrategia";

let sub: Sub = "hoy";
let refrescada = false;
/** Qué texto se está leyendo: "b3" del banco, "g:<id>" de los generados. */
let abierto: string | null = null;

/* ─────────────── acceso a los textos ─────────────── */

function generados(): GenText[] {
  const p = P();
  if (!Array.isArray(p.gen)) p.gen = [];
  return p.gen;
}

interface Entrada { key: string; text: ReadingText; etiqueta: string; generado: boolean; compartido?: boolean; sharedId?: string }

function catalogo(): Entrada[] {
  const banco = T().readings.map((t, k) => ({
    key: "b" + k, text: t, etiqueta: "Texto " + (k + 1), generado: false,
  }));
  const mios = generados().map(g => ({
    key: "g:" + g.id, text: g.text, etiqueta: g.topic || "Generado", generado: true,
  }));
  // Los de la biblioteca común, sin repetir los que ya tienes tú generados.
  const propios = new Set(generados().map(g => g.id));
  const comunes = compartidas()
    .filter(c => !propios.has(c.id))
    .map(c => ({
      key: "s:" + c.id, text: c.data, etiqueta: c.topic || "De la biblioteca",
      generado: true, compartido: true, sharedId: c.id,
    }));
  return [...banco, ...mios, ...comunes];
}

function porClave(k: string | null): Entrada | undefined {
  if (!k) return undefined;
  return catalogo().find(e => e.key === k);
}

/** El texto que le toca al día en curso. Va rotando por el banco. */
function claveDeHoy(): string {
  const all = days();
  const n = currentDay();
  const dia = all[n - 1];
  const total = Math.max(1, T().readingCount);
  const conTexto = dia?.blocks.find(b => b.goto?.text !== undefined);
  if (conTexto) return "b" + Math.min(total - 1, conTexto.goto!.text!);
  return "b" + (n % total);
}

function veces(k: string): number {
  return P().read?.[k] || 0;
}

function marcarLeido(k: string): void {
  const p = P();
  if (!p.read) p.read = {};
  p.read[k] = (p.read[k] || 0) + 1;
  save();
}

function hechas(e: Entrada): number {
  return e.text.qs.filter((_q, j) => P().uoe[e.key + ":" + j]).length;
}

/* ─────────────── pantalla ─────────────── */

export function renderInput(): void {
  const out = $("#inputOut");
  if (!out) return;

  const intent = takeIntent("input");
  if (intent?.text !== undefined) {
    sub = "hoy";
    abierto = "b" + Math.min(T().readingCount - 1, intent.text);
  }

  out.innerHTML = "";
  out.append(menu());

  /* La biblioteca común se refresca por detrás; si trae algo, se repinta sola. */
  if (!refrescada) {
    refrescada = true;
    refrescar().then(n => { if (n) renderInput(); }).catch(() => { /* se verá lo cacheado */ });
  }

  /* Los textos van en su propio bundle. Si aún no están, se piden y se repinta. */
  if (!hayLecturas() && sub !== "estrategia" && sub !== "dictado") {
    out.append(el("div", { class: "card" },
      el("span", { class: "eyebrow" }, "Cargando"),
      el("h3", { style: "margin-top:4px" }, "Trayendo los textos"),
      el("p", { class: "small", style: "margin-top:6px" },
        "Las lecturas se descargan aparte para que la app arranque rápido. Un momento.")));
    asegurarLecturas()
      .then(() => renderInput())
      .catch(() => {
        out.innerHTML = "";
        out.append(menu(), el("div", { class: "card" },
          el("span", { class: "eyebrow" }, "Sin conexión"),
          el("h3", { style: "margin-top:4px" }, "No pude traer los textos"),
          el("p", { class: "small", style: "margin-top:6px" },
            "Necesitan descargarse una vez; después funcionan sin conexión. Vuelve a entrar cuando tengas red."),
          el("div", { class: "row", style: "margin-top:12px" },
            el("button", { class: "btn", type: "button", onclick: () => renderInput() }, "Reintentar"))));
      });
    return;
  }

  if (!abierto || !porClave(abierto)) abierto = claveDeHoy();

  if (sub === "dictado") {
    const host = el("div", {});
    out.append(host);
    montarDictado(host);
    return;
  }
  if (sub === "estrategia") out.append(estrategia());
  else if (sub === "biblioteca") out.append(biblioteca());
  else if (sub === "generar") out.append(generador());
  else out.append(hoy());
}

function menu(): HTMLElement {
  const fila = el("div", { class: "row", style: "margin-bottom:14px" });
  const pendientes = catalogo().filter(e => hechas(e) < e.text.qs.length).length;
  const opciones: Array<[Sub, string, string | null]> = [
    ["hoy", "La lectura de hoy", null],
    ["biblioteca", "Biblioteca", catalogo().length + " textos"],
    ["generar", "Generar con IA", null],
    ["dictado", "Dictado", null],
    ["estrategia", "Protocolo", null],
  ];
  opciones.forEach(([id, nombre, chip]) => {
    fila.append(el("button", {
      class: "btn " + (sub === id ? "" : "ghost") + " small", type: "button",
      onclick: () => { pararDictado(); sub = id; renderInput(); },
    },
      el("span", {}, nombre),
      chip ? el("span", { class: "chip", style: "margin-left:4px" }, chip) : null));
  });
  return el("div", {},
    fila,
    sub === "biblioteca" && pendientes
      ? el("p", { class: "tiny", style: "margin:-8px 0 12px" }, pendientes + " textos sin terminar.")
      : null);
}

/* ─────────────── submenú: hoy ─────────────── */

function hoy(): HTMLElement {
  const clave = claveDeHoy();
  const e = porClave(clave);
  const box = el("div", {});
  box.append(el("div", { class: "card" },
    el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
      el("span", { class: "eyebrow" }, "Lectura del día " + currentDay()),
      el("span", { class: "chip" + (e && hechas(e) === e.text.qs.length ? " ok" : " warn") },
        e ? hechas(e) + "/" + e.text.qs.length + " preguntas" : "—")),
    el("p", { class: "small", style: "margin-top:8px" },
      "Cada día del plan te asigna un texto distinto. Lee las preguntas primero, haz un barrido de 90 segundos y " +
      "responde justificando cada opción con una línea del texto."),
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", { class: "btn ghost small", type: "button", onclick: () => { sub = "biblioteca"; renderInput(); } },
        "Ver todos los textos"),
      el("button", { class: "btn ghost small", type: "button", onclick: () => { sub = "generar"; renderInput(); } },
        "Quiero uno nuevo"))));
  if (e) box.append(lector(e));
  return box;
}

/* ─────────────── submenú: biblioteca ─────────────── */

function biblioteca(): HTMLElement {
  const box = el("div", {});
  const lista = el("div", { class: "grid g2" });
  catalogo().forEach(e => {
    const n = hechas(e);
    const total = e.text.qs.length;
    const leido = veces(e.key);
    lista.append(el("div", {
      class: "card",
      style: "cursor:pointer" + (abierto === e.key ? ";border-color:var(--accent)" : ""),
      onclick: () => { abierto = e.key; renderInput(); window.scrollTo({ top: 0, behavior: "smooth" }); },
    },
      el("div", { class: "row", style: "justify-content:space-between;gap:8px" },
        el("span", { class: "eyebrow" },
          e.compartido ? "De la comunidad · " + e.etiqueta : e.generado ? "Generado · " + e.etiqueta : e.etiqueta),
        el("span", { class: "chip" + (n === total ? " ok" : n ? " warn" : "") }, n + "/" + total)),
      el("h3", { style: "margin:6px 0 4px;font-size:18px;line-height:1.3" }, e.text.title),
      el("p", { class: "tiny" },
        e.text.body.join(" ").split(/\s+/).length + " palabras" +
        (leido ? " · leído " + leido + (leido === 1 ? " vez" : " veces") : " · sin leer"))));
  });
  box.append(el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Biblioteca"),
    el("h3", { style: "margin-top:4px" }, "Todos tus textos"),
    el("p", { class: "tiny", style: "margin-top:4px" },
      "Los del banco, los que has generado tú y los que ha generado cualquier otra persona de esta instalación: " +
      "cada texto se paga una vez y lo leemos todos, así que la biblioteca crece sola. Puedes releer cualquiera " +
      "las veces que quieras, y reiniciar sus preguntas para volver a hacerlas en frío.")));
  box.append(el("div", { style: "margin-top:12px" }, lista));
  const e = porClave(abierto);
  if (e) box.append(lector(e));
  return box;
}

/* ─────────────── submenú: generar ─────────────── */

let generando = false;

function generador(): HTMLElement {
  const tema = el("input", {
    type: "text", placeholder: "Un tema, si quieres uno concreto (opcional)", autocomplete: "off",
  }) as HTMLInputElement;
  const estado = el("div", { style: "margin-top:12px" });
  const nivel = T().id === "a2b1" ? "B1" : "B2";

  const btn = el("button", { class: "btn", type: "button", "data-ai": "1" }, "Generar un texto nuevo");
  btn.addEventListener("click", async () => {
    if (generando) return;
    generando = true;
    btn.setAttribute("disabled", "");
    btn.textContent = "Escribiendo…";
    estado.innerHTML = "";
    estado.append(el("p", { class: "small" }, "Pidiendo el texto y sus preguntas. Suele tardar unos veinte segundos."));

    try {
      const usados = [
        ...T().readings.map(t => t.title),
        ...generados().map(g => g.topic || g.text.title),
      ].slice(-24);
      const bruto = await streamAi("reading", { level: nivel, topic: tema.value.trim(), avoid: usados });
      const g = parsear(bruto, nivel, tema.value.trim());
      generados().unshift(g);
      if (generados().length > 40) P().gen = generados().slice(0, 40);
      save();
      tally("generados");
      abierto = "g:" + g.id;
      sub = "biblioteca";
      // Se publica en la biblioteca común: lo que uno paga, lo leen todos.
      publicar(g).then(ok => { if (ok) toast("Publicado en la biblioteca común"); });
      toast("Texto listo: «" + g.text.title + "»");
      renderInput();
      renderPanel();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    } catch (err: any) {
      estado.innerHTML = "";
      const msg = err instanceof AiError ? aiCopy(err) : (err?.message || "No se pudo generar el texto.");
      estado.append(el("div", { class: "explain", style: "border-left-color:var(--bad);background:var(--bad-soft)" },
        el("span", { class: "tag" }, "No salió"),
        el("span", {}, msg)));
      if (err instanceof AiError && needsAccount(err)) {
        estado.append(el("div", { class: "row", style: "margin-top:10px" },
          el("button", { class: "btn small", type: "button", onclick: () => go("cuenta") }, "Entrar con mi correo")));
      }
    } finally {
      generando = false;
      btn.removeAttribute("disabled");
      btn.textContent = "Generar un texto nuevo";
      refreshAi();
    }
  });

  const box = el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Generar con IA"),
    el("h3", { style: "margin:4px 0 6px" }, "Un texto a tu medida, con sus preguntas"),
    el("p", { class: "small" },
      "Escribe un artículo de nivel " + nivel + " en cuatro párrafos y cinco preguntas tipo examen, con la " +
      "explicación de cada respuesta en español. Se guarda en tu biblioteca, lo puedes releer siempre y, si has " +
      "entrado con tu correo, se publica para todo el mundo: así nadie paga dos veces el mismo texto. Solo gasta " +
      "cuota cuando pulsas el botón."),
    el("div", { class: "row", style: "margin-top:12px;align-items:stretch" },
      el("span", { style: "flex:1;min-width:220px" }, tema), btn),
    aiNote(),
    estado);

  const mios = generados();
  if (mios.length) {
    const lista = el("div", { style: "margin-top:8px" });
    mios.slice(0, 12).forEach(g => lista.append(
      el("div", { class: "row", style: "justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line)" },
        el("div", { style: "flex:1;min-width:0" },
          el("div", { class: "small", style: "font-weight:600" }, g.text.title),
          el("div", { class: "tiny" }, (g.topic || "—") + " · " + new Date(g.made).toLocaleDateString("es"))),
        el("button", {
          class: "btn ghost small", type: "button",
          onclick: () => { abierto = "g:" + g.id; sub = "biblioteca"; renderInput(); },
        }, "Leer"),
        el("button", {
          class: "btn ghost small", type: "button",
          onclick: () => {
            if (!confirm("¿Borrar «" + g.text.title + "»?")) return;
            P().gen = generados().filter(x => x.id !== g.id);
            save();
            renderInput();
          },
        }, "Borrar"))));
    return el("div", {}, box, el("div", { class: "card", style: "margin-top:12px" },
      el("span", { class: "eyebrow" }, "Tus textos generados"),
      el("p", { class: "tiny", style: "margin:4px 0 4px" }, mios.length + " guardados. Se conservan hasta 40."),
      lista));
  }
  return box;
}

/** Saca el JSON de la respuesta aunque venga con explicaciones o vallas alrededor. */
function parsear(bruto: string, nivel: string, tema: string): GenText {
  let txt = bruto.trim();
  const valla = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (valla) txt = valla[1].trim();
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  if (a >= 0 && b > a) txt = txt.slice(a, b + 1);

  let j: any;
  try { j = JSON.parse(txt); } catch { throw new Error("El modelo no devolvió un texto usable. Prueba otra vez."); }

  const body = Array.isArray(j.body) ? j.body.map((x: any) => String(x).trim()).filter(Boolean) : [];
  const qs = Array.isArray(j.qs) ? j.qs : [];
  const limpias = qs
    .filter((q: any) => q && typeof q.q === "string" && Array.isArray(q.o) && q.o.length === 4)
    .map((q: any) => ({
      q: String(q.q),
      o: q.o.map((x: any) => String(x)),
      a: Math.min(3, Math.max(0, Number(q.a) || 0)),
      e: String(q.e || "Sin explicación."),
    }));
  if (body.length < 2 || limpias.length < 3) throw new Error("El texto llegó incompleto. Reintenta.");

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    made: Date.now(),
    level: nivel,
    topic: String(j.topic || tema || "").slice(0, 80),
    text: { title: String(j.title || "Texto generado").slice(0, 140), body, qs: limpias },
  };
}

/* ─────────────── el lector ─────────────── */

function lector(e: Entrada): HTMLElement {
  const box = el("div", { style: "margin-top:16px" });
  const palabras = e.text.body.join(" ").split(/\s+/).length;

  box.append(el("div", { class: "card" },
    el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
      el("span", { class: "eyebrow" },
        (e.compartido ? "De la comunidad · " : e.generado ? "Generado · " : "") +
        palabras + " palabras · ~" + Math.max(1, Math.round(palabras / 180)) + " min"),
      el("span", { class: "chip" },
        veces(e.key) ? "leído " + veces(e.key) + (veces(e.key) === 1 ? " vez" : " veces") : "primera lectura")),
    el("h3", { style: "margin:6px 0 14px;font-size:26px;line-height:1.25" }, e.text.title),
    ...e.text.body.map(p => el("p", { class: "en", style: "margin-bottom:12px;line-height:1.65;max-width:68ch" }, p)),
    el("div", { class: "row", style: "margin-top:10px" },
      el("button", {
        class: "btn ghost small", type: "button",
        onclick: () => {
          marcarLeido(e.key);
          tally("lecturas");
          if (e.sharedId) contarLectura(e.sharedId);
          toast("Lectura contada");
          renderInput();
          renderPanel();
        },
      }, "He terminado de leerlo"),
      hayVoz() ? escucharBtn(e.text.body.join(" ")) : null)));

  box.append(el("h3", { class: "h-sec", style: "margin:22px 0 8px;font-size:20px" }, "Preguntas"));

  e.text.qs.forEach((q, j) => {
    const key = e.key + ":" + j;
    const rec = P().uoe[key];
    box.append(el("div", { class: "sheet", "data-state": rec ? (rec.ok ? "ok" : "bad") : "" },
      el("div", { class: "margin" },
        el("span", { class: "qn" }, String(j + 1)),
        el("span", { class: "glyph" }, rec ? (rec.ok ? "✓" : "✗") : "")),
      el("div", { class: "body" },
        el("div", { class: "qtext" }, q.q),
        el("div", { class: "opts" }, q.o.map((o, k) => el("button", {
          class: "opt", type: "button",
          "data-pick": rec && rec.v === k ? "1" : null,
          "data-res": rec ? (k === q.a ? "ok" : (rec.v === k ? "bad" : null)) : null,
          disabled: rec ? "" : null,
          onclick: () => { P().uoe[key] = { v: k, ok: k === q.a }; save(); bump("read", k === q.a); renderInput(); },
        }, el("span", { class: "k" }, "ABCD"[k]), el("span", {}, o)))),
        rec ? el("div", { class: "explain" }, el("span", { class: "tag" }, "Por qué"), el("span", { html: q.e })) : null)));
  });

  box.append(el("div", { class: "row", style: "margin-top:14px" },
    el("button", {
      class: "btn ghost small", type: "button",
      onclick: () => { e.text.qs.forEach((_q, j) => delete P().uoe[e.key + ":" + j]); save(); renderInput(); },
    }, "Reiniciar las preguntas"),
    el("button", {
      class: "btn ghost small", type: "button",
      onclick: () => { sub = "biblioteca"; renderInput(); window.scrollTo({ top: 0, behavior: "smooth" }); },
    }, "Elegir otro texto")));
  return box;
}

/* ─────────────── estrategia y escucha ─────────────── */

function estrategia(): HTMLElement {
  return el("div", { class: "grid g2" }, T().strategies.map(s => el("div", { class: "card" },
    el("h3", {}, s.t),
    el("ul", { style: "margin:8px 0 0;padding-left:18px" },
      s.b.map(x => el("li", { class: "small", style: "margin-bottom:6px", html: x }))))));
}

/** Oír el texto entero: leer con el audio detrás fija mucho más el ritmo. */
function escucharBtn(texto: string): HTMLElement {
  const btn = el("button", { class: "btn ghost small", type: "button" }, "Escucharlo");
  btn.addEventListener("click", () => {
    if (hablando()) { callar(); btn.textContent = "Escucharlo"; return; }
    btn.textContent = "Parar";
    hablar(texto, {
      rate: 0.95,
      onFin: () => { btn.textContent = "Escucharlo"; },
      onError: m => { toast(m); btn.textContent = "Escucharlo"; },
    });
  });
  return btn;
}
