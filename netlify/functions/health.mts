/**
 * GET /healthz · ¿está viva la app y llega a la base de datos?
 *
 * Es lo primero que se mira tras un despliegue y lo que vigila un uptime
 * externo. Va como función —y no solo dentro de `server/index.mts`— para que
 * responda igual en Docker, en Netlify y en Vercel.
 */

import { preflight, json } from "./_http.mts";
import { q } from "./_db.mts";

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    await q("select 1", []);
    return json(req, { ok: true });
  } catch {
    // 503 a propósito: así un monitor externo lo cuenta como caída.
    return json(req, { ok: false, db: false }, 503);
  }
};

export const config = { path: "/healthz" };
