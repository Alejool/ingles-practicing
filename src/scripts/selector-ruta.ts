/**
 * La lógica del selector de ruta, sin DOM.
 *
 * Qué texto lleva cada ruta y qué avisos se leen antes de confirmar. Quien
 * pinta (`views/selector.ts`) solo traduce esto a elementos. Al no tocar el
 * DOM ni el almacenamiento, se prueba entero con `npm test`.
 */

import type { TrackMeta } from "../data/tracks.ts";
import type { SesionActiva } from "./sesion.ts";
import type { TrackId, TrackProgress } from "./state.ts";

/** `disponibles` (semanas publicadas) llega a `TrackMeta` con la ruta B2 → C1; aquí solo se lee. */
export type MetaRuta = TrackMeta & { disponibles?: number };

const SEMANAS_RUTA = 24;
const DIAS_POR_SEMANA = 5;

/** El primer día sin hacer; con todos hechos, el último. */
export function diaActual(dias: Record<string, boolean>, totalDias: number): number {
  for (let d = 1; d <= totalDias; d++) if (!dias[d]) return d;
  return totalDias;
}

/** "día 37 de 120", o "sin empezar" si en la ruta no hay nada hecho en ningún módulo. */
export function resumenProgreso(p: Partial<TrackProgress> | undefined, totalDias: number): string {
  const dias = p?.days ?? {};
  const hay = (o: object | undefined) => Object.keys(o ?? {}).length > 0;
  const empezada = Object.values(dias).some(Boolean)
    || hay(p?.srs)
    || !!p?.diag?.done
    || hay(p?.diag?.answers)
    || Object.values(p?.gram ?? {}).some(hay)
    || hay(p?.uoe)
    || hay(p?.read)
    || (p?.mock?.history.length ?? 0) > 0
    || (p?.quiz?.history.length ?? 0) > 0
    || Object.values(p?.writing ?? {}).some(w => w.text.trim() !== "");
  return empezada ? `día ${diaActual(dias, totalDias)} de ${totalDias}` : "sin empezar";
}

/** "En construcción · 4 de 24 semanas" en una ruta incompleta; `null` en una completa. */
export function marcaConstruccion(meta: MetaRuta): string | null {
  return meta.disponibles ? `En construcción · ${meta.disponibles} de ${SEMANAS_RUTA} semanas` : null;
}

/** Nombre accesible del indicador: qué es, qué valor tiene y qué hace al pulsarlo. */
export function etiquetaIndicador(meta: MetaRuta): string {
  return `Ruta actual: ${meta.name}. Cambiar de ruta`;
}

/* ─────────────── máquina de estados ─────────────── */

export type Fase = "cerrado" | "lista" | "confirmar" | "cargando" | "error";

/** Estado del diálogo. Vive en memoria: lo único que se guarda es la ruta, y lo hace `setTrack`. */
export interface EstadoSelector {
  fase: Fase;
  activa: TrackId;
  elegida: TrackId | null;
  /** Casilla «entiendo que se pierde…» marcada. */
  aceptaPerder: boolean;
  error: string | null;
}

export type Accion =
  | { t: "abrir" } | { t: "elegir"; id: TrackId } | { t: "volver" }
  | { t: "aceptar"; valor: boolean } | { t: "confirmar" }
  | { t: "cargada" } | { t: "fallo"; mensaje: string }
  | { t: "reintentar" } | { t: "cancelar" }
  /** El navegador cerró el diálogo por su cuenta (segundo Escape, gesto de atrás). */
  | { t: "descartar" };

export const ESTADO_INICIAL = (activa: TrackId): EstadoSelector =>
  ({ fase: "cerrado", activa, elegida: null, aceptaPerder: false, error: null });

/**
 * Cada fase atiende solo sus acciones y deja pasar las demás sin cambiar nada:
 * por eso un clic suelto no cambia de ruta y un segundo clic durante la carga
 * no lanza otro cambio. `activa` solo cambia con `cargada`.
 *
 * `descartar` es la excepción: si el diálogo ya no está en pantalla, el cambio
 * se abandona en cualquier fase. Una carga que termine después cae en `cerrado`
 * y se ignora: nunca se cambia de ruta a espaldas de quien cerró.
 */
export function reducir(e: EstadoSelector, a: Accion, ctx: { haySesionQueSePierde: boolean }): EstadoSelector {
  if (a.t === "descartar") return ESTADO_INICIAL(e.activa);
  switch (e.fase) {
    case "cerrado":
      return a.t === "abrir" ? { ...e, fase: "lista" } : e;
    case "lista":
      if (a.t === "cancelar") return ESTADO_INICIAL(e.activa);
      if (a.t === "elegir") return a.id === e.activa ? ESTADO_INICIAL(e.activa) : { ...e, fase: "confirmar", elegida: a.id };
      return e;
    case "confirmar":
      if (a.t === "cancelar") return ESTADO_INICIAL(e.activa);
      if (a.t === "volver") return { ...ESTADO_INICIAL(e.activa), fase: "lista" };
      if (a.t === "aceptar") return { ...e, aceptaPerder: a.valor };
      if (a.t === "confirmar") return ctx.haySesionQueSePierde && !e.aceptaPerder ? e : { ...e, fase: "cargando" };
      return e;
    case "cargando":
      if (a.t === "cargada") return e.elegida ? ESTADO_INICIAL(e.elegida) : e;
      if (a.t === "fallo") return { ...e, fase: "error", error: a.mensaje };
      return e;
    case "error":
      if (a.t === "cancelar") return ESTADO_INICIAL(e.activa);
      if (a.t === "reintentar") return { ...e, fase: "cargando", error: null };
      if (a.t === "volver") return { ...ESTADO_INICIAL(e.activa), fase: "lista" };
      return e;
  }
}

