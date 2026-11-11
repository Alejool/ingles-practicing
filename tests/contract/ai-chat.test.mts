/**
 * POST /api/ai/chat. El modo del DeepSeek simulado se elige con `FAKE:<modo>`
 * dentro del payload (ver fake-deepseek.mts). El kind `test` tiene mensajes
 * fijos, así que con él el simulado siempre responde `ok`.
 *
 * Créditos (contract.env deja los QUOTA_* por defecto): 1 crédito = 500
 * micros; reserva por kind: test 1, error 2, writing 6, ×2 con el razonador.
 * Coste real de la respuesta simulada (120 + 30 tokens, deepseek-chat): 65 micros.
 *
 * Sesión obligatoria (landing-y-acceso AC-21, plan K-12): preflight → 405 →
 * sesión (401 / 403) → cuerpo → `bad_kind` → … Sin sesión no se lee el cuerpo,
 * no se reserva nada ni se llama al proveedor. El cupo anónimo deja de usarse.
 * El caso "usuario bloqueado → 403" no se puede preparar aquí sin escribir en
 * la base: lo cubren `tests/ai-chat-sesion.test.mts` (Node, pglite) y
 * `ChatEndpointTest` (Laravel, en transacción).
 */

import { test } from "node:test";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import {
  pedir, enviar, esError, esJsonApi, conCors, fila, consulta, login, dispositivoUnico, ipUnica, hashIp,
  ultimaAlSimulado, CLAVES_USUARIO, type Opciones,
} from "./_lib.mts";
import { cuerpoEsperado, PAUSA_LENTO_MS } from "./fake-deepseek.mts";

const MICROS_OK = 65;

function quien(): { device: string; ip: string } {
  return { device: dispositivoUnico(), ip: ipUnica() };
}

/** Sesión nueva: cada test que gasta créditos lleva su usuario (60 al día). */
async function conSesion(): Promise<{ device: string; ip: string; token: string }> {
  const { token } = await login();
  return { ...quien(), token };
}

/** Sesión compartida para los casos que se rechazan antes de reservar. */
let comun: Promise<string> | null = null;
function tokenComun(): Promise<string> {
  comun ??= login().then(l => l.token);
  return comun;
}

function chat(json: unknown, o: Opciones = {}) {
  return pedir("/api/ai/chat", { ...o, json });
}

function marca(): string {
  return `marca-${randomBytes(8).toString("hex")}`;
}

/** Filas de ai_usage de un dispositivo, de la más vieja a la más nueva. */
function usos(device: string) {
  return consulta(
    `select user_id, device_id, ip_hash, kind, model, prompt_tokens, completion_tokens, cost_micros, ok,
            day = current_date as hoy
       from ai_usage where device_id = $1 order by id`, [device]);
}

/* ─────────────── validación y orden de errores ─────────────── */

for (const method of ["GET", "PUT"]) {
  test(`${method} → 405 method_not_allowed`, async () => {
    const r = await pedir("/api/ai/chat", { method, body: method === "PUT" ? "{" : undefined });
    esError(r, 405, "method_not_allowed", "Método no permitido.");
    esJsonApi(r);
  });
}

/* ─────────────── sesión obligatoria (AC-21) ─────────────── */

test("sin Authorization → 401 not_authenticated, sin fila en ai_usage y sin petición al proveedor", async () => {
  const q = quien();
  const m = marca();
  const r = await chat({ kind: "error", payload: { category: "c", text: m } }, { ...q, origin: "https://permitido.example" });
  esError(r, 401, "not_authenticated", "Inicia sesión para continuar.");
  esJsonApi(r);
  assert.equal((await usos(q.device)).length, 0, "no reserva nada");
  assert.equal(await ultimaAlSimulado(m), null, "no llama al proveedor");
});

test("token caducado o desconocido → 401 not_authenticated, sin fila ni petición al proveedor", async () => {
  const q = quien();
  const m = marca();
  const r = await chat({ kind: "error", payload: { text: m } }, { ...q, token: `caducado-${randomBytes(16).toString("hex")}` });
  esError(r, 401, "not_authenticated", "Inicia sesión para continuar.");
  assert.equal((await usos(q.device)).length, 0);
  assert.equal(await ultimaAlSimulado(m), null);
});

