/**
 * CORS. Preflight 204 en cada endpoint que lo tiene, con las cinco cabeceras
 * exactas. `ALLOWED_ORIGINS=https://permitido.example` (contract.env): un origen
 * ajeno, o ninguno, recibe el primero de la lista.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, conCors, sinCors, ENV } from "./_lib.mts";

const CON_PREFLIGHT = [
  "/api/auth/request",
  "/api/auth/session",
  "/api/quota",
  "/api/ai/chat",
  "/api/progress",
  "/api/readings",
  "/api/pulse",
  "/api/admin",
];

for (const ruta of CON_PREFLIGHT) {
  test(`OPTIONS ${ruta} → 204 sin cuerpo y con las cinco cabeceras CORS`, async () => {
    const r = await pedir(ruta, {
      method: "OPTIONS",
      origin: ENV.ALLOWED_ORIGIN,
      headers: { "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
    });
    assert.equal(r.status, 204);
    assert.equal(r.text, "");
    conCors(r.headers);
  });
}

test("preflight: origen ajeno → Allow-Origin con el primero de ALLOWED_ORIGINS", async () => {
  const r = await pedir("/api/quota", { method: "OPTIONS", origin: "https://ajeno.example" });
  assert.equal(r.status, 204);
  conCors(r.headers, ENV.ALLOWED_ORIGIN);
});

test("preflight: sin Origin → Allow-Origin con el primero de ALLOWED_ORIGINS", async () => {
  const r = await pedir("/api/quota", { method: "OPTIONS" });
  assert.equal(r.status, 204);
  conCors(r.headers, ENV.ALLOWED_ORIGIN);
});

test("preflight sin sesión en un endpoint que la exige: 204, no 401", async () => {
  const r = await pedir("/api/progress", { method: "OPTIONS", origin: ENV.ALLOWED_ORIGIN });
  assert.equal(r.status, 204);
});

test("las respuestas JSON normales llevan CORS: origen permitido y ajeno", async () => {
  const ok = await pedir("/api/quota", { origin: ENV.ALLOWED_ORIGIN });
  assert.equal(ok.status, 200);
  conCors(ok.headers, ENV.ALLOWED_ORIGIN);
  const ajeno = await pedir("/api/quota", { origin: "https://ajeno.example" });
  assert.equal(ajeno.status, 200);
  conCors(ajeno.headers, ENV.ALLOWED_ORIGIN);
});

test("los errores JSON de la API también llevan CORS", async () => {
  const r = await pedir("/api/progress", { origin: ENV.ALLOWED_ORIGIN });
  assert.equal(r.status, 401);
  conCors(r.headers);
});

test("/api/auth/verify no tiene preflight: OPTIONS redirige como cualquier método, sin CORS", async () => {
  const r = await pedir("/api/auth/verify", { method: "OPTIONS", origin: ENV.ALLOWED_ORIGIN });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), `${ENV.APP_URL}/#auth=error`);
  sinCors(r.headers);
});
