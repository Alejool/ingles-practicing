/**
 * Latido anónimo.
 *
 * Una sola pregunta que responder: **¿en qué día del plan se cae la gente?**
 * Sin esto, decidir qué mejorar es adivinar; con esto, si veinte personas
 * abandonan todas en el día 12, algo pasa en el día 12.
 *
 * Lo que NO se guarda: ni correo, ni user_id, ni IP, ni nada que responda. El
 * identificador es un hash con pimienta del id de dispositivo, así que sirve
 * para contar personas distintas y para nada más: no se puede volver atrás
 * hasta quién es, ni cruzar con la tabla de cuentas.
 *
 * Una fila por dispositivo y día, así que mandar el latido de más no infla nada.
 *
 *   POST /api/pulse   { track, planDay, doneDays, streak, seen: ["panel","plan"] }
 */

import { preflight, json, fail, ApiError, readJson, deviceId, sha256Hex } from "./_http.mts";
import { q } from "./_db.mts";

const PISTAS = ["a2b1", "b1b2"];

/** Ids de módulo que aceptamos. Cualquier otra cosa se descarta. */
const MODULOS = new Set([
  "panel", "examenes", "diag", "plan", "gram", "vocab", "mine", "uoe", "writing",
  "input", "speak", "quiz", "mock", "errors", "tutor", "res", "ajustes", "cuenta",
]);

function entero(v: unknown, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    if (req.method !== "POST") throw new ApiError(405, "method_not_allowed", "Método no permitido.");
    if (process.env.PULSE_ENABLED === "false") return json(req, { ok: true, off: true });

    const body = await readJson(req, 8 * 1024);
    const dev = deviceId(req, body);
    if (!dev) return json(req, { ok: true });

    // La misma pimienta que las IP: sin ella el hash no sirve de nada.
    const anon = await sha256Hex(dev + "|pulse|" + (process.env.IP_PEPPER || ""));

    const track = PISTAS.includes(String(body?.track)) ? String(body.track) : "b1b2";
    const planDay = entero(body?.planDay, 1, 200);
    const doneDays = entero(body?.doneDays, 0, 200);
    const streak = entero(body?.streak, 0, 400);
    const seen = (Array.isArray(body?.seen) ? body.seen : [])
      .map((x: unknown) => String(x))
      .filter((x: string) => MODULOS.has(x))
      .slice(0, 20)
      .join(",");

    await q(
      `insert into pulse (anon, day, track, plan_day, done_days, streak, seen)
       values ($1, current_date, $2, $3, $4, $5, $6)
       on conflict (anon, day) do update set
         track = excluded.track,
         plan_day = greatest(pulse.plan_day, excluded.plan_day),
         done_days = greatest(pulse.done_days, excluded.done_days),
         streak = greatest(pulse.streak, excluded.streak),
         seen = excluded.seen,
         updated_at = now()`,
      [anon, track, planDay, doneDays, streak, seen]
    );

    return json(req, { ok: true });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/pulse" };