test("sin sesión el cupo anónimo ya no se usa: ni con el dispositivo en el cuerpo", async () => {
  const device = dispositivoUnico();
  esError(await chat({ kind: "test", device_id: device }, { ip: ipUnica() }), 401, "not_authenticated");
  assert.equal((await usos(device)).length, 0);
});

test("el 401 va antes que bad_json, 413 y bad_kind", async () => {
  esError(await pedir("/api/ai/chat", { body: "{kind" }), 401, "not_authenticated");
  esError(await pedir("/api/ai/chat", { body: JSON.stringify({ kind: "nada", x: "a".repeat(96 * 1024) }) }),
    401, "not_authenticated");
  esError(await chat({ kind: "nada", payload: {} }, quien()), 401, "not_authenticated");
});

/* ─────────────── validación con sesión ─────────────── */

test("JSON inválido → 400 bad_json", async () => {
  esError(await pedir("/api/ai/chat", { body: "{kind", token: await tokenComun() }), 400, "bad_json", "JSON inválido.");
});

test("cuerpo de más de 96 KB → 413 payload_too_large (antes que bad_kind)", async () => {
  const r = await pedir("/api/ai/chat", {
    body: JSON.stringify({ kind: "nada", x: "a".repeat(96 * 1024) }), token: await tokenComun(),
  });
  esError(r, 413, "payload_too_large", "El texto enviado es demasiado largo.");
});

test("el tope de 96 KB cuenta caracteres, no bytes: 96 KB de 'ñ' pasan el tope", async () => {
  const relleno = "ñ".repeat(96 * 1024 - 40);
  const r = await pedir("/api/ai/chat", { body: JSON.stringify({ kind: "nada", x: relleno }), token: await tokenComun() });
  esError(r, 422, "bad_kind");
});

for (const kind of [undefined, "", "nada", "WRITING", 3]) {
  test(`kind ${JSON.stringify(kind)} → 422 bad_kind`, async () => {
    const r = await chat({ kind, payload: {} }, { ...quien(), token: await tokenComun() });
    esError(r, 422, "bad_kind", "Tipo de petición no reconocido.");
    esJsonApi(r);
  });
}

for (const [kind, payload, mensaje] of [
  ["writing", {}, "Falta el texto."],
  ["writing", { answer: "   " }, "Falta el texto."],
  ["error", { category: "x" }, "Falta la frase."],
  ["tutor", { mode: "general", turns: [] }, "La conversación tiene que terminar en un mensaje tuyo."],
  ["tutor", { turns: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }] },
    "La conversación tiene que terminar en un mensaje tuyo."],
] as const) {
  test(`${kind} ${JSON.stringify(payload)} → 422 bad_payload "${mensaje}"`, async () => {
    const q = { ...quien(), token: await tokenComun() };
    const r = await chat({ kind, payload }, q);
    esError(r, 422, "bad_payload", mensaje);
    assert.equal((await usos(q.device)).length, 0, "no reserva nada");
  });
}

/* ─────────────── stream ─────────────── */

test("200: stream byte a byte, cabeceras SSE y X-Quota-* (con el «- 1» actual), fila con el coste real", async () => {
  const q = await conSesion();
  const res = await enviar("/api/ai/chat", { ...q, json: { kind: "test", payload: {} }, origin: "https://permitido.example" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/event-stream; charset=utf-8");
  assert.equal(res.headers.get("cache-control"), "no-store, no-transform");
  assert.equal(res.headers.get("x-accel-buffering"), "no");
  // Reserva de 1 crédito de los 60 del día → remaining 59; la cabecera resta otro (lo arregla tutor-contextual).
  assert.equal(res.headers.get("x-quota-remaining"), "58");
  assert.equal(res.headers.get("x-quota-limit"), "60");
  conCors(res.headers);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.ok(bytes.equals(Buffer.from(cuerpoEsperado("ok"), "utf8")), "cuerpo idéntico al del simulado");

  const filas = await usos(q.device);
  assert.equal(filas.length, 1);
  const { user_id, ...resto } = filas[0];
  assert.ok(user_id, "la fila lleva el usuario");
  assert.deepEqual(resto, {
    device_id: q.device, ip_hash: hashIp(q.ip), kind: "test", model: "deepseek-chat",
    prompt_tokens: 120, completion_tokens: 30, cost_micros: MICROS_OK, ok: true, hoy: true,
  });
});

test("petición al proveedor: modelo, stream, usage, temperatura 0 en test, max_tokens, mensajes y clave", async () => {
  const r = await chat({ kind: "test", payload: { cualquier: "cosa" } }, await conSesion());
  assert.equal(r.status, 200);
  const ultima = await ultimaAlSimulado('"ping"');
  assert.ok(ultima);
  assert.equal(ultima.authorization, "Bearer contract-fake-key");
  assert.deepEqual(ultima.body, {
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "Reply with exactly: OK" },
      { role: "user", content: "ping" },
    ],
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0,
    max_tokens: 2048,
  });
});

