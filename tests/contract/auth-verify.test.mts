/**
 * /api/auth/verify: consume el enlace y redirige. Siempre 302 a `<base>/#auth=…`,
 * sin cuerpo, `no-store` y sin CORS, con cualquier método.
 *
 * El enlace caducado (`expires_at` pasado) no se prueba aquí: llegar a ese
 * estado por HTTP exige esperar LOGIN_LINK_MINUTES, y la batería no escribe en
 * la base. Usa la misma condición SQL que el desconocido y el usado
 * (`used_at is null and expires_at > now()`); lo cubre el Feature de PHPUnit.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, pedirEnlace, sinCors, fila, consulta, correoUnico, sha256Hex, ENV, type Respuesta } from "./_lib.mts";

const SESION = /#auth=[A-Za-z0-9_-]{43}$/;

function redirige(r: Respuesta, location: string | RegExp): void {
  assert.equal(r.status, 302);
  if (typeof location === "string") assert.equal(r.headers.get("location"), location);
  else assert.match(r.headers.get("location") || "", location);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.text, "");
  sinCors(r.headers);
}

const verificar = (token: string, extra: Parameters<typeof pedir>[1] = {}) =>
  pedir(`/api/auth/verify?token=${encodeURIComponent(token)}`, extra);

test("sin token → #auth=error", async () => {
  redirige(await pedir("/api/auth/verify"), `${ENV.APP_URL}/#auth=error`);
  redirige(await pedir("/api/auth/verify?token="), `${ENV.APP_URL}/#auth=error`);
});

test("token desconocido → #auth=expired", async () => {
  redirige(await verificar("no-existe-este-token"), `${ENV.APP_URL}/#auth=expired`);
});

test("válido → #auth=<sesión>; used_at puesto; usuario y sesión creados", async () => {
  const correo = correoUnico();
  const enlace = await pedirEnlace(correo);
  const r = await verificar(enlace, { headers: { "User-Agent": "contrato/1.0" } });
  redirige(r, new RegExp(`^${ENV.APP_URL}/${SESION.source}`));
  const sesion = decodeURIComponent((r.headers.get("location") || "").split("#auth=")[1]);

  const t = await fila(`select used_at from login_tokens where token_hash = $1`, [sha256Hex(enlace)]);
  assert.ok(t?.used_at instanceof Date, "used_at puesto");

  const u = await fila(`select id, blocked, daily_bonus, last_seen_at from users where email = $1`, [correo]);
  assert.ok(u, "usuario creado");
  assert.equal(u.blocked, false);
  assert.equal(u.daily_bonus, 0);
  assert.equal(u.last_seen_at, null, "un alta nueva no marca last_seen_at");

  const s = await fila(
    `select user_id, user_agent, round(extract(epoch from (expires_at - created_at)) / 86400)::int as dias
       from sessions where token_hash = $1`, [sha256Hex(sesion)]);
  assert.ok(s, "sesión guardada como hash");
  assert.equal(s.user_id, u.id);
  assert.equal(s.user_agent, "contrato/1.0");
  assert.equal(s.dias, 60);
});

test("un enlace ya usado → #auth=expired", async () => {
  const enlace = await pedirEnlace(correoUnico());
  redirige(await verificar(enlace), SESION);
  redirige(await verificar(enlace), `${ENV.APP_URL}/#auth=expired`);
});

test("dos enlaces del mismo correo → el mismo usuario (upsert), dos sesiones, last_seen_at puesto", async () => {
  const correo = correoUnico();
  const uno = await pedirEnlace(correo);
  const dos = await pedirEnlace(correo);
  redirige(await verificar(uno), SESION);
  redirige(await verificar(dos), SESION);
  const users = await consulta(`select id, last_seen_at from users where email = $1`, [correo]);
  assert.equal(users.length, 1);
  assert.ok(users[0].last_seen_at instanceof Date, "el segundo alta pasa por on conflict");
  const ses = await consulta(`select 1 from sessions where user_id = $1`, [users[0].id]);
  assert.equal(ses.length, 2);
});

test("vuelve al origen guardado en return_to", async () => {
  const enlace = await pedirEnlace(correoUnico(), { origin: ENV.ALLOWED_ORIGIN });
  redirige(await verificar(enlace), new RegExp(`^${ENV.ALLOWED_ORIGIN}/${SESION.source}`));
});

test("vuelve a un localhost de desarrollo cuando APP_URL es local", async () => {
  const enlace = await pedirEnlace(correoUnico(), { origin: "http://localhost:4321" });
  redirige(await verificar(enlace), new RegExp(`^http://localhost:4321/${SESION.source}`));
});

for (const method of ["POST", "PUT", "OPTIONS"]) {
  test(`${method} también verifica (no mira el método)`, async () => {
    const enlace = await pedirEnlace(correoUnico());
    redirige(await verificar(enlace, { method }), new RegExp(`^${ENV.APP_URL}/${SESION.source}`));
  });
}
