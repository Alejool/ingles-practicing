/**
 * Cuotas contra un Postgres de verdad en memoria (pglite), con el esquema real.
 * Nada de esto toca la red ni la base de la app.
 */

import { test, before, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

import { setDriver, migrate, q } from "../netlify/functions/_db.mts";
import { ApiError } from "../netlify/functions/_http.mts";
import { reservar, anularReserva } from "../netlify/functions/_quota.mts";
import aiChat from "../netlify/functions/ai-chat.mts";

const AJUSTES: Record<string, string> = {
  QUOTA_ANON_LIFETIME: "15",
  QUOTA_ANON_WINDOW: "total",
  QUOTA_USER_DAILY: "10",
  QUOTA_USER_MONTHLY: "900",
  QUOTA_GLOBAL_DAILY: "6000",
  QUOTA_GLOBAL_DAILY_USD: "3",
  QUOTA_PER_MINUTE: "1000",
  QUOTA_CREDIT_MICROS: "500",
};
const previas = Object.fromEntries(Object.keys(AJUSTES).map(k => [k, process.env[k]]));
const fetchOriginal = globalThis.fetch;

let esquema: string;
let db: PGlite;

before(async () => {
  esquema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
});

// Una base nueva y vacía por prueba: así ninguna tiene que borrar lo de la anterior.
beforeEach(async () => {
  Object.assign(process.env, AJUSTES);
  globalThis.fetch = fetchOriginal;
  db = new PGlite();
  setDriver(async (text, params) => (await db.query(text, params)).rows as Record<string, unknown>[]);
  await migrate(esquema);
});

afterEach(async () => {
  setDriver(null);
  await db.close();
});

after(() => {
  globalThis.fetch = fetchOriginal;
  for (const [k, v] of Object.entries(previas)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function creditosCobrados(): Promise<number> {
  const filas = await q<{ micros: string }>(`select coalesce(sum(cost_micros), 0)::bigint as micros from ai_usage where ok`);
  return Number(filas[0].micros) / 500;
}

function codigos(res: PromiseSettledResult<unknown>[]): string[] {
  return res.map(r => r.status === "fulfilled" ? "ok" : r.reason instanceof ApiError ? r.reason.code : String(r.reason));
}

test("en serie se admite justo lo que cabe y lo rechazado no escribe fila", async () => {
  // «error» con el modelo rápido reserva 2 créditos: en 15 caben 7.
  for (let k = 0; k < 7; k++) await reservar(null, "dispositivo-1", "ip-1", "error", "deepseek-chat");
  await assert.rejects(
    reservar(null, "dispositivo-1", "ip-1", "error", "deepseek-chat"),
    (e: unknown) => e instanceof ApiError && e.code === "anon_limit");
  assert.equal(await creditosCobrados(), 14);
  assert.equal((await q(`select 1 from ai_usage`)).length, 7);
});

test("anónimo: 25 reservas a la vez no pasan del tope de por vida", async () => {
  const res = await Promise.allSettled(
    Array.from({ length: 25 }, () => reservar(null, "dispositivo-1", "ip-1", "error", "deepseek-chat")));
  const cobrados = await creditosCobrados();
  assert.ok(cobrados <= 15, `se cobraron ${cobrados} créditos con un tope de 15`);
  assert.ok(codigos(res).filter(c => c === "ok").length <= 7, codigos(res).join(","));
  assert.ok(codigos(res).every(c => c === "ok" || c === "anon_limit"), codigos(res).join(","));
});

test("anónimo: cambiar de dispositivo en paralelo no esquiva el tope por IP", async () => {
  const res = await Promise.allSettled(
    Array.from({ length: 25 }, (_, k) => reservar(null, "dispositivo-" + k, "ip-1", "error", "deepseek-chat")));
  assert.ok(await creditosCobrados() <= 15, codigos(res).join(","));
});

test("registrado: reservas a la vez no pasan del tope diario", async () => {
  const [{ id }] = await q<{ id: string }>(`insert into users (email) values ('a@example.com') returning id`);
  const user = { id, email: "a@example.com", daily_bonus: 0, blocked: false };
  const res = await Promise.allSettled(
    Array.from({ length: 20 }, () => reservar(user, "dispositivo-1", "ip-1", "tutor", "deepseek-chat")));
  // «tutor» reserva 3 créditos: en 10 caben 3.
  const cobrados = await creditosCobrados();
  assert.ok(cobrados <= 10, `se cobraron ${cobrados} créditos con un tope de 10`);
  assert.ok(codigos(res).every(c => c === "ok" || c === "user_daily_limit"), codigos(res).join(","));
});

test("ritmo: una ráfaga no pasa de las llamadas por minuto", async () => {
  process.env.QUOTA_PER_MINUTE = "6";
  process.env.QUOTA_ANON_LIFETIME = "1000";
  const res = await Promise.allSettled(
    Array.from({ length: 20 }, () => reservar(null, "dispositivo-1", "ip-1", "test", "deepseek-chat")));
  const admitidas = codigos(res).filter(c => c === "ok").length;
  assert.ok(admitidas <= 6, `pasaron ${admitidas} con un tope de 6 por minuto`);
  assert.ok(codigos(res).every(c => c === "ok" || c === "too_fast"), codigos(res).join(","));
});

test("despliegue: gente distinta a la vez no pasa del presupuesto del día", async () => {
  process.env.QUOTA_GLOBAL_DAILY = "10";
  const res = await Promise.allSettled(
    Array.from({ length: 30 }, (_, k) => reservar(null, "dispositivo-" + k, "ip-" + k, "test", "deepseek-chat")));
  const cobrados = await creditosCobrados();
  assert.ok(cobrados <= 10, `se cobraron ${cobrados} créditos con un presupuesto de 10`);
  assert.ok(codigos(res).every(c => c === "ok" || c === "global_limit"), codigos(res).join(","));
});

test("con sitio de sobra, las reservas a la vez pasan todas", async () => {
  process.env.QUOTA_ANON_LIFETIME = "100";
  const res = await Promise.allSettled(
    Array.from({ length: 5 }, () => reservar(null, "dispositivo-1", "ip-1", "error", "deepseek-chat")));
  assert.deepEqual(codigos(res), ["ok", "ok", "ok", "ok", "ok"]);
  assert.equal(await creditosCobrados(), 10);
});

test("anular una reserva la deja sin cobrar", async () => {
  const { id } = await reservar(null, "dispositivo-1", "ip-1", "error", "deepseek-chat");
  assert.equal(await creditosCobrados(), 2);
  await anularReserva(id);
  assert.equal(await creditosCobrados(), 0);
  assert.equal((await q(`select 1 from ai_usage where not ok`)).length, 1);
});

test("si la llamada a DeepSeek revienta, la reserva no se queda cobrada", async () => {
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  const res = await aiChat(new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Id": "dispositivo-1" },
    body: JSON.stringify({ kind: "test", payload: {} }),
  }));
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error.code, "provider_error");
  assert.equal(await creditosCobrados(), 0);
  assert.equal((await q(`select 1 from ai_usage where not ok`)).length, 1);
});