test("temperatura 1 fuera de test; un modelo fuera de la lista se cambia por deepseek-chat", async () => {
  const q = await conSesion();
  const m = marca();
  const r = await chat({ kind: "error", model: "gpt-4o", payload: { category: "c", text: m } }, q);
  assert.equal(r.status, 200);
  const ultima = await ultimaAlSimulado(m);
  assert.equal(ultima?.body.model, "deepseek-chat");
  assert.equal(ultima?.body.temperature, 1);
  assert.equal(ultima?.body.max_tokens, 2048);
  assert.equal((await usos(q.device))[0].model, "deepseek-chat");
});

test("deepseek-reasoner se respeta y reserva el doble", async () => {
  const q = await conSesion();
  const m = marca();
  const r = await chat({ kind: "error", model: "deepseek-reasoner", payload: { text: `${m} FAKE:sin_uso` } }, q);
  assert.equal(r.status, 200, r.text.slice(0, 300));
  const ultima = await ultimaAlSimulado(m);
  assert.equal(ultima?.body.model, "deepseek-reasoner", JSON.stringify(ultima)?.slice(0, 300));
  const filas = await usos(q.device);
  assert.equal(filas.length, 1, JSON.stringify(filas));
  const [f] = filas;
  assert.equal(f.model, "deepseek-reasoner");
  assert.equal(f.cost_micros, 2 * 2 * 500, "sin usage se queda la reserva: 2 créditos × 2");
});

test("sin evento de usage: stream intacto y la fila se queda con la reserva", async () => {
  const q = await conSesion();
  const r = await chat({ kind: "error", payload: { text: "FAKE:sin_uso" } }, q);
  assert.equal(r.status, 200);
  assert.equal(r.text, cuerpoEsperado("sin_uso"));
  const [f] = await usos(q.device);
  assert.equal(f.prompt_tokens, 0);
  assert.equal(f.completion_tokens, 0);
  assert.equal(f.cost_micros, 2 * 500);
  assert.equal(f.ok, true);
});

test("stream lento: el primer trozo llega antes de que el simulado termine; la reserva existe durante el stream", async () => {
  const q = await conSesion();
  const inicio = Date.now();
  const res = await enviar("/api/ai/chat", { ...q, json: { kind: "error", payload: { text: "FAKE:lento" } } });
  assert.equal(res.status, 200);
  const lector = res.body!.getReader();
  const primero = await lector.read();
  const tPrimero = Date.now() - inicio;
  assert.ok(!primero.done && primero.value.length > 0);
  assert.ok(tPrimero < PAUSA_LENTO_MS * 3, `primer trozo a los ${tPrimero} ms`);

  const durante = await usos(q.device);
  assert.equal(durante.length, 1);
  assert.equal(durante[0].cost_micros, 2 * 500, "reserva de 2 créditos mientras dura el stream");
  assert.equal(durante[0].ok, true);

  const trozos = [Buffer.from(primero.value)];
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(Buffer.from(value));
  }
  assert.ok(Date.now() - inicio >= PAUSA_LENTO_MS * 4, "el stream dura lo que tarda el simulado");
  assert.ok(Buffer.concat(trozos).equals(Buffer.from(cuerpoEsperado("lento"), "utf8")));

  const [f] = await usos(q.device);
  assert.equal(f.cost_micros, MICROS_OK);
  assert.equal(f.prompt_tokens, 120);
  assert.equal(f.completion_tokens, 30);
});

/* ─────────────── fallos del proveedor ─────────────── */

