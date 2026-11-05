/** Cualquier /api/* desconocida: 404 sin CORS, también en preflight. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, sinCors, ENV } from "./_lib.mts";

const CUERPO = '{"error":{"code":"not_found","message":"Endpoint desconocido"}}';

for (const [method, ruta] of [
  ["GET", "/api/xyz"],
  ["POST", "/api/xyz"],
  ["OPTIONS", "/api/xyz"],
  ["GET", "/api/auth"],
  ["GET", "/api/progress/1"],
  ["GET", "/api/"],
] as const) {
  test(`${method} ${ruta} → 404 not_found`, async () => {
    const r = await pedir(ruta, { method, origin: ENV.ALLOWED_ORIGIN, body: method === "POST" ? "{}" : undefined });
    assert.equal(r.status, 404);
    assert.equal(r.text, CUERPO);
    assert.equal(r.headers.get("content-type"), "application/json");
    assert.equal(r.headers.get("cache-control"), "no-store");
    sinCors(r.headers);
  });
}
