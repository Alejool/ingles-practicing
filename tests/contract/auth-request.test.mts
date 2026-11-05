/** POST /api/auth/request: pide el enlace mágico. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pedir, esError, esJsonApi, fila, consulta, correoUnico, ipUnica, esperarCorreo, tokenDeEnlace, hashIp, sha256Hex,
  ENV,
} from "./_lib.mts";

test("GET → 405 method_not_allowed", async () => {
  const r = await pedir("/api/auth/request");
  esError(r, 405, "method_not_allowed", "Método no permitido.");
  esJsonApi(r);
});

test("cuerpo de más de 4096 caracteres → 413 payload_too_large", async () => {
  const r = await pedir("/api/auth/request", { body: JSON.stringify({ email: correoUnico(), x: "a".repeat(4100) }) });
  esError(r, 413, "payload_too_large", "El texto enviado es demasiado largo.");
  esJsonApi(r);
});

test("JSON inválido → 400 bad_json", async () => {
  const r = await pedir("/api/auth/request", { body: "{email:" });
  esError(r, 400, "bad_json", "JSON inválido.");
  esJsonApi(r);
});

for (const email of [undefined, "", "   ", "sin-arroba", "a@b", "a@b.c", "a b@c.com", "a@b.c0m", `${"a".repeat(195)}@x.com`, 42]) {
  test(`correo no válido (${JSON.stringify(email)?.slice(0, 30)}) → 422 bad_email`, async () => {
    const r = await pedir("/api/auth/request", { json: { email } });
    esError(r, 422, "bad_email", "Ese correo no parece válido.");
    esJsonApi(r);
  });
}

test("cuerpo vacío → 422 bad_email (cuenta como {})", async () => {
  const r = await pedir("/api/auth/request", { body: "" });
  esError(r, 422, "bad_email", "Ese correo no parece válido.");
});

test("200 {ok, minutes, delivery, mailboxUrl}; correo normalizado; token guardado como hash; correo enviado", async () => {
  const correo = correoUnico();
  const ip = ipUnica();
  const r = await pedir("/api/auth/request", { ip, json: { email: `  ${correo.toUpperCase()} ` } });
  assert.equal(r.status, 200, r.text);
  esJsonApi(r);
  assert.deepEqual(Object.keys(r.body), ["ok", "minutes", "delivery", "mailboxUrl"]);
  assert.deepEqual(r.body, { ok: true, minutes: 15, delivery: "mailbox", mailboxUrl: "http://localhost:8025" });

  const correoRecibido = await esperarCorreo(correo);
  assert.equal(correoRecibido.subject, "Tu acceso a Ruta B1 → B2");
  assert.ok(correoRecibido.text.includes(`${ENV.APP_URL}/api/auth/verify?token=`), correoRecibido.text);
  assert.ok(correoRecibido.text.includes("Caduca en 15 minutos y solo funciona una vez."));
  const token = tokenDeEnlace(correoRecibido.text);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);

  const t = await fila(
    `select email, token_hash, ip_hash, return_to, used_at,
            round(extract(epoch from (expires_at - created_at)))::int as segundos
       from login_tokens where email = $1`, [correo]);
  assert.ok(t, "fila en login_tokens");
  assert.equal(t.email, correo);
  assert.equal(t.token_hash, sha256Hex(token));
  assert.equal(t.ip_hash, hashIp(ip));
  assert.equal(t.return_to, null);
  assert.equal(t.used_at, null);
  assert.equal(t.segundos, 15 * 60);
});

for (const [origen, esperado] of [
  [ENV.ALLOWED_ORIGIN, ENV.ALLOWED_ORIGIN],
  [`${ENV.ALLOWED_ORIGIN}/ruta?x=1`, ENV.ALLOWED_ORIGIN],
  [ENV.APP_URL, ENV.APP_URL],
  ["http://localhost:4321", "http://localhost:4321"],
  ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
  ["https://ajeno.example", null],
  ["null", null],
  ["basura", null],
] as const) {
  test(`Origin ${origen} → return_to ${esperado}`, async () => {
    const correo = correoUnico();
    const r = await pedir("/api/auth/request", { origin: origen, json: { email: correo } });
    assert.equal(r.status, 200, r.text);
    const t = await fila(`select return_to from login_tokens where email = $1`, [correo]);
    assert.equal(t?.return_to, esperado);
    // El enlace del correo apunta a esa base, o a APP_URL si no hay.
    const texto = (await esperarCorreo(correo)).text;
    assert.ok(texto.includes(`${esperado ?? ENV.APP_URL}/api/auth/verify?token=`), texto);
  });
}

test("too_many_links a la 5.ª petición del mismo correo en una hora (aunque cambie la IP)", async () => {
  const correo = correoUnico();
  for (let i = 0; i < 4; i++) {
    const r = await pedir("/api/auth/request", { json: { email: correo } });
    assert.equal(r.status, 200, `petición ${i + 1}: ${r.text}`);
  }
  const r = await pedir("/api/auth/request", { json: { email: correo } });
  esError(r, 429, "too_many_links", "Se han pedido demasiados enlaces. Espera una hora.");
  esJsonApi(r);
  const n = await consulta(`select 1 from login_tokens where email = $1`, [correo]);
  assert.equal(n.length, 4, "el rechazo no inserta");
});

test("too_many_links a la 13.ª petición desde la misma IP en una hora", async () => {
  const ip = ipUnica();
  for (let i = 0; i < 12; i++) {
    const r = await pedir("/api/auth/request", { ip, json: { email: correoUnico() } });
    assert.equal(r.status, 200, `petición ${i + 1}: ${r.text}`);
  }
  const r = await pedir("/api/auth/request", { ip, json: { email: correoUnico() } });
  esError(r, 429, "too_many_links");
});

test("bad_email se comprueba antes que los límites por hora", async () => {
  const ip = ipUnica();
  for (let i = 0; i < 12; i++) await pedir("/api/auth/request", { ip, json: { email: correoUnico() } });
  const r = await pedir("/api/auth/request", { ip, json: { email: "malo" } });
  esError(r, 422, "bad_email");
});
