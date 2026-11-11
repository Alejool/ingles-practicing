/**
 * /api/ai/chat exige sesión (landing-y-acceso AC-21, plan K-12), contra un
 * Postgres en memoria (pglite) con el esquema real. Cubre lo que la batería de
 * contrato no puede preparar sin escribir en la base: sesión caducada y cuenta
 * bloqueada. Orden: preflight → 405 → sesión → cuerpo → bad_kind → …
 */

import { test, before, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

import { setDriver, migrate, q } from "../netlify/functions/_db.mts";
import { sha256Hex } from "../netlify/functions/_http.mts";
import aiChat from "../netlify/functions/ai-chat.mts";

const fetchOriginal = globalThis.fetch;
let llamadasAlProveedor = 0;
let esquema: string;
let db: PGlite;

before(async () => {
  esquema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
});

beforeEach(async () => {
  llamadasAlProveedor = 0;
  globalThis.fetch = async () => { llamadasAlProveedor++; throw new TypeError("no debería llamarse"); };
  db = new PGlite();
  setDriver(async (text, params) => (await db.query(text, params)).rows as Record<string, unknown>[]);
  await migrate(esquema);
});

afterEach(async () => {
  setDriver(null);
  await db.close();
});

after(() => { globalThis.fetch = fetchOriginal; });

async function sesion(token: string, { bloqueado = false, caducada = false } = {}): Promise<void> {
  const [{ id }] = await q<{ id: string }>(
    `insert into users (email, blocked) values ($1, $2) returning id`, [`${token}@example.com`, bloqueado]);
  await q(`insert into sessions (user_id, token_hash, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)`,
    [id, await sha256Hex(token), caducada ? "-1" : "1"]);
}

function chat(body: string, { token, method = "POST" }: { token?: string; method?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Device-Id": "dispositivo-1" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return aiChat(new Request("http://localhost/api/ai/chat", { method, headers, body: method === "GET" ? undefined : body }));
}

async function codigo(res: Response): Promise<[number, string]> {
  return [res.status, (await res.json()).error.code];
}

async function filas(): Promise<number> {
  return (await q(`select 1 from ai_usage`)).length;
}

test("sin sesión → 401 not_authenticated, sin fila y sin llamar al proveedor", async () => {
  assert.deepEqual(await codigo(await chat('{"kind":"test","payload":{}}')), [401, "not_authenticated"]);
  assert.equal(await filas(), 0);
  assert.equal(llamadasAlProveedor, 0);
});

test("sesión caducada → 401", async () => {
  await sesion("tok-caducado", { caducada: true });
  assert.deepEqual(await codigo(await chat('{"kind":"test"}', { token: "tok-caducado" })), [401, "not_authenticated"]);
  assert.equal(await filas(), 0);
  assert.equal(llamadasAlProveedor, 0);
});

test("cuenta bloqueada → 403 account_blocked, sin fila", async () => {
  await sesion("tok-bloqueado", { bloqueado: true });
  assert.deepEqual(await codigo(await chat('{"kind":"test"}', { token: "tok-bloqueado" })), [403, "account_blocked"]);
  assert.equal(await filas(), 0);
  assert.equal(llamadasAlProveedor, 0);
});

test("el 405 va antes que el 401", async () => {
  assert.deepEqual(await codigo(await chat("", { method: "GET" })), [405, "method_not_allowed"]);
});

test("el 401 va antes que bad_json, 413 y bad_kind", async () => {
  assert.deepEqual(await codigo(await chat("{kind")), [401, "not_authenticated"]);
  assert.deepEqual(await codigo(await chat(JSON.stringify({ kind: "nada", x: "a".repeat(96 * 1024) }))), [401, "not_authenticated"]);
  assert.deepEqual(await codigo(await chat('{"kind":"nada"}')), [401, "not_authenticated"]);
});

test("el 403 de cuenta bloqueada va antes que bad_json", async () => {
  await sesion("tok-bloqueado", { bloqueado: true });
  assert.deepEqual(await codigo(await chat("{kind", { token: "tok-bloqueado" })), [403, "account_blocked"]);
});

test("con sesión válida sigue el orden de siempre: bad_json, bad_kind", async () => {
  await sesion("tok-bueno");
  assert.deepEqual(await codigo(await chat("{kind", { token: "tok-bueno" })), [400, "bad_json"]);
  assert.deepEqual(await codigo(await chat('{"kind":"nada"}', { token: "tok-bueno" })), [422, "bad_kind"]);
});
