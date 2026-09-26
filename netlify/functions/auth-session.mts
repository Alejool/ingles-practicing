/**
 * GET  /api/auth/session · quién soy y cuánta cuota me queda
 * POST /api/auth/logout  · cierra esta sesión
 */

import { preflight, json, fail, clientIp, hashIp, deviceId } from "./_http.mts";
import { currentUser, revokeSession } from "./_auth.mts";
import { readQuota, limits } from "./_quota.mts";

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    if (req.method === "POST") {
      await revokeSession(req);
      return json(req, { ok: true });
    }
    const user = await currentUser(req);
    const quota = await readQuota(user, deviceId(req), await hashIp(clientIp(req)));
    return json(req, { user: user ? { email: user.email } : null, quota, accounts: limits().accountsEnabled });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/auth/session" };
