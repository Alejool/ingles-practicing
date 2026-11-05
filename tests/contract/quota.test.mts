/** /api/quota: cuánto le queda a quien pregunta. Cualquier método; sesión opcional. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, login, esJsonApi, dispositivoUnico, ipUnica, ISO, CLAVES_ANON, CLAVES_USUARIO } from "./_lib.mts";

test("anónimo: {quota, user:null, accounts} en ese orden; forma exacta de quota", async () => {
  const r = await pedir("/api/quota", { device: dispositivoUnico(), ip: ipUnica() });
  assert.equal(r.status, 200);
  esJsonApi(r);
  assert.deepEqual(Object.keys(r.body), ["quota", "user", "accounts"]);
  assert.equal(r.body.user, null);
  assert.equal(r.body.accounts, true);
  const q = r.body.quota;
  assert.deepEqual(Object.keys(q), CLAVES_ANON);
  assert.equal(q.authenticated, false);
  assert.equal(q.used, 0);
  assert.equal(q.limit, 15);
  assert.equal(q.remaining, 15);
  assert.equal(q.window, "total");
  assert.equal(q.resetsAt, null);
  assert.ok(Number.isInteger(q.globalRemaining) && q.globalRemaining > 0 && q.globalRemaining <= 6000);
  assert.equal(typeof q.spentTodayUsd, "number");
  assert.ok(q.spentTodayUsd >= 0);
  assert.equal(q.budgetUsd, 3);
});

test("anónimo sin dispositivo: igual forma (cuenta solo la IP)", async () => {
  const r = await pedir("/api/quota", { ip: ipUnica() });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body.quota), CLAVES_ANON);
  assert.equal(r.body.quota.used, 0);
});

test("un X-Device-Id con formato no válido se ignora", async () => {
  const r = await pedir("/api/quota", { ip: ipUnica(), device: "corto" });
  assert.equal(r.status, 200);
  assert.equal(r.body.quota.used, 0);
});

test("con cuenta: forma exacta con monthlyUsed/monthlyLimit y ventana diaria", async () => {
  const { correo, token } = await login();
  const r = await pedir("/api/quota", { token });
  assert.equal(r.status, 200);
  esJsonApi(r);
  assert.deepEqual(Object.keys(r.body), ["quota", "user", "accounts"]);
  assert.deepEqual(r.body.user, { email: correo });
  const q = r.body.quota;
  assert.deepEqual(Object.keys(q), CLAVES_USUARIO);
  assert.equal(q.authenticated, true);
  assert.equal(q.used, 0);
  assert.equal(q.limit, 60);
  assert.equal(q.remaining, 60);
  assert.equal(q.window, "día");
  assert.match(q.resetsAt, ISO);
  const manana = new Date();
  manana.setUTCHours(24, 0, 0, 0);
  assert.equal(q.resetsAt, manana.toISOString());
  assert.equal(q.monthlyUsed, 0);
  assert.equal(q.monthlyLimit, 900);
  assert.ok(Number.isInteger(q.globalRemaining));
  assert.equal(typeof q.spentTodayUsd, "number");
  assert.equal(q.budgetUsd, 3);
});

for (const method of ["POST", "PUT", "DELETE"]) {
  test(`${method} responde igual que GET`, async () => {
    const r = await pedir("/api/quota", { method, ip: ipUnica() });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body), ["quota", "user", "accounts"]);
  });
}
