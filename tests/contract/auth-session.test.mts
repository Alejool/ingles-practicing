/** /api/auth/session: quién soy (GET, y cualquier método salvo POST) y cerrar sesión (POST). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, login, esJsonApi, fila, sha256Hex, dispositivoUnico, ipUnica, ISO, CLAVES_ANON, CLAVES_USUARIO } from "./_lib.mts";

test("GET anónimo → {user:null, quota de anónimo, accounts:true}", async () => {
  const r = await pedir("/api/auth/session", { device: dispositivoUnico(), ip: ipUnica() });
  assert.equal(r.status, 200);
  esJsonApi(r);
  assert.deepEqual(Object.keys(r.body), ["user", "quota", "accounts"]);
  assert.equal(r.body.user, null);
  assert.equal(r.body.accounts, true);
  assert.deepEqual(Object.keys(r.body.quota), CLAVES_ANON);
  const { globalRemaining, spentTodayUsd, ...resto } = r.body.quota;
  assert.deepEqual(resto, { authenticated: false, used: 0, limit: 15, remaining: 15, window: "total", resetsAt: null, budgetUsd: 3 });
  assert.ok(Number.isInteger(globalRemaining) && globalRemaining >= 0);
  assert.equal(typeof spentTodayUsd, "number");
});

test("un token que no existe cuenta como anónimo (no es 401)", async () => {
  const r = await pedir("/api/auth/session", { token: "token-que-no-existe" });
  assert.equal(r.status, 200);
  assert.equal(r.body.user, null);
});

test("GET con sesión → {user:{email}, quota con cuenta, accounts:true}; actualiza last_used_at y last_seen_at", async () => {
  const { correo, token } = await login();
  const antes = await fila(`select last_used_at from sessions where token_hash = $1`, [sha256Hex(token)]);
  await new Promise(r => setTimeout(r, 20));
  const r = await pedir("/api/auth/session", { token });
  assert.equal(r.status, 200);
  esJsonApi(r);
  assert.deepEqual(Object.keys(r.body), ["user", "quota", "accounts"]);
  assert.deepEqual(r.body.user, { email: correo });
  assert.equal(r.body.accounts, true);
  assert.deepEqual(Object.keys(r.body.quota), CLAVES_USUARIO);
  const q = r.body.quota;
  assert.equal(q.authenticated, true);
  assert.equal(q.used, 0);
  assert.equal(q.limit, 60);
  assert.equal(q.remaining, 60);
  assert.equal(q.window, "día");
  assert.match(q.resetsAt, ISO);
  assert.match(q.resetsAt, /T00:00:00\.000Z$/);
  assert.ok(Date.parse(q.resetsAt) - Date.now() <= 86_400_000);
  assert.equal(q.monthlyUsed, 0);
  assert.equal(q.monthlyLimit, 900);
  assert.equal(q.budgetUsd, 3);

  // La actualización no bloquea la respuesta: se espera un poco antes de mirar.
  let despues: any;
  for (let i = 0; i < 20; i++) {
    despues = await fila(
      `select s.last_used_at, u.last_seen_at from sessions s join users u on u.id = s.user_id where s.token_hash = $1`,
      [sha256Hex(token)]);
    if (despues.last_used_at > antes.last_used_at && despues.last_seen_at) break;
    await new Promise(r => setTimeout(r, 50));
  }
  assert.ok(despues.last_used_at > antes.last_used_at, "last_used_at avanza");
  assert.ok(despues.last_seen_at instanceof Date, "last_seen_at puesto");
});

test("PUT se comporta como GET", async () => {
  const { correo, token } = await login();
  const r = await pedir("/api/auth/session", { method: "PUT", token, body: "{}" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.user, { email: correo });
});

test("POST cierra la sesión: {ok:true}, la fila desaparece y el token deja de valer", async () => {
  const { token } = await login();
  const r = await pedir("/api/auth/session", { method: "POST", token });
  assert.equal(r.status, 200);
  esJsonApi(r);
  assert.equal(r.text, '{"ok":true}');
  assert.equal(await fila(`select 1 from sessions where token_hash = $1`, [sha256Hex(token)]), undefined);
  const despues = await pedir("/api/auth/session", { token });
  assert.equal(despues.body.user, null);
});

test("POST sin sesión → {ok:true} igualmente", async () => {
  const r = await pedir("/api/auth/session", { method: "POST" });
  assert.equal(r.status, 200);
  assert.equal(r.text, '{"ok":true}');
});
