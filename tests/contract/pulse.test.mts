/**
 * POST /api/pulse: latido anónimo, una fila por dispositivo y día.
 * La clave es anon = sha256(dispositivo + "|pulse|" + IP_PEPPER); nunca el id en claro.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, esError, esJsonApi, fila, consulta, dispositivoUnico, sha256Hex, IP_PEPPER } from "./_lib.mts";

const anonDe = (device: string) => sha256Hex(`${device}|pulse|${IP_PEPPER}`);

function latido(json: unknown, device?: string) {
  return pedir("/api/pulse", { json, device });
}

function filaDe(device: string) {
  return fila(
    `select track, plan_day, done_days, streak, seen, day = current_date as hoy, updated_at
       from pulse where anon = $1`, [anonDe(device)]);
}

for (const method of ["GET", "PUT"]) {
  test(`${method} → 405 method_not_allowed`, async () => {
    const r = await pedir("/api/pulse", { method, body: method === "PUT" ? "{}" : undefined });
    esError(r, 405, "method_not_allowed", "Método no permitido.");
    esJsonApi(r);
  });
}

test("sin dispositivo → {ok:true} y ninguna fila", async () => {
  const r = await latido({ track: "b1b2", planDay: 3 });
  assert.equal(r.status, 200);
  esJsonApi(r);
  assert.equal(r.text, '{"ok":true}');
  const invalido = await latido({ planDay: 3 }, "corto");
  assert.equal(invalido.text, '{"ok":true}');
  for (const device of ["", "corto"]) {
    assert.equal((await consulta(`select 1 from pulse where anon = $1`, [anonDe(device)])).length, 0);
  }
});

test("con dispositivo: fila con anon = sha256(dev|pulse|pimienta) y los valores enviados", async () => {
  const device = dispositivoUnico();
  const r = await latido({ track: "a2b1", planDay: 12, doneDays: 10, streak: 4, seen: ["panel", "plan", "vocab"] }, device);
  assert.equal(r.status, 200);
  assert.equal(r.text, '{"ok":true}');
  const f = await filaDe(device);
  assert.ok(f, "fila guardada con el hash");
  assert.deepEqual({ ...f, updated_at: undefined }, {
    track: "a2b1", plan_day: 12, done_days: 10, streak: 4, seen: "panel,plan,vocab", hoy: true, updated_at: undefined,
  });
  assert.equal(
    (await consulta(`select 1 from pulse where anon = $1`, [device])).length, 0, "el id en claro no se guarda");
});

test("el dispositivo también vale en el cuerpo (device_id)", async () => {
  const device = dispositivoUnico();
  await latido({ device_id: device, planDay: 2 });
  assert.equal((await filaDe(device))?.plan_day, 2);
});

test("valores recortados a sus rangos; lo que no es número va al mínimo; redondeo", async () => {
  const casos: Array<[Record<string, unknown>, Record<string, number>]> = [
    [{ planDay: 999, doneDays: 999, streak: 999 }, { plan_day: 200, done_days: 200, streak: 400 }],
    [{ planDay: -5, doneDays: -5, streak: -5 }, { plan_day: 1, done_days: 0, streak: 0 }],
    [{ planDay: "abc", doneDays: null, streak: {} }, { plan_day: 1, done_days: 0, streak: 0 }],
    [{ planDay: "7", doneDays: 2.5, streak: 3.4 }, { plan_day: 7, done_days: 3, streak: 3 }],
    [{}, { plan_day: 1, done_days: 0, streak: 0 }],
  ];
  for (const [cuerpo, esperado] of casos) {
    const device = dispositivoUnico();
    await latido(cuerpo, device);
    const f = await filaDe(device);
    assert.deepEqual({ plan_day: f?.plan_day, done_days: f?.done_days, streak: f?.streak }, esperado, JSON.stringify(cuerpo));
  }
});

test("track fuera de lista → b1b2; módulos fuera de lista descartados; como mucho 20", async () => {
  const device = dispositivoUnico();
  const seen = ["panel", "hack", "PLAN", 3, "tutor", ...Array(30).fill("vocab")];
  await latido({ track: "c1c2", seen }, device);
  const f = await filaDe(device);
  assert.equal(f?.track, "b1b2");
  assert.equal(f?.seen, ["panel", "tutor", ...Array(18).fill("vocab")].join(","));
  const otro = dispositivoUnico();
  await latido({ seen: "panel" }, otro);
  assert.equal((await filaDe(otro))?.seen, "", "seen que no es lista → vacío");
});

test("segunda llamada del día: greatest en los contadores; track y seen se reemplazan", async () => {
  const device = dispositivoUnico();
  await latido({ track: "a2b1", planDay: 20, doneDays: 15, streak: 9, seen: ["panel", "plan"] }, device);
  const primera = await filaDe(device);
  await new Promise(r => setTimeout(r, 10));
  await latido({ track: "b1b2", planDay: 5, doneDays: 18, streak: 2, seen: ["vocab"] }, device);
  const f = await filaDe(device);
  assert.equal(f?.track, "b1b2");
  assert.equal(f?.plan_day, 20);
  assert.equal(f?.done_days, 18);
  assert.equal(f?.streak, 9);
  assert.equal(f?.seen, "vocab");
  assert.ok(f?.updated_at > primera?.updated_at, "updated_at avanza");
  assert.equal((await consulta(`select 1 from pulse where anon = $1`, [anonDe(device)])).length, 1);
});

test("JSON inválido → 400 bad_json; más de 8 KB → 413", async () => {
  esError(await pedir("/api/pulse", { body: "{x", device: dispositivoUnico() }), 400, "bad_json", "JSON inválido.");
  const r = await latido({ seen: ["panel"], x: "a".repeat(8 * 1024) }, dispositivoUnico());
  esError(r, 413, "payload_too_large", "El texto enviado es demasiado largo.");
});
