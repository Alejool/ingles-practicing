/** /api/deepseek: el proxy antiguo, retirado. 410 con cualquier método. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, sinCors, ENV } from "./_lib.mts";

const CUERPO = '{"error":{"code":"gone","message":"Este endpoint ya no existe. Usa /api/ai/chat."}}';

for (const method of ["GET", "POST", "PUT", "DELETE", "OPTIONS"]) {
  test(`${method} /api/deepseek → 410 gone, sin CORS`, async () => {
    const r = await pedir("/api/deepseek", {
      method,
      origin: ENV.ALLOWED_ORIGIN,
      body: method === "POST" || method === "PUT" ? '{"messages":[]}' : undefined,
    });
    assert.equal(r.status, 410);
    assert.equal(r.text, CUERPO);
    assert.equal(r.headers.get("content-type"), "application/json");
    assert.equal(r.headers.get("cache-control"), "no-store");
    sinCors(r.headers);
  });
}
