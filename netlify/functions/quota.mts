/** GET /api/quota · cuánto le queda a quien pregunta. */

import { preflight, json, fail, clientIp, hashIp, deviceId } from "./_http.mts";
import { currentUser } from "./_auth.mts";
import { readQuota, limits } from "./_quota.mts";

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const user = await currentUser(req);
    const state = await readQuota(user, deviceId(req), await hashIp(clientIp(req)));
    return json(req, { quota: state, user: user ? { email: user.email } : null, accounts: limits().accountsEnabled });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/quota" };
