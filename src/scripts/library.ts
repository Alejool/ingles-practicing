/**
 * Biblioteca compartida de lecturas.
 *
 * Los textos que genera cualquiera con IA se publican en el servidor y los ve
 * todo el mundo. Aquí se traen, se guardan en el navegador para poder leerlos
 * sin conexión, y se publica lo que generes tú.
 *
 * No va por `sync.ts` a propósito: esto no es progreso personal sino contenido
 * público de la instalación, así que ni ocupa sitio en el JSON del progreso ni
 * se duplica por persona.
 */

import * as api from "./api";
import { S } from "./state";
import type { GenText, ReadingText, TrackId } from "../data/types";

const CLAVE = "ruta-b1b2-biblioteca";

export interface Compartida {
  id: string;
  created_at: string;
  track: string;
  level: string;
  topic: string;
  title: string;
  words: number;
  data: ReadingText;
  reads: number;
}

interface Cache {
  /** Última vez que se preguntó al servidor, por ruta. */
  vistoEn: Partial<Record<TrackId, string>>;
  textos: Compartida[];
}

/**
 * Un texto de fuera solo entra si tiene la forma correcta.
 *
 * El servidor ya valida al publicar, pero la biblioteca es contenido que
 * escriben otras personas: si algún día llega una fila rara —una versión vieja,
 * algo tocado a mano en la base— no puede tumbar el módulo de lectura entero.
 * Se descarta esa y se sigue.
 */
function sana(t: any): t is Compartida {
  return !!t && typeof t.id === "string" && typeof t.track === "string"
    && !!t.data && typeof t.data === "object"
    && Array.isArray(t.data.body) && t.data.body.length > 0
    && t.data.body.every((p: unknown) => typeof p === "string")
    && Array.isArray(t.data.qs)
    && t.data.qs.every((x: any) => x && typeof x.q === "string" && Array.isArray(x.o) && typeof x.a === "number");
}

function leerCache(): Cache {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return { vistoEn: {}, textos: [] };
    const c = JSON.parse(raw) as Cache;
    return { vistoEn: c.vistoEn || {}, textos: Array.isArray(c.textos) ? c.textos.filter(sana) : [] };
  } catch {
    return { vistoEn: {}, textos: [] };
  }
}

function guardarCache(c: Cache): void {
  // Un tope generoso pero finito: la biblioteca no puede comerse el almacenamiento.
  if (c.textos.length > 200) c.textos = c.textos.slice(0, 200);
  try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin sitio: se seguirá pidiendo al servidor */ }
}

/** Lo que hay guardado de la ruta activa, sin tocar la red. */
export function compartidas(track: TrackId = S.track): Compartida[] {
  return leerCache().textos.filter(t => t.track === track);
}

let pidiendo = false;

/**
 * Trae lo nuevo del servidor. Solo pide lo publicado desde la última vez, así
 * que la llamada habitual devuelve una lista vacía y cuesta nada.
 */
export async function refrescar(track: TrackId = S.track): Promise<number> {
  if (pidiendo || !navigator.onLine) return 0;
  pidiendo = true;
  try {
    const c = leerCache();
    const desde = c.vistoEn[track];
    const url = "/api/readings?track=" + encodeURIComponent(track) + (desde ? "&after=" + encodeURIComponent(desde) : "");
    const res = await api.get(url);
    const nuevos: Compartida[] = (Array.isArray(res?.textos) ? res.textos : []).filter(sana);

    const ids = new Set(c.textos.map(t => t.id));
    let n = 0;
    for (const t of nuevos) {
      if (ids.has(t.id)) continue;
      ids.add(t.id);
      c.textos.unshift(t);
      n++;
    }
    // La marca se mueve al más reciente que hayamos visto, no a "ahora": si el
    // servidor y el reloj local no coinciden, no se pierde nada por el camino.
    const masNuevo = [...nuevos, ...c.textos.filter(t => t.track === track)]
      .map(t => t.created_at)
      .sort()
      .pop();
    if (masNuevo) c.vistoEn[track] = masNuevo;
    guardarCache(c);
    return n;
  } catch {
    return 0; // sin sesión, sin red o servidor caído: se usa lo que haya en caché
  } finally {
    pidiendo = false;
  }
}

/** Publica un texto recién generado para que lo tengan los demás. */
export async function publicar(g: GenText, track: TrackId = S.track): Promise<boolean> {
  if (!api.isSignedIn()) return false;
  try {
    await api.send("/api/readings", "POST", {
      id: g.id, track, level: g.level, topic: g.topic, data: g.text,
    });
    // Que aparezca ya en la biblioteca de quien lo generó, sin esperar al refresco.
    const c = leerCache();
    if (!c.textos.some(t => t.id === g.id)) {
      c.textos.unshift({
        id: g.id, created_at: new Date(g.made).toISOString(), track,
        level: g.level, topic: g.topic, title: g.text.title,
        words: g.text.body.join(" ").split(/\s+/).length, data: g.text, reads: 0,
      });
      guardarCache(c);
    }
    return true;
  } catch {
    return false;
  }
}

/** Suma una lectura al contador. Se ignora si falla: es solo una estadística. */
export function contarLectura(id: string): void {
  if (!navigator.onLine) return;
  api.send("/api/readings?id=" + encodeURIComponent(id) + "&read=1", "POST", {}).catch(() => { /* da igual */ });
}
