/**
 * Selector de ruta: el indicador del lateral y su diálogo.
 *
 * Cambiar de ruta son tres actos —abrir, elegir, confirmar— y la decisión de
 * qué se puede hacer en cada momento la toma `reducir` (`selector-ruta.ts`).
 * Aquí solo se pinta el estado y se lanza el cambio, cuyo orden vive en
 * `secuenciaCambio`: descargar → cerrar lo que hubiera en curso → cambiar.
 * Si la descarga falla no se ha tocado nada.
 */

import { cargarTrack, trackCargada } from "../../data/tracks.ts";
import { S } from "../state";
import { $, $$, el } from "../dom";
import { TRACK_META, metaDe, setTrack } from "../track";
import { abrirDialogo } from "../dialogo";
import type { Dialogo } from "../dialogo";
import { cerrarSesiones, sesionesActivas } from "../sesion";
import { abortarIa, iaEnCurso } from "../ai";
import { callar } from "../voice";
import { pantallaCompleta } from "../pasos";
import {
  ESTADO_INICIAL, avisos, etiquetaIndicador, opciones, reducir, secuenciaCambio, seVaAPerder, textoCasilla,
  textoConfirmar,
} from "../selector-ruta";
import type { Accion, Aviso, Fase, FinCambio } from "../selector-ruta";
import type { TrackId } from "../state";

let estado = ESTADO_INICIAL(S.track);
let dlg: Dialogo | null = null;
/** Quién abrió el diálogo, para devolverle el foco. */
let disparador: HTMLElement | null = null;
/** Rutas que el service worker dice tener enteras; `null` = no ha contestado. */
let enCache: TrackId[] | null = null;

const CLASE_AVISO: Record<Aviso["clase"], string> = { progreso: "aviso", construccion: "aviso warn", sesion: "aviso bad", informa: "aviso warn", ia: "aviso warn" };

export function montarIndicador(): void {
  const host = $("#trackPick");
  if (!host) return;
  const m = metaDe(S.track);
  host.innerHTML = "";
  host.append(el("button", {
    type: "button", id: "rutaBtn", class: "ruta-ind", "aria-haspopup": "dialog",
    "aria-label": etiquetaIndicador(m), onclick: abrirSelector,
  },
    el("span", { class: "tlabel" }, "Tu ruta"),
    el("span", { class: "tname" }, m.name),
    el("span", { class: "ruta-accion" }, "Cambiar")));
}

export function abrirSelector(): void {
  abrir([{ t: "abrir" }]);
}

/** Para quien propone una ruta concreta (el diagnóstico): entra directo a confirmar. */
export function pedirCambioDeRuta(id: TrackId): void {
  abrir([{ t: "abrir" }, { t: "elegir", id }]);
}

function abrir(acciones: Accion[]): void {
  if (estado.fase !== "cerrado") return;
  disparador = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  estado = ESTADO_INICIAL(S.track);
  acciones.forEach(despachar);
  consultarCache();
}

function despachar(a: Accion): void {
  const antes = estado.fase;
  estado = reducir(estado, a, { haySesionQueSePierde: seVaAPerder(sesionesActivas()) });
  if (estado.fase !== antes) pintar(antes);
}

/* ─────────────── pintado ─────────────── */

function pintar(antes: Fase): void {
  if (estado.fase === "cerrado") {
    const d = dlg;
    dlg = null;
    d?.cerrar();
    return;
  }
  if (!dlg) dlg = crear();
  if (estado.fase === "lista") pintarLista();
  else if (estado.fase === "confirmar") pintarConfirmar();
  else pintarCarga(antes);
}

function crear(): Dialogo {
  const d = abrirDialogo({
    titulo: "Elige tu ruta", idTitulo: "rutaT", clase: "dlg-ruta",
    // Durante la descarga no se cierra; en el resto, Escape es cancelar.
    alCancelar: () => { despachar({ t: "cancelar" }); return false; },
    volverA: () => (disparador?.isConnected ? disparador : $("#rutaBtn")),
  });
  // Cierre que no hemos pedido (segundo Escape, gesto de atrás): el cambio se abandona.
  d.raiz.addEventListener("close", () => {
    if (dlg !== d) return;
    dlg = null;
    despachar({ t: "descartar" });
  });
  return d;
}

