/** Sesiones por token portador (bearer). Solo guardamos hashes. */

import { q, one } from "./_db.mts";
import { ApiError, sha256Hex, randomToken, num } from "./_http.mts";

export interface SessionUser {
  id: string;
  email: string;
  daily_bonus: number;
  blocked: boolean;
}

export async function createSession(userId: string, userAgent: string | null): Promise<{ token: string; expiresAt: string }> {
  const token = randomToken(32);
  const hash = await sha256Hex(token);
  const days = num("SESSION_DAYS", 60);
  const rows = await q<{ expires_at: string }>(
    `insert into sessions (user_id, token_hash, expires_at, user_agent)
     values ($1, $2, now() + ($3 || ' days')::interval, $4)
     returning expires_at`,
    [userId, hash, String(days), (userAgent || "").slice(0, 300)]
  );
  return { token, expiresAt: rows[0].expires_at };
}

/** Resuelve el usuario del header Authorization. Devuelve null si no hay sesión válida. */
export async function currentUser(req: Request): Promise<SessionUser | null> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const hash = await sha256Hex(m[1].trim());
  const row = await one<SessionUser>(
    `select u.id, u.email, u.daily_bonus, u.blocked
       from sessions s
       join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()
      limit 1`,
    [hash]
  );
  if (!row) return null;
  if (row.blocked) throw new ApiError(403, "account_blocked", "Esta cuenta está bloqueada.");
  // Se actualiza sin bloquear la respuesta si falla.
  q(`update sessions set last_used_at = now() where token_hash = $1`, [hash]).catch(() => {});
  q(`update users set last_seen_at = now() where id = $1`, [row.id]).catch(() => {});
  return row;
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const u = await currentUser(req);
  if (!u) throw new ApiError(401, "not_authenticated", "Inicia sesión para continuar.");
  return u;
}

export async function revokeSession(req: Request): Promise<void> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return;
  await q(`delete from sessions where token_hash = $1`, [await sha256Hex(m[1].trim())]);
}

export function normaliseEmail(raw: unknown): string {
  const email = String(raw || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || email.length > 200) {
    throw new ApiError(422, "bad_email", "Ese correo no parece válido.");
  }
  return email;
}