for (const [modo, code, message] of [
  ["402", "provider_no_credit", "El servicio de IA se ha quedado sin saldo. Avisa a quien administra la app."],
  ["500", "provider_error", "El servicio de IA no está respondiendo. Inténtalo en un momento."],
  ["caido", "provider_error", "El servicio de IA no está respondiendo. Inténtalo en un momento."],
] as const) {
  test(`proveedor ${modo} → 502 ${code}; la reserva queda anulada (ok=false)`, async () => {
    const q = await conSesion();
    const r = await chat({ kind: "error", payload: { text: `FAKE:${modo}` } }, q);
    esError(r, 502, code, message);
    esJsonApi(r);
    const filas = await usos(q.device);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].ok, false);
    assert.equal(filas[0].cost_micros, 2 * 500);
    // Lo anulado no cuenta en la cuota.
    const cuota = await pedir("/api/quota", q);
    assert.equal(cuota.body.quota.authenticated, true);
    assert.equal(cuota.body.quota.used, 0);
  });
}

/* ─────────────── cuotas ─────────────── */

test("too_fast a la 7.ª llamada del mismo dispositivo en un minuto (aunque cambie la IP)", async () => {
  const { token } = await conSesion();
  const device = dispositivoUnico();
  for (let i = 0; i < 6; i++) {
    const r = await chat({ kind: "test" }, { token, device, ip: ipUnica() });
    assert.equal(r.status, 200, `llamada ${i + 1}: ${r.text}`);
  }
  const r = await chat({ kind: "test" }, { token, device, ip: ipUnica() });
  esError(r, 429, "too_fast", "Vas muy rápido. Espera un minuto y vuelve a intentarlo.");
  esJsonApi(r);
  assert.equal((await usos(device)).length, 6, "el rechazo no deja fila");
});

test("too_fast a la 7.ª llamada de la misma IP en un minuto (sin dispositivo)", async () => {
  const { token } = await conSesion();
  const ip = ipUnica();
  for (let i = 0; i < 6; i++) {
    const r = await chat({ kind: "test" }, { token, ip, device: dispositivoUnico() });
    assert.equal(r.status, 200, `llamada ${i + 1}: ${r.text}`);
  }
  esError(await chat({ kind: "test" }, { token, ip }), 429, "too_fast");
});

test("con cuenta: X-Quota-* de la ventana diaria y 429 user_daily_limit al agotar los 60", async () => {
  const { token } = await login();
  const device = dispositivoUnico();
  const pedirle = () => chat(
    { kind: "writing", model: "deepseek-reasoner", payload: { answer: "FAKE:sin_uso" } },
    { token, device, ip: ipUnica() });

  const primera = await pedirle();
  assert.equal(primera.status, 200);
  assert.equal(primera.headers.get("x-quota-remaining"), "47");
  assert.equal(primera.headers.get("x-quota-limit"), "60");
  assert.equal(primera.headers.get("x-quota-window"), "día");
  for (let i = 0; i < 4; i++) assert.equal((await pedirle()).status, 200);

  const r = await pedirle();
  esError(r, 429, "user_daily_limit", "Has gastado tus 60 créditos de hoy. Se renuevan a medianoche.");
  assert.deepEqual(Object.keys(r.body.error.quota), CLAVES_USUARIO);
  assert.equal(r.body.error.quota.used, 60);

  const filas = await usos(device);
  assert.equal(filas.length, 5);
  const u = await fila(`select user_id from ai_usage where device_id = $1 limit 1`, [device]);
  assert.ok(u?.user_id, "la fila lleva el usuario");
});

test("con cuenta: «te quedan N» cuando no cabe la tarea entera", async () => {
  const { token } = await login();
  const device = dispositivoUnico();
  const reasoner = (answer: string) => chat(
    { kind: "writing", model: "deepseek-reasoner", payload: { answer } }, { token, device, ip: ipUnica() });
  for (let i = 0; i < 4; i++) assert.equal((await reasoner("FAKE:sin_uso")).status, 200);
  // 48 gastados; un error con el razonador (4) cabe → 52; otro writing (12) ya no.
  assert.equal((await chat({ kind: "error", model: "deepseek-reasoner", payload: { text: "FAKE:sin_uso" } },
    { token, device, ip: ipUnica() })).status, 200);
  const r = await reasoner("FAKE:sin_uso");
  esError(r, 429, "user_daily_limit",
    "Te quedan 8 créditos y esta tarea necesita unos 12. Prueba con un texto más corto, con el modelo rápido, o mañana.");
});

test("el dispositivo puede ir en el cuerpo (device_id) en vez de la cabecera", async () => {
  const { token } = await conSesion();
  const device = dispositivoUnico();
  const r = await chat({ kind: "test", device_id: device }, { token, ip: ipUnica() });
  assert.equal(r.status, 200);
  assert.equal((await usos(device)).length, 1);
});