function titular(texto: string, describe: string | null): void {
  const t = $("#rutaT", dlg!.raiz)!;
  t.textContent = texto;
  if (describe) dlg!.raiz.setAttribute("aria-describedby", describe);
  else dlg!.raiz.removeAttribute("aria-describedby");
  t.focus();
}

function pintarLista(): void {
  const { cuerpo } = dlg!;
  const ops = opciones(TRACK_META, estado.activa, S.tracks, {
    enLinea: navigator.onLine,
    enMemoria: TRACK_META.filter(m => trackCargada(m.id)).map(m => m.id),
    enCache,
  });
  cuerpo.innerHTML = "";
  cuerpo.append(
    el("p", { class: "dlg-nota", id: "rutaNota" },
      "Cada ruta guarda su propio progreso. Elegir una no cambia nada hasta que lo confirmes."),
    el("ul", { class: "ruta-lista" }, ops.map(o => el("li", {}, el("button", {
      type: "button", class: "ruta-op", "data-ruta": o.id,
      "aria-current": o.activa ? "true" : null,
      "aria-disabled": o.disponible ? null : "true",
      "aria-describedby": o.disponible ? null : "rutaNo-" + o.id,
      onclick: () => { if (o.disponible) despachar({ t: "elegir", id: o.id }); },
    },
      el("span", { class: "ruta-cab" },
        el("span", { class: "tname" }, o.name),
        o.activa ? el("span", { class: "chip a" }, "Ruta actual") : null,
        o.marca ? el("span", { class: "chip warn" }, o.marca) : null),
      el("span", { class: "ruta-who" }, o.who),
      el("span", { class: "ruta-exam" }, "Examen: " + o.exam),
      el("span", { class: "ruta-prog" }, "Tu progreso: " + o.progreso),
      o.disponible ? null : el("span", { class: "ruta-no", id: "rutaNo-" + o.id }, "No disponible sin conexión"))))),
    el("div", { class: "dlg-pie" },
      el("button", { type: "button", class: "btn ghost", onclick: () => despachar({ t: "cancelar" }) }, "Cerrar")));
  titular("Elige tu ruta", "rutaNota");
}

function pintarConfirmar(): void {
  const { cuerpo } = dlg!;
  const destino = metaDe(estado.elegida!);
  const sesiones = sesionesActivas();
  const casilla = seVaAPerder(sesiones);

  const ok = el("button", {
    type: "button", class: "btn", id: "rutaOk", "aria-disabled": casilla ? "true" : null,
    onclick: () => {
      despachar({ t: estado.fase === "error" ? "reintentar" : "confirmar" });
      if (estado.fase === "cargando") cambiar();
      else if (estado.fase === "confirmar") {
        $("#rutaEstado", cuerpo)!.textContent = "Marca la casilla para poder cambiar.";
        $("#rutaAcepto", cuerpo)?.focus();
      }
    },
  }, textoConfirmar(destino));

  const acepto = casilla ? el("label", { class: "ruta-acepto" },
    el("input", {
      type: "checkbox", id: "rutaAcepto",
      onchange: (e: Event) => {
        const marcada = (e.target as HTMLInputElement).checked;
        despachar({ t: "aceptar", valor: marcada });
        if (marcada) { ok.removeAttribute("aria-disabled"); $("#rutaEstado", cuerpo)!.textContent = ""; }
        else ok.setAttribute("aria-disabled", "true");
      },
    }),
    el("span", {}, textoCasilla(sesiones))) : null;

  cuerpo.innerHTML = "";
  // Todo va dentro de un `el`, que descarta los `null`; `append` nativo los escribiría.
  cuerpo.append(el("div", {},
    el("div", { id: "rutaAvisos" },
      avisos(metaDe(estado.activa), destino, sesiones, iaEnCurso()).map(a => el("p", { class: CLASE_AVISO[a.clase] }, a.texto))),
    acepto,
    el("p", { class: "ruta-estado", id: "rutaEstado", role: "status" }),
    el("p", { class: "ruta-error", id: "rutaError", role: "alert" }),
    el("div", { class: "dlg-pie" },
      ok,
      el("button", { type: "button", class: "btn ghost", onclick: () => despachar({ t: "volver" }) }, "Elegir otra ruta"),
      el("button", { type: "button", class: "btn ghost", id: "rutaCancel", onclick: () => despachar({ t: "cancelar" }) }, "Cancelar"))));
  titular(textoConfirmar(destino), "rutaAvisos");
}

