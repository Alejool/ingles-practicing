/**
 * POST /api/auth/request · manda el enlace mágico.
 *
 * Responde siempre lo mismo, exista o no la cuenta: así nadie puede usar este
 * endpoint para averiguar qué correos están registrados.
 */

import { preflight, json, fail, ApiError, clientIp, hashIp, readJson, sha256Hex, randomToken, num, safeReturnTo } from "./_http.mts";
import { normaliseEmail } from "./_auth.mts";
import { q, scalar } from "./_db.mts";
import { limits } from "./_quota.mts";
import { sendLoginLink, deliveryMode } from "./_mail.mts";

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    if (req.method !== "POST") throw new ApiError(405, "method_not_allowed", "Método no permitido.");
    // Publicada sin correo: no hay cuentas que crear, y decirlo claro es mejor
    // que aceptar el correo y no mandar nada.
    if (!limits().accountsEnabled) {
      throw new ApiError(404, "accounts_off",
        "Esta instalación no usa cuentas: se estudia sin registrarse y el progreso se guarda en tu dispositivo.");
    }
    const body = await readJson(req, 4096);
    const email = normaliseEmail(body?.email);
    const ipHash = await hashIp(clientIp(req));
    const minutes = num("LOGIN_LINK_MINUTES", 15);

    const perEmail = Number(await scalar(
      `select count(*)::int from login_tokens where email = $1 and created_at > now() - interval '1 hour'`, [email])) || 0;
    const perIp = Number(await scalar(
      `select count(*)::int from login_tokens where ip_hash = $1 and created_at > now() - interval '1 hour'`, [ipHash])) || 0;
    if (perEmail >= num("LOGIN_MAX_PER_EMAIL_HOUR", 4) || perIp >= num("LOGIN_MAX_PER_IP_HOUR", 12)) {
      throw new ApiError(429, "too_many_links", "Se han pedido demasiados enlaces. Espera una hora.");
    }

    const token = randomToken(32);
    // El origen desde el que se pidió: así en desarrollo se vuelve a :4321.
    const returnTo = safeReturnTo(req.headers.get("origin"));
    await q(
      `insert into login_tokens (email, token_hash, expires_at, ip_hash, return_to)
       values ($1, $2, now() + ($3 || ' minutes')::interval, $4, $5)`,
      [email, await sha256Hex(token), String(minutes), ipHash, returnTo]
    );

    const appUrl = (returnTo || process.env.APP_URL || "").replace(/\/+$/, "");
    const link = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;

    try {
      await sendLoginLink({ to: email, link, minutes });
    } catch (err) {
      console.error("[auth] no se pudo enviar el correo", err);
      throw new ApiError(502, "mail_failed", "No se pudo enviar el correo. Inténtalo en un momento.");
    }

    // Limpieza barata y oportunista.
    q(`delete from login_tokens where expires_at < now() - interval '1 day'`, []).catch(() => {});

    const delivery = deliveryMode();
    return json(req, { ok: true, minutes, delivery: delivery.mode, mailboxUrl: delivery.mailboxUrl });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/auth/request" };
