/**
 * La primera vez.
 *
 * Dieciocho módulos de golpe asustan. Esto es lo que ve quien abre la app por
 * primera vez: elige ruta, contesta diez preguntas y sale colocado en el día
 * que le toca, no en el uno. Tres pantallas y fuera; se puede saltar entera.
 *
 * Vive en una capa por encima de la app, no como un módulo más, porque su
 * trabajo es que no haya que elegir nada más hasta terminarla.
 */

import { S, save, P } from "../state";
import { $, $$, el, esc } from "../dom";
import { T, TRACK_META, metaDe, asegurarRuta } from "../track";
import { setOpenDay } from "../progress";
import { avisos } from "../selector-ruta";
import { cambiarDeRuta } from "./selector";
import type { DiagItem, TrackId } from "../../data/types";

/** ¿Toca enseñarla? Solo si no se ha empezado nada todavía. */
export function haceFalta(): boolean {
  if (S.onboarded) return false;
  const p = S.tracks?.[S.track];
  if (!p) return true;
  const empezado = p.diag?.done || Object.keys(p.days || {}).length > 0 || Object.keys(p.srs || {}).length > 0;
  return !empezado;
}

function terminar(alAcabar: () => void, capa: HTMLElement): void {
  S.onboarded = true;
  save();
  capa.remove();
  document.body.classList.remove("onboarding");
  $(".app")?.removeAttribute("inert");
  alAcabar();
}

/**
 * Diez preguntas repartidas por área y nivel.
 *
 * Se cogen a saltos regulares del diagnóstico completo en vez de al azar, para
 * que siempre salga una muestra pareja de fácil a difícil.
 */
function muestra(items: DiagItem[], n = 10): DiagItem[] {
  if (items.length <= n) return items.slice();
  const paso = items.length / n;
  const out: DiagItem[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(i * paso)]);
  return out;
}

