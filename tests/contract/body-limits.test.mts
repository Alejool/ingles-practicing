/**
 * Tope global de cuerpo del servidor: más de 2 MB → 500 server_error, antes de
 * llegar al endpoint (antes incluso de mirar la sesión). Es el comportamiento
 * de `server/index.mts`: JSON sin charset, sin `no-store` ni CORS.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, esError, sinCors, dispositivoUnico } from "./_lib.mts";

const DOS_MB = 2 * 1024 * 1024;

for (const ruta of ["/api/pulse", "/api/progress", "/api/ai/chat", "/api/auth/request"]) {
  test(`POST ${ruta} con más de 2 MB → 500 server_error`, async () => {
    const r = await pedir(ruta, { method: ruta === "/api/progress" ? "PUT" : "POST", body: "a".repeat(DOS_MB + 1) });
    esError(r, 500, "server_error", "Error interno");
    assert.equal(r.text, '{"error":{"code":"server_error","message":"Error interno"}}');
    assert.equal(r.headers.get("content-type"), "application/json");
    assert.equal(r.headers.get("cache-control"), null);
    sinCors(r.headers);
  });
}

test("justo 2 MB pasa el tope del servidor y lo para el del endpoint (413)", async () => {
  const relleno = "a".repeat(DOS_MB - 40);
  const r = await pedir("/api/pulse", { body: JSON.stringify({ x: relleno }), device: dispositivoUnico() });
  esError(r, 413, "payload_too_large", "El texto enviado es demasiado largo.");
});

test("el tope cuenta bytes: 1,1 M de 'ñ' (2,2 MB en UTF-8) → 500", async () => {
  const r = await pedir("/api/pulse", { body: JSON.stringify({ x: "ñ".repeat(1_100_000) }) });
  esError(r, 500, "server_error");
});
