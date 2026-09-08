/**
 * GET /api/progress  · descarga el progreso guardado
 * PUT /api/progress  · lo sube
 *
 * Control de concurrencia optimista: quien sube manda la `version` que tenía.
 * Si en el servidor hay una más nueva, se responde 409 con los datos actuales
 * y es el cliente quien funde los dos estados y reintenta.
 */

import { preflight, json, fail, ApiError, readJson, num } from "./_http.mts";
import { requireUser } from "./_auth.mts";
import { q, one } from "./_db.mts";

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const user = await requireUser(req);

    if (req.method === "GET") {
      const row = await one<{ data: any; version: number; updated_at: string }>(
        `select data, version, updated_at from progress where user_id = $1`, [user.id]);
      return json(req, row ? { data: row.data, version: row.version, updatedAt: row.updated_at } : { data: null, version: 0, updatedAt: null });
    }

    if (req.method !== "PUT") throw new ApiError(405, "method_not_allowed", "Método no permitido.");

    const maxKb = num("PROGRESS_MAX_KB", 512);
    const body = await readJson(req, maxKb * 1024);
    const data = body?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ApiError(422, "bad_progress", "El progreso enviado no es válido.");
    }
    const base = Number.isFinite(body?.version) ? Number(body.version) : 0;

    const current = await one<{ version: number }>(`select version from progress where user_id = $1`, [user.id]);

    if (!current) {
      const rows = await q<{ version: number; updated_at: string }>(
        `insert into progress (user_id, data, version) values ($1, $2, 1)
         on conflict (user_id) do nothing
         returning version, updated_at`,
        [user.id, JSON.stringify(data)]
      );
      if (rows.length) return json(req, { version: rows[0].version, updatedAt: rows[0].updated_at });
    }

    if (current && base !== current.version) {
      const row = await one<{ data: any; version: number; updated_at: string }>(
        `select data, version, updated_at from progress where user_id = $1`, [user.id]);
      throw new ApiError(409, "version_conflict", "Hay una versión más reciente en el servidor.", {
        server: { data: row?.data ?? null, version: row?.version ?? 0, updatedAt: row?.updated_at ?? null },
      });
    }

    const rows = await q<{ version: number; updated_at: string }>(
      `update progress set data = $2, version = version + 1, updated_at = now()
        where user_id = $1 and version = $3
        returning version, updated_at`,
      [user.id, JSON.stringify(data), base]
    );
    if (!rows.length) throw new ApiError(409, "version_conflict", "Hay una versión más reciente en el servidor.");

    return json(req, { version: rows[0].version, updatedAt: rows[0].updated_at });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/progress" };