/** `cargando` y `error` no repintan: cambian el paso de confirmar donde está, para no perder el foco ni los avisos. */
function pintarCarga(antes: Fase): void {
  const { raiz, cuerpo } = dlg!;
  const cargando = estado.fase === "cargando";
  const destino = metaDe(estado.elegida!);
  const ok = $<HTMLButtonElement>("#rutaOk", cuerpo)!;

  $$<HTMLButtonElement | HTMLInputElement>("button, input", cuerpo).forEach(c => { c.disabled = cargando; });
  if (cargando) raiz.setAttribute("aria-busy", "true");
  else raiz.removeAttribute("aria-busy");
  $("#rutaEstado", cuerpo)!.textContent = cargando ? "Descargando " + destino.name + "…" : "";
  $("#rutaError", cuerpo)!.textContent = estado.error ?? "";
  ok.textContent = cargando && antes === "confirmar" ? textoConfirmar(destino) : "Reintentar";
  // Un botón desactivado suelta el foco: se lleva a un sitio que siga dentro del diálogo.
  if (cargando) $("#rutaT", raiz)!.focus();
  else ok.focus();
}

/* ─────────────── el cambio ─────────────── */

/**
 * El cambio de verdad, con sus dependencias reales. `vigente` lo da quien lo
 * pide: deja de ser cierto si ese intento se abandonó. El anuncio «Ruta: …» lo
 * hace el aviso de `main.ts` al repintar.
 */
export function cambiarDeRuta(id: TrackId, vigente: () => boolean): Promise<FinCambio> {
  return secuenciaCambio({
    cargar: () => cargarTrack(id),
    vigente,
    cerrarSesiones,
    abortarIa,
    callar,
    salirDePantallaCompleta: () => pantallaCompleta(false),
    cambiar: () => setTrack(id),
  });
}

/** Cada confirmación es un intento con su número: uno abandonado no puede pintar ni cambiar nada. */
let intento = 0;

async function cambiar(): Promise<void> {
  const id = estado.elegida!;
  const mio = ++intento;
  const r = await cambiarDeRuta(id, () => mio === intento && estado.fase === "cargando" && estado.elegida === id);
  if (mio !== intento) return;
  if (r.fin === "hecho") despachar({ t: "cargada" });
  else if (r.fin === "fallo") {
    console.error("[selector] no se pudo cambiar a la ruta", id, r.error);
    despachar({
      t: "fallo",
      mensaje: "No se pudo descargar " + metaDe(id).name + (navigator.onLine ? "." : ": no hay conexión.")
        + " Sigues en " + metaDe(S.track).name + ".",
    });
  }
}

/* ─────────────── disponibilidad sin conexión ─────────────── */

/** Repinta la lista abierta sin mover el foco de la opción en la que estaba. */
function repintarLista(): void {
  if (estado.fase !== "lista" || !dlg) return;
  const enFoco = (document.activeElement as HTMLElement | null)?.dataset.ruta;
  pintarLista();
  if (enFoco) $(`[data-ruta="${enFoco}"]`, dlg.cuerpo)?.focus();
}

/**
 * Pregunta al service worker qué rutas tiene guardadas. Sin service worker, o
 * si no contesta en 400 ms, se queda en `null` y nada se marca como no disponible.
 */
function consultarCache(): void {
  const sw = navigator.serviceWorker;
  enCache = null;
  if (!sw?.controller) return;
  const oir = (e: MessageEvent) => {
    if (e.data?.type !== "HAS" || !Array.isArray(e.data.tracks)) return;
    fin();
    enCache = TRACK_META.map(m => m.id).filter(id => e.data.tracks.includes(id));
    repintarLista();
  };
  const fin = () => { sw.removeEventListener("message", oir); clearTimeout(limite); };
  const limite = setTimeout(fin, 400);
  sw.addEventListener("message", oir);
  sw.controller.postMessage({ type: "HAS" });
}

window.addEventListener("online", repintarLista);
window.addEventListener("offline", repintarLista);