/* ─────────────── lo que se pinta ─────────────── */

export interface OpcionRuta {
  id: TrackId;
  name: string;
  who: string;
  exam: string;
  activa: boolean;
  /** "día 37 de 120" | "sin empezar" */
  progreso: string;
  /** "En construcción · 4 de 24 semanas" | null */
  marca: string | null;
  /** false = no descargada y sin conexión. */
  disponible: boolean;
}

/**
 * Las rutas tal como las enseña la lista. `enCache` es lo que contesta el
 * service worker; `null` significa que no contestó, y entonces nada se da por
 * no disponible: si luego la descarga falla, se dice en ese momento.
 */
export function opciones(
  metas: MetaRuta[], activa: TrackId, tracks: Record<string, Partial<TrackProgress>>,
  disp: { enLinea: boolean; enMemoria: TrackId[]; enCache: TrackId[] | null },
): OpcionRuta[] {
  return metas.map(m => ({
    id: m.id, name: m.name, who: m.who, exam: m.exam,
    activa: m.id === activa,
    progreso: resumenProgreso(tracks[m.id], (m.disponibles ?? SEMANAS_RUTA) * DIAS_POR_SEMANA),
    marca: marcaConstruccion(m),
    disponible: disp.enLinea || disp.enMemoria.includes(m.id) || !disp.enCache || disp.enCache.includes(m.id),
  }));
}

/** `sesion` = algo en curso que se pierde; `informa` = algo en curso que se retoma después. */
export interface Aviso { clase: "progreso" | "construccion" | "sesion" | "informa" | "ia"; texto: string }

/** Lo que se lee antes del botón de confirmar, en el orden en que se lee. */
export function avisos(origen: MetaRuta, destino: MetaRuta, sesiones: SesionActiva[], iaEnCurso: boolean): Aviso[] {
  const lista: Aviso[] = [
    { clase: "progreso", texto: `Vas a cambiar a ${destino.name}. Tu progreso en ${origen.name} se queda como está: cada ruta lleva el suyo y puedes volver cuando quieras.` },
    { clase: "progreso", texto: "La racha, el cuaderno de errores y los ajustes son los mismos en todas las rutas." },
  ];
  if (destino.disponibles) {
    lista.push({ clase: "construccion", texto: `${destino.name} está en construcción: tiene ${destino.disponibles} de ${SEMANAS_RUTA} semanas.` });
  }
  for (const s of sesiones) {
    if (s.tipo === "ia") continue;
    lista.push({ clase: s.pierde ? "sesion" : "informa", texto: [`Tienes en curso: ${s.nombre}.`, s.pierde, s.conserva].filter(Boolean).join(" ") });
  }
  if (iaEnCurso || sesiones.some(s => s.tipo === "ia")) {
    lista.push({ clase: "ia", texto: "Hay una respuesta de la IA en camino y se cancela al cambiar. El texto que ya está guardado se conserva." });
  }
  return lista;
}

/** ¿Hay algo en curso que no se recupera? Si lo hay, confirmar exige la casilla. */
export function seVaAPerder(sesiones: SesionActiva[]): boolean {
  return sesiones.some(s => s.pierde !== "");
}

/** Texto de la casilla: nombra las sesiones que pierden algo. */
export function textoCasilla(sesiones: SesionActiva[]): string {
  const nombres = sesiones.filter(s => s.pierde !== "").map(s => s.nombre);
  const ultimo = nombres.pop();
  return "Entiendo que pierdo lo que tengo a medias en " + (nombres.length ? nombres.join(", ") + " y " + ultimo : ultimo);
}

/** El día del plan está a medias: hay pasos marcados y quedan pasos por marcar. */
export function planAMedias(pasosMarcados: number, total: number): boolean {
  return pasosMarcados > 0 && pasosMarcados < total;
}

/** Lo que hace falta para cambiar de ruta, inyectado: así el orden se prueba sin DOM. */
export interface PasosCambio {
  /** Descarga el contenido de la ruta de destino. */
  cargar: () => Promise<unknown>;
  /** ¿Sigue siendo este el intento en curso? Falso si se cerró o se lanzó otro. */
  vigente: () => boolean;
  cerrarSesiones: () => void;
  abortarIa: () => void;
  callar: () => void;
  salirDePantallaCompleta: () => void;
  /** Asigna la ruta activa y repinta. */
  cambiar: () => Promise<void>;
}

export type FinCambio = { fin: "hecho" } | { fin: "abandonado" } | { fin: "fallo"; error: unknown };

/**
 * El cambio de ruta, en su orden: descargar → cerrar lo que hubiera en curso →
 * cambiar. Nada se cierra ni se asigna antes de tener el contenido, así que un
 * fallo de descarga deja la ruta anterior y su tanda intactas. Un intento que
 * ya no es el vigente termina sin tocar nada y sin informar de su fallo.
 */
export async function secuenciaCambio(p: PasosCambio): Promise<FinCambio> {
  try {
    await p.cargar();
  } catch (error) {
    return p.vigente() ? { fin: "fallo", error } : { fin: "abandonado" };
  }
  if (!p.vigente()) return { fin: "abandonado" };
  try {
    p.cerrarSesiones();
    p.abortarIa();
    p.callar();
    p.salirDePantallaCompleta();
    await p.cambiar();
  } catch (error) {
    return { fin: "fallo", error };
  }
  return { fin: "hecho" };
}

/** El botón de confirmar nombra el destino: "Cambiar a B2 → C1". */
export function textoConfirmar(destino: MetaRuta): string {
  return `Cambiar a ${destino.name}`;
}
