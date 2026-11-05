/** /api/progress: progreso sincronizado con control de versión optimista. Exige sesión. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, login, esError, esJsonApi, fila, ISO } from "./_lib.mts";

const subir = (token: string, json: unknown) => pedir("/api/progress", { method: "PUT", token, json });

for (const method of ["GET", "PUT", "DELETE", "POST"]) {
  test(`${method} sin sesión → 401 not_authenticated (antes que 405)`, async () => {
    const r = await pedir("/api/progress", { method, body: method === "GET" ? undefined : "{}" });
    esError(r, 401, "not_authenticated", "Inicia sesión para continuar.");
    esJsonApi(r);
  });
}

test("un token desconocido → 401", async () => {
  esError(await pedir("/api/progress", { token: "no-existe" }), 401, "not_authenticated");
});

for (const method of ["DELETE", "POST"]) {
  test(`${method} con sesión → 405 method_not_allowed`, async () => {
    const { token } = await login();
    const r = await pedir("/api/progress", { method, token, body: "{}" });
    esError(r, 405, "method_not_allowed", "Método no permitido.");
  });
}

test("GET sin progreso guardado → {data:null, version:0, updatedAt:null}", async () => {
  const { token } = await login();
  const r = await pedir("/api/progress", { token });
  assert.equal(r.status, 200);
  esJsonApi(r);
  assert.equal(r.text, '{"data":null,"version":0,"updatedAt":null}');
});

test("PUT crea (versión 1, sea cual sea la versión enviada), GET lo devuelve", async () => {
  const { correo, token } = await login();
  const r = await subir(token, { data: { a: 1 }, version: 7 });
  assert.equal(r.status, 200, r.text);
  esJsonApi(r);
  assert.deepEqual(Object.keys(r.body), ["version", "updatedAt"]);
  assert.equal(r.body.version, 1);
  assert.match(r.body.updatedAt, ISO);

  const g = await pedir("/api/progress", { token });
  assert.deepEqual(Object.keys(g.body), ["data", "version", "updatedAt"]);
  assert.deepEqual(g.body, { data: { a: 1 }, version: 1, updatedAt: r.body.updatedAt });

  const f = await fila(
    `select p.version, p.data from progress p join users u on u.id = p.user_id where u.email = $1`, [correo]);
  assert.equal(f?.version, 1);
  assert.deepEqual(f?.data, { a: 1 });
});

test("PUT con la versión correcta → versión + 1 y updatedAt nuevo", async () => {
  const { token } = await login();
  const v1 = await subir(token, { data: { n: 1 } });
  await new Promise(r => setTimeout(r, 5));
  const v2 = await subir(token, { data: { n: 2 }, version: 1 });
  assert.equal(v2.status, 200, v2.text);
  assert.equal(v2.body.version, 2);
  assert.ok(Date.parse(v2.body.updatedAt) > Date.parse(v1.body.updatedAt));
  const v3 = await subir(token, { data: { n: 3 }, version: 2 });
  assert.equal(v3.body.version, 3);
  assert.deepEqual((await pedir("/api/progress", { token })).body.data, { n: 3 });
});

test("PUT con una versión vieja → 409 version_conflict con server:{data, version, updatedAt}", async () => {
  const { token } = await login();
  await subir(token, { data: { n: 1 } });
  const v2 = await subir(token, { data: { n: 2 }, version: 1 });
  const r = await subir(token, { data: { n: 99 }, version: 1 });
  esError(r, 409, "version_conflict", "Hay una versión más reciente en el servidor.");
  esJsonApi(r);
  assert.deepEqual(Object.keys(r.body.error), ["code", "message", "server"]);
  assert.deepEqual(Object.keys(r.body.error.server), ["data", "version", "updatedAt"]);
  assert.deepEqual(r.body.error.server, { data: { n: 2 }, version: 2, updatedAt: v2.body.updatedAt });
  assert.deepEqual((await pedir("/api/progress", { token })).body.data, { n: 2 }, "no se sobrescribe");
});

test("version como cadena cuenta como 0 → conflicto si ya hay versión 1", async () => {
  const { token } = await login();
  await subir(token, { data: { n: 1 } });
  esError(await subir(token, { data: { n: 2 }, version: "1" }), 409, "version_conflict");
});

test("sin version cuenta como 0", async () => {
  const { token } = await login();
  await subir(token, { data: { n: 1 } });
  esError(await subir(token, { data: { n: 2 } }), 409, "version_conflict");
});

for (const data of [undefined, null, [], [1, 2], "texto", 3, true, 0]) {
  test(`data ${JSON.stringify(data)} → 422 bad_progress`, async () => {
    const { token } = await login();
    const r = await subir(token, { data, version: 0 });
    esError(r, 422, "bad_progress", "El progreso enviado no es válido.");
    esJsonApi(r);
  });
}

test("JSON inválido → 400 bad_json", async () => {
  const { token } = await login();
  esError(await pedir("/api/progress", { method: "PUT", token, body: "{data" }), 400, "bad_json", "JSON inválido.");
});

test("los datos vuelven idénticos: {} y [] vacíos, cero, acentos y barras sin escapar", async () => {
  const { token } = await login();
  const data = {
    vacio: {},
    lista: [],
    cero: 0.0,
    decimal: 1.5,
    negativo: -3,
    texto: "ñandú «ü» → 😀",
    ruta: "a/b/c",
    anidado: { dias: [{ hecho: true, nota: null }], mapa: { "clave con espacio": "x" } },
  };
  const r = await subir(token, { data });
  assert.equal(r.status, 200, r.text);
  const g = await pedir("/api/progress", { token });
  assert.deepEqual(g.body.data, data);
  assert.equal(Array.isArray(g.body.data.lista), true);
  assert.equal(Array.isArray(g.body.data.vacio), false, "{} sigue siendo un objeto");
  assert.ok(g.text.includes('"vacio":{}'));
  assert.ok(g.text.includes('"lista":[]'));
  assert.ok(g.text.includes('"ruta":"a/b/c"'), "sin escapar la barra");
  assert.ok(g.text.includes('"texto":"ñandú «ü» → 😀"'), "UTF-8 tal cual, sin \\u");
  // Node pasa el jsonb por JSON.parse: 0.0 vuelve como 0.
  assert.ok(g.text.includes('"cero":0,') || g.text.includes('"cero":0}'), g.text);
});

test("el tope es PROGRESS_MAX_KB (512 KB) en caracteres → 413 payload_too_large", async () => {
  const { token } = await login();
  const grande = await subir(token, { data: { x: "a".repeat(512 * 1024) } });
  esError(grande, 413, "payload_too_large", "El texto enviado es demasiado largo.");
  const cabe = await subir(token, { data: { x: "a".repeat(512 * 1024 - 100) } });
  assert.equal(cabe.status, 200, cabe.text);
});
