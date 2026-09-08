/**
 * GET /api/auth/verify?token=… · consume el enlace y redirige a la app.
 *
 * El token de sesión viaja en el fragmento (#), que no llega al servidor ni
 * queda en los logs del proxy, y la app lo borra de la barra en cuanto lo lee.
 */

import { fail, ApiError, sha256Hex } from "./_http.mts";
import { createSession } from "./_auth.mts";
import { q, one } from "./_db.mts";

function back(hash: string, returnTo?: string | null): Response {
  const base = (returnTo || process.env.APP_URL || "/").replace(/\/+$/, "");
  return new Response(null, { status: 302, headers: { Location: `${base}/#${hash}`, "Cache-Control": "no-store" } });
}

export default async (req: Request): Promise<Response> => {
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    if (!token) return back("auth=error");

    const hash = await sha256Hex(token);
    const row = await one<{ id: string; email: string; return_to: string | null }>(
      `select id, email, return_to from login_tokens
        where token_hash = $1 and used_at is null and expires_at > now()
        limit 1`,
      [hash]
    );
    if (!row) return back("auth=expired");

    await q(`update login_tokens set used_at = now() where id = $1`, [row.id]);

    const users = await q<{ id: string }>(
      `insert into users (email) values ($1)
       on conflict (email) do update set last_seen_at = now()
       returning id`,
      [row.email]
    );
    const userId = users[0].id;

    const { token: session } = await createSession(userId, req.headers.get("user-agent"));
    return back("auth=" + encodeURIComponent(session), row.return_to);
  } catch (e) {
    console.error("[auth] verify", e);
    return back("auth=error");
  }
};

export const config = { path: "/api/auth/verify" };
