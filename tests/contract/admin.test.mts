/**
 * /api/admin: informe de uso y operaciones, protegido por ADMIN_TOKEN (query o bearer).
 * `ADMIN_TOKEN` sin definir (404) queda fuera de la batería: el entorno es uno solo.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  pedir, login, esError, esJsonApi, fila, consulta, correoUnico, dispositivoUnico, ipUnica, sha256Hex,
  ADMIN_TOKEN, IP_PEPPER,
} from "./_lib.mts";

/** Sentencias de db/schema.sql según `migrate()`: se quitan los comentarios `--` y se parte por `;`. */
const SENTENCIAS_ESQUEMA = 21;

const admin = (query = "", o: Parameters<typeof pedir>[1] = {}) =>
  pedir(`/api/admin?token=${encodeURIComponent(ADMIN_TOKEN)}${query}`, o);

const op = (query: string) => admin(query, { method: "POST" });

/** Comprueba claves (en orden) y tipos de una fila: "n" número, "s" cadena, "b" booleano, "s?" cadena o null. */
function forma(obj: any, tipos: Record<string, string>, donde: string): void {
  assert.deepEqual(Object.keys(obj), Object.keys(tipos), `${donde}: claves`);
  for (const [k, t] of Object.entries(tipos)) {
    const v = obj[k];
    const ok =
      t === "n" ? typeof v === "number" :
      t === "s" ? typeof v === "string" :
      t === "b" ? typeof v === "boolean" :
      t === "s?" ? v === null || typeof v === "string" :
      t === "n?" ? v === null || typeof v === "number" : false;
    assert.ok(ok, `${donde}.${k}: se esperaba ${t} y llegó ${JSON.stringify(v)}`);
  }
}

const USD = /^\d+\.\d{4}$/;

/* ─────────────── acceso ─────────────── */

test("sin token → 403 forbidden", async () => {
  const r = await pedir("/api/admin");
  esError(r, 403, "forbidden", "Token de administración incorrecto.");
  esJsonApi(r);
});

test("token erróneo por query o por bearer → 403", async () => {
  esError(await pedir("/api/admin?token=malo"), 403, "forbidden");
  esError(await pedir("/api/admin", { token: "malo" }), 403, "forbidden");
});

test("token por bearer → 200; por query → 200; la query manda sobre el bearer", async () => {
  assert.equal((await pedir("/api/admin", { token: ADMIN_TOKEN })).status, 200);
  assert.equal((await admin()).status, 200);
  esError(await pedir("/api/admin?token=malo", { token: ADMIN_TOKEN }), 403, "forbidden");
});

test("el 403 va antes que cualquier op", async () => {
  esError(await pedir("/api/admin?op=schema", { method: "POST" }), 403, "forbidden");
});

/* ─────────────── informe ─────────────── */

