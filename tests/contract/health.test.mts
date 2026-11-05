/** /healthz: lo responde el servidor, no la API (sin CORS ni preflight). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, sinCors, ENV } from "./_lib.mts";

for (const method of ["GET", "POST", "OPTIONS"]) {
  test(`${method} /healthz → 200 {"ok":true}, JSON sin charset, no-store, sin CORS`, async () => {
    const r = await pedir("/healthz", { method, origin: ENV.ALLOWED_ORIGIN });
    assert.equal(r.status, 200);
    assert.equal(r.text, '{"ok":true}');
    assert.equal(r.headers.get("content-type"), "application/json");
    assert.equal(r.headers.get("cache-control"), "no-store");
    sinCors(r.headers);
    assert.equal(r.headers.get("vary"), null);
  });
}