export function montarOnboarding(alAcabar: () => void): void {
  const capa = el("div", { class: "onb", role: "dialog", "aria-modal": "true", "aria-labelledby": "onbT" });
  const caja = el("div", { class: "onb-caja" });
  capa.append(caja);
  document.body.append(capa);
  document.body.classList.add("onboarding");
  // La capa tapa la app: lo de detrás no debe recibir foco ni leerse.
  $(".app")?.setAttribute("inert", "");

  const respuestas: Record<string, number> = {};
  let preguntas: DiagItem[] = [];
  /** La tarjeta pulsada. No pasa a `S.track` hasta que su contenido está cargado. */
  let elegida: TrackId = S.track;

  /** Título del paso: es el nombre de la capa y donde cae el foco al cambiar de paso. */
  function titulo(texto: string, enfocar = true): HTMLElement {
    const h = el("h1", { class: "h-page", id: "onbT", tabindex: "-1", style: "margin:6px 0 8px" }, texto);
    if (enfocar) setTimeout(() => h.focus(), 0);
    return h;
  }

  /**
   * Cambia a `id` si no es ya la activa y sigue con `despues`. Usa la misma
   * secuencia que el selector, que no asigna la ruta hasta tener su contenido.
   * Mientras baja, los botones de la pantalla se bloquean y `estado` lo dice;
   * si falla, el motivo queda en `error` y la ruta activa no se ha movido.
   */
  async function aplicar(id: TrackId, estado: HTMLElement, error: HTMLElement, despues: () => void): Promise<void> {
    if (id === S.track) { despues(); return; }
    const botones = $$<HTMLButtonElement>("button", caja);
    botones.forEach(b => { b.disabled = true; });
    error.textContent = "";
    estado.textContent = "Descargando " + metaDe(id).name + "…";
    const r = await cambiarDeRuta(id, () => capa.isConnected);
    if (r.fin === "hecho") { despues(); return; }
    if (r.fin === "abandonado") return;
    console.error("[bienvenida] no se pudo cargar la ruta", id, r.error);
    botones.forEach(b => { b.disabled = false; });
    estado.textContent = "";
    error.textContent = "No se pudo descargar " + metaDe(id).name + ". Comprueba la conexión y vuelve a intentarlo, o sigue con "
      + metaDe(S.track).name + ", que ya está en este dispositivo.";
  }

  function mensajes(): { estado: HTMLElement; error: HTMLElement } {
    return {
      estado: el("p", { class: "ruta-estado", role: "status" }),
      error: el("p", { class: "ruta-error", role: "alert" }),
    };
  }

  function saltar(antes?: (seguir: () => void) => void): HTMLElement {
    const fin = () => terminar(alAcabar, capa);
    return el("button", {
      class: "btn ghost small", type: "button",
      onclick: () => (antes ? antes(fin) : fin()),
    }, "Saltar y explorar por mi cuenta");
  }

  /* ── 1 · qué ruta ── */
  function bienvenida(): void {
    const { estado, error } = mensajes();
    caja.innerHTML = "";
    caja.append(
      el("span", { class: "eyebrow" }, "Paso 1 de 3"),
      titulo("¿Por dónde empiezas?"),
      el("p", { class: "lede" },
        "Elige la ruta que se parezca más a cómo estás hoy. No te preocupes por acertar: las diez preguntas del " +
        "paso siguiente lo confirman, y puedes cambiarla cuando quieras desde el lateral."));

    const opciones = el("div", { class: "grid g2", style: "margin-top:18px" });
    const marcar = () => $$("button", opciones).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ruta === elegida)));
    TRACK_META.forEach(t => {
      opciones.append(el("button", {
        class: "card onb-op", type: "button", "data-ruta": t.id,
        onclick: () => { elegida = t.id; error.textContent = ""; marcar(); },
      },
        el("span", { class: "eyebrow" }, t.exam),
        el("span", { class: "onb-nombre" }, t.name),
        el("span", { class: "small" }, t.who),
        el("span", { class: "chip a onb-marca" }, "Elegida")));
    });
    marcar();
    caja.append(opciones, estado, error);

    caja.append(el("div", { class: "row", style: "margin-top:20px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => aplicar(elegida, estado, error, test),
      }, "Siguiente: diez preguntas"),
      saltar(seguir => aplicar(elegida, estado, error, seguir))));
  }

  /* ── 2 · diez preguntas ── */
  function test(): void {
    caja.innerHTML = "";
    caja.append(el("p", { class: "small", role: "status" }, "Preparando las preguntas…"));

    asegurarRuta().then(() => {
      preguntas = muestra(T().diag, 10);
      pintarTest(true);
    }).catch(() => {
      caja.innerHTML = "";
      caja.append(
        titulo("No pude cargar el contenido"),
        el("p", { class: "lede" }, "Comprueba la conexión y recarga la página."),
        el("div", { class: "row", style: "margin-top:16px" }, saltar()));
    });
  }

  /** `entrando` = recién llegado al paso: solo entonces el foco va al título. */
  function pintarTest(entrando = false): void {
    const hechas = Object.keys(respuestas).length;
    caja.innerHTML = "";
    caja.append(
      el("span", { class: "eyebrow" }, "Paso 2 de 3"),
      titulo("Diez preguntas y te coloco", entrando),
      el("p", { class: "lede" },
        "Sin diccionario y sin pensarlo mucho. Si no la sabes, elige la que te suene: fallar aquí es información, " +
        "no un problema."),
      el("div", { class: "row", style: "margin:14px 0 4px;gap:10px" },
        el("span", { class: "bar", style: "flex:1" },
          el("i", { style: "width:" + Math.round((hechas / preguntas.length) * 100) + "%" })),
        el("span", { class: "mono tiny" }, hechas + "/" + preguntas.length)));

    preguntas.forEach((it, idx) => {
      const picked = respuestas[it.id];
      caja.append(el("div", { class: "sheet", style: "margin-top:10px" },
        el("div", { class: "margin" }, el("span", { class: "qn" }, String(idx + 1).padStart(2, "0"))),
        el("div", { class: "body" },
          el("div", { class: "row", style: "gap:6px;margin-bottom:7px" },
            el("span", { class: "chip" }, it.area), el("span", { class: "chip a" }, it.lvl)),
          el("div", { class: "qtext", html: esc(it.q).replace(/___/g, '<span class="hl">______</span>') }),
          el("div", { class: "opts" }, it.opts.map((o, i) => el("button", {
            class: "opt", type: "button",
            "data-pick": picked === i ? "1" : null,
            "data-op": idx + ":" + i,
            // Se repinta la caja entera: el foco vuelve a la opción recién elegida.
            onclick: () => { respuestas[it.id] = i; pintarTest(); $(`[data-op="${idx}:${i}"]`, caja)?.focus(); },
          }, el("span", { class: "k" }, "ABCD"[i]), el("span", {}, o)))))));
    });

    caja.append(el("div", { class: "row", style: "margin-top:18px" },
      el("button", {
        class: "btn", type: "button",
        disabled: hechas < preguntas.length ? "" : null,
        onclick: () => { resultado(); },
      }, hechas < preguntas.length ? "Faltan " + (preguntas.length - hechas) : "Ver dónde empiezo"),
      saltar()));
  }

  /* ── 3 · dónde empiezas ── */
  function resultado(): void {
    let aciertos = 0;
    preguntas.forEach(it => { if (respuestas[it.id] === it.a) aciertos++; });
    const pct = Math.round((aciertos / preguntas.length) * 100);

    // La misma escala que el diagnóstico largo, para que no se contradigan.
    const semana = pct < 50 ? 1 : pct < 65 ? 4 : pct < 78 ? 9 : 13;
    const dia = (semana - 1) * 5 + 1;

    const otra: TrackId | null =
      S.track === "a2b1" && pct >= 90 ? "b1b2"
        : S.track === "b1b2" && pct < 30 ? "a2b1"
          : null;

    caja.innerHTML = "";
    caja.append(
      el("span", { class: "eyebrow" }, "Paso 3 de 3"),
      titulo(aciertos + " de " + preguntas.length + " · empiezas en la semana " + semana),
      el("p", { class: "lede" },
        pct < 50 ? "Vamos desde el principio, sin saltarnos nada. Es lo que más rápido se nota."
          : pct < 65 ? "Tienes base, pero con agujeros. Te salto las primeras semanas y empezamos por lo que flojea."
            : pct < 78 ? "Base sólida. Te coloco donde empieza lo que de verdad te separa del siguiente nivel."
              : "Vas bien. Empiezas directamente en la parte de precisión y formato de examen."),
      el("div", { class: "row", style: "margin-top:12px" },
        el("span", { class: "chip a" }, T().name),
        el("span", { class: "chip" }, "Día " + dia + " de 120"),
        el("span", { class: "chip" }, "45 min al día, 5 días por semana")));

    if (otra) {
      const { estado, error } = mensajes();
      const [progreso] = avisos(metaDe(S.track), metaDe(otra), [], false);
      caja.append(el("div", { class: "explain", style: "margin-top:14px" },
        el("span", { class: "tag" }, "Una cosa"),
        el("p", {}, otra === "b1b2"
          ? "Con este resultado la ruta A2 → B1 se te va a quedar corta enseguida."
          : "Con este resultado conviene afianzar la base antes de meterse en B2."),
        el("p", { class: "small", style: "margin-top:6px" },
          progreso.texto + " Si la pruebas, contestas otras diez preguntas de esa ruta."),
        estado, error,
        el("button", {
          class: "btn small", style: "margin-top:10px", type: "button",
          onclick: () => aplicar(otra, estado, error, () => {
            elegida = otra;
            Object.keys(respuestas).forEach(k => delete respuestas[k]);
            test();
          }),
        }, "Probar la ruta " + metaDe(otra).name)));
    }

    caja.append(el("div", { class: "row", style: "margin-top:20px" },
      el("button", {
        class: "btn", type: "button",
        onclick: () => {
          // El resultado se guarda como diagnóstico hecho, con su nota real.
          const p = P();
          p.diag = { answers: { ...respuestas }, done: false, score: { right: aciertos, pct } };
          p.stats.diag = { ok: aciertos, n: preguntas.length };
          setOpenDay(dia);
          save();
          terminar(alAcabar, capa);
        },
      }, "Empezar por el día " + dia),
      el("button", {
        class: "btn ghost", type: "button",
        onclick: () => { setOpenDay(1); save(); terminar(alAcabar, capa); },
      }, "Prefiero empezar por el día 1")));

    caja.append(el("p", { class: "tiny", style: "margin-top:14px" },
      "Esto es una estimación con diez preguntas. En el módulo 02 tienes el diagnóstico completo cuando quieras " +
      "afinarlo."));
  }

  bienvenida();
}