test("GET → informe con sus claves y tipos (usd como cadena)", async () => {
  // Datos para que ninguna lista salga vacía: una llamada con cuenta, un texto y un latido.
  const { token } = await login(correoUnico());
  const device = dispositivoUnico();
  const ia = await pedir("/api/ai/chat", { json: { kind: "test" }, token, device, ip: ipUnica() });
  assert.equal(ia.status, 200);
  const pub = await pedir("/api/readings", { method: "POST", token, json: {
    id: `ct-${randomBytes(6).toString("hex")}`,
    data: { title: "Informe", body: ["uno", "dos"], qs: Array(3).fill({ q: "q", o: ["a", "b", "c", "d"], a: 1 }) },
  } });
  assert.equal(pub.status, 200);
  await pedir("/api/pulse", { json: { planDay: 15, seen: ["panel"] }, device });

  const r = await admin();
  assert.equal(r.status, 200);
  esJsonApi(r);
  const b = r.body;
  assert.deepEqual(Object.keys(b), ["presupuesto", "totales", "por_dia", "por_tipo", "top_del_mes", "uso", "biblioteca"]);
  assert.deepEqual(b.presupuesto, {
    credito_usd: 0.0005, tope_diario_usd: 3, tope_diario_creditos: 6000, creditos_dia_por_cuenta: 60, creditos_prueba: 15,
  });
  forma(b.totales, { usuarios: "n", hoy: "n", usd_hoy: "s", usd_mes: "s", tokens_mes: "n" }, "totales");
  assert.match(b.totales.usd_hoy, USD);

  assert.ok(b.por_dia.length >= 1);
  // `personas` es count(distinct …) sin ::int: bigint, y el driver pg lo da como cadena (comportamiento de Node).
  forma(b.por_dia[0], {
    day: "s", llamadas: "n", personas: "s", tokens_entrada: "n", tokens_salida: "n", usd: "s", anonimas: "n",
  }, "por_dia[0]");
  assert.match(b.por_dia[0].day, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(b.por_dia[0].usd, USD);

  assert.ok(b.por_tipo.length >= 1);
  forma(b.por_tipo[0], { kind: "s", llamadas: "n", tokens: "n", usd: "s", usd_por_llamada: "s" }, "por_tipo[0]");
  assert.match(b.por_tipo[0].usd_por_llamada, /^\d+\.\d{5}$/);

  assert.ok(b.top_del_mes.length >= 1);
  forma(b.top_del_mes[0], { email: "s", llamadas: "n", tokens: "n", usd: "s" }, "top_del_mes[0]");

  assert.deepEqual(Object.keys(b.uso), ["resumen", "embudo", "modulos_abiertos"]);
  forma(b.uso.resumen, { personas: "n", activos_7d: "n", hoy: "n", dia_medio: "n", mejor_racha: "n" }, "uso.resumen");
  assert.ok(b.uso.embudo.length >= 1);
  forma(b.uso.embudo[0], { track: "s", tramo: "n", personas: "n", dias_hechos_medio: "n", activos_7d: "n" }, "uso.embudo[0]");
  assert.ok(b.uso.modulos_abiertos.length >= 1);
  forma(b.uso.modulos_abiertos[0], { modulo: "s", personas: "n" }, "uso.modulos_abiertos[0]");

  assert.ok(b.biblioteca.length >= 1 && b.biblioteca.length <= 40);
  forma(b.biblioteca[0], {
    id: "s", track: "s", level: "s", topic: "s", title: "s", words: "n", reads: "n", hidden: "b", dia: "s", autor: "s?",
  }, "biblioteca[0]");
  const ids = b.biblioteca.map((x: any) => x.id);
  assert.deepEqual(ids, [...ids].sort().reverse(), "ordenada por id descendente");
});

test("POST sin op conocida, o GET con op, devuelven el informe", async () => {
  for (const r of [await op(""), await op("&op=otra"), await admin("&op=schema")]) {
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body), ["presupuesto", "totales", "por_dia", "por_tipo", "top_del_mes", "uso", "biblioteca"]);
  }
});

/* ─────────────── operaciones ─────────────── */

test("op=schema → {ok, message} con el número de sentencias; idempotente", async () => {
  for (let i = 0; i < 2; i++) {
    const r = await op("&op=schema");
    assert.equal(r.status, 200, r.text);
    esJsonApi(r);
    assert.equal(r.text, JSON.stringify({ ok: true, message: `Esquema aplicado (${SENTENCIAS_ESQUEMA} sentencias).` }));
  }
});

