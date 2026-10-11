/**
 * Biblioteca compartida de lecturas.
 *
 * Cuando alguien genera un texto con IA, en vez de quedarse en su navegador se
 * guarda aquí y lo ve todo el mundo. Dos efectos: el catálogo crece solo con el
 * uso, y el coste se reparte —veinte personas comparten una generación en vez
 * de pagar veinte—. Es la pieza que hace que compartir la app salga barato.
 *
 *   GET  /api/readings?track=b1b2&after=<iso>   lo que hay (o lo nuevo desde X)
 *   POST /api/readings                          publica una recién generada
 *   POST /api/readings?id=…&read=1              suma una lectura al contador
 *
 * Leer no pide cuenta: es contenido público de la instalación. Publicar sí,
 * porque quien publica ya ha gastado cuota y así hay a quién atribuirlo.
 */

import { preflight, json, fail, ApiError, readJson, num } from "./_http.mts";
import { q } from "./_db.mts";
import { currentUser } from "./_auth.mts";
import { htmlSeguro } from "../../shared/sanitize.ts";
import type { Lectura } from "../../shared/sanitize.ts";

interface Fila {
  id: string;
  created_at: string;
  track: string;
  level: string;
  topic: string;
  title: string;
  words: number;
  data: unknown;
  reads: number;
}

const PISTAS = ["a2b1", "b1b2"];

function limpiar(s: unknown, max: number): string {
  return String(s ?? "").slice(0, max).trim();
}

/**
 * El id lo propone quien publica y acaba en el panel de administración y en
 * las URL del contador: solo se acepta con el alfabeto de los que genera la app.
 */
export function idPublicable(id: unknown): string {
  if (id === undefined || id === null || id === "") {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new ApiError(422, "bad_payload", "El identificador del texto no es válido.");
  }
  return id;
}

/**
 * Comprueba que el texto tiene la forma de una lectura antes de guardarlo.
 *
 * Lo que se guarda no es lo que llegó sino `data`, rehecho solo con los campos
 * conocidos y con la explicación de cada pregunta ya limpia: es el único campo
 * que el cliente pinta como HTML.
 */
export function validar(data: any): { title: string; words: number; data: Lectura } {
  if (!data || typeof data !== "object") throw new ApiError(422, "bad_payload", "Falta el texto.");
  const body: string[] = Array.isArray(data.body) ? data.body.filter((p: unknown) => typeof p === "string" && p.trim()) : [];
  const qs: any[] = Array.isArray(data.qs) ? data.qs : [];
  if (body.length < 2) throw new ApiError(422, "bad_payload", "El texto tiene que traer al menos dos párrafos.");
  if (qs.length < 3) throw new ApiError(422, "bad_payload", "El texto tiene que traer al menos tres preguntas.");
  for (const x of qs) {
    if (!x || typeof x.q !== "string" || !Array.isArray(x.o) || x.o.length !== 4
      || x.o.some((o: unknown) => typeof o !== "string")) {
      throw new ApiError(422, "bad_payload", "Alguna pregunta no tiene cuatro opciones.");
    }
    if (!Number.isInteger(x.a) || x.a < 0 || x.a > 3) {
      throw new ApiError(422, "bad_payload", "Alguna pregunta no marca cuál es la correcta.");
    }
    if (x.e !== undefined && x.e !== null && typeof x.e !== "string") {
      throw new ApiError(422, "bad_payload", "Alguna explicación no es texto.");
    }
  }
  const title = limpiar(data.title, 140) || "Texto generado";
  const words = body.join(" ").split(/\s+/).length;
  if (words > 1500) throw new ApiError(422, "payload_too_large", "El texto es demasiado largo.");
  return {
    title,
    words,
    data: { title, body, qs: qs.map(x => ({ q: x.q, o: x.o, a: x.a, e: htmlSeguro(x.e) })) },
  };
}

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const url = new URL(req.url);
    const track = PISTAS.includes(url.searchParams.get("track") || "") ? url.searchParams.get("track")! : "b1b2";

    if (req.method === "GET") {
      const desde = url.searchParams.get("after");
      const tope = Math.min(200, Math.max(1, num("SHARED_READINGS_MAX", 120)));
      const filas = desde
        ? await q<Fila>(
            `select id, created_at, track, level, topic, title, words, data, reads
               from shared_readings
              where track = $1 and not hidden and created_at > $2::timestamptz
              order by created_at desc limit $3`,
            [track, desde, tope])
        : await q<Fila>(
            `select id, created_at, track, level, topic, title, words, data, reads
               from shared_readings
              where track = $1 and not hidden
              order by created_at desc limit $2`,
            [track, tope]);
      // Caché corta: la biblioteca cambia poco y así no se pega a la base.
      return json(req, { textos: filas }, 200, { "Cache-Control": "public, max-age=120" });
    }

    if (req.method !== "POST") throw new ApiError(405, "method_not_allowed", "Método no permitido.");

    /* Sumar una lectura al contador: no necesita cuenta ni cuerpo. */
    const idLeido = url.searchParams.get("id");
    if (idLeido && url.searchParams.get("read")) {
      await q(`update shared_readings set reads = reads + 1 where id = $1`, [limpiar(idLeido, 64)]);
      return json(req, { ok: true });
    }

    const user = await currentUser(req);
    if (!user) {
      throw new ApiError(401, "not_authenticated", "Entra con tu correo para publicar textos en la biblioteca.");
    }

    const body = await readJson(req, 128 * 1024);
    const { title, words, data } = validar(body?.data);
    const id = idPublicable(body?.id);

    await q(
      `insert into shared_readings (id, track, level, topic, title, words, data, author_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do nothing`,
      [
        id,
        PISTAS.includes(limpiar(body?.track, 8)) ? limpiar(body.track, 8) : track,
        limpiar(body?.level, 8) || "B2",
        limpiar(body?.topic, 120),
        title,
        words,
        JSON.stringify(data),
        user.id,
      ]
    );

    return json(req, { ok: true, id });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/readings" };