test("op=hide: sin id 422 bad_id; id inexistente 404; ocultar y volver a mostrar", async () => {
  esError(await op("&op=hide"), 422, "bad_id", "Falta el id del texto.");
  esError(await op("&op=hide&id=%20%20"), 422, "bad_id", "Falta el id del texto.");
  esError(await op("&op=hide&id=no-existe-nunca"), 404, "not_found", "No hay ningún texto con ese id.");

  const { token } = await login();
  const id = `ct-${randomBytes(6).toString("hex")}`;
  await pedir("/api/readings", { method: "POST", token, json: {
    id, data: { title: "Para ocultar", body: ["uno", "dos"], qs: Array(3).fill({ q: "q", o: ["a", "b", "c", "d"], a: 0 }) },
  } });

  const oculta = await op(`&op=hide&id=${id}`);
  assert.equal(oculta.status, 200);
  esJsonApi(oculta);
  assert.equal(oculta.text, JSON.stringify({ ok: true, texto: { id, title: "Para ocultar", hidden: true } }));
  assert.equal((await fila(`select hidden from shared_readings where id = $1`, [id]))?.hidden, true);

  const visible = await op(`&op=hide&id=${id}&show=1`);
  assert.deepEqual(visible.body, { ok: true, texto: { id, title: "Para ocultar", hidden: false } });
  // show distinto de "1" vuelve a ocultar.
  assert.equal((await op(`&op=hide&id=${id}&show=true`)).body.texto.hidden, true);
});

test("op=cleanup-test borra solo lo de @smoke.test / smoke-% / 'Smoke…' y devuelve los contadores", async () => {
  await op("&op=cleanup-test");

  // Lo de la prueba de humo.
  const smoke = await login(correoUnico("smoke.test"));
  const devSmoke = `smoke-${randomBytes(6).toString("hex")}`;
  assert.equal((await pedir("/api/ai/chat", { json: { kind: "test" }, token: smoke.token, device: devSmoke, ip: ipUnica() })).status, 200);
  await pedir("/api/pulse", { json: { planDay: 1 }, device: devSmoke });
  const lectura = (title: string) => ({
    id: `ct-${randomBytes(6).toString("hex")}`,
    data: { title, body: ["uno", "dos"], qs: Array(3).fill({ q: "q", o: ["a", "b", "c", "d"], a: 0 }) },
  });
  const textoSmoke = lectura("Smoke contrato");
  await pedir("/api/readings", { method: "POST", token: smoke.token, json: textoSmoke });

  // Lo que no se toca.
  const normal = await login();
  const devNormal = dispositivoUnico();
  assert.equal((await pedir("/api/ai/chat", { json: { kind: "test" }, token: normal.token, device: devNormal, ip: ipUnica() })).status, 200);
  await pedir("/api/pulse", { json: { planDay: 1 }, device: devNormal });
  const textoNormal = lectura("smoke en minúscula no cuenta");
  await pedir("/api/readings", { method: "POST", token: normal.token, json: textoNormal });

  const r = await op(`&op=cleanup-test&dev=${devSmoke}`);
  assert.equal(r.status, 200, r.text);
  esJsonApi(r);
  assert.equal(r.text, JSON.stringify({ ok: true, borrados: 1, pulsos: 1, lecturas: 1 }));

  const anon = (d: string) => sha256Hex(`${d}|pulse|${IP_PEPPER}`);
  assert.equal((await consulta(`select 1 from users where email = $1`, [smoke.correo])).length, 0);
  assert.equal((await consulta(`select 1 from login_tokens where email = $1`, [smoke.correo])).length, 0);
  assert.equal((await consulta(`select 1 from ai_usage where device_id = $1`, [devSmoke])).length, 0);
  assert.equal((await consulta(`select 1 from pulse where anon = $1`, [anon(devSmoke)])).length, 0);
  assert.equal((await consulta(`select 1 from shared_readings where id = $1`, [textoSmoke.id])).length, 0);

  assert.equal((await consulta(`select 1 from users where email = $1`, [normal.correo])).length, 1);
  assert.equal((await consulta(`select 1 from ai_usage where device_id = $1`, [devNormal])).length, 1);
  assert.equal((await consulta(`select 1 from pulse where anon = $1`, [anon(devNormal)])).length, 1);
  assert.equal((await consulta(`select 1 from shared_readings where id = $1`, [textoNormal.id])).length, 1);

  const otraVez = await op("&op=cleanup-test");
  assert.equal(otraVez.text, JSON.stringify({ ok: true, borrados: 0, pulsos: 0, lecturas: 0 }));
});
