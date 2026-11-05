/**
 * /api/readings: biblioteca compartida. GET público; POST publica (con sesión)
 * o suma una lectura (`?id=…&read=1`, sin sesión).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { pedir, login, esError, esJsonApi, conCors, fila, ADMIN_TOKEN, ISO } from "./_lib.mts";

const PREGUNTA = { q: "¿Qué?", o: ["a", "b", "c", "d"], a: 0, e: "Porque sí." };

function lectura(extra: Record<string, unknown> = {}) {
  return {
    title: "Contrato",
    body: ["Primer párrafo con algo de texto.", "Segundo párrafo."],
    qs: [PREGUNTA, PREGUNTA, PREGUNTA],
    ...extra,
  };
}

function idUnico(): string {
  return `ct-${randomBytes(6).toString("hex")}`;
}

function publicar(token: string | undefined, json: unknown) {
  return pedir("/api/readings", { method: "POST", token, json });
}

/** Instante justo antes de publicar, para listar solo lo de este test con `after`. */
async function ahoraEnLaBase(): Promise<string> {
  const f = await fila<{ t: Date }>(`select now() - interval '1 millisecond' as t`);
  return f!.t.toISOString();
}

const CLAVES_FILA = ["id", "created_at", "track", "level", "topic", "title", "words", "data", "reads"];

test("GET → {textos}, Cache-Control public, max-age=120 y CORS", async () => {
  const r = await pedir("/api/readings?track=b1b2", { origin: "https://permitido.example" });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body), ["textos"]);
  assert.ok(Array.isArray(r.body.textos));
  assert.equal(r.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(r.headers.get("cache-control"), "public, max-age=120");
  conCors(r.headers);
});

test("POST sin sesión → 401 con su mensaje propio", async () => {
  const r = await publicar(undefined, { id: idUnico(), data: lectura() });
  esError(r, 401, "not_authenticated", "Entra con tu correo para publicar textos en la biblioteca.");
  esJsonApi(r);
});

for (const method of ["PUT", "DELETE"]) {
  test(`${method} → 405 method_not_allowed`, async () => {
    esError(await pedir("/api/readings", { method, body: "{}" }), 405, "method_not_allowed", "Método no permitido.");
  });
}

test("publicar → {ok, id}; GET la devuelve con su forma; la explicación se guarda saneada", async () => {
  const { token } = await login();
  const id = idUnico();
  const desde = await ahoraEnLaBase();
  const e = `Mira <B>esto</B> & <script>alert("x")</script> <i onclick="y">z</i> &amp; it's`;
  const r = await publicar(token, {
    id, track: "a2b1", level: "B1", topic: "  Viajes  ",
    data: lectura({ title: "  Título largo  ", extra: "se descarta", qs: [PREGUNTA, PREGUNTA, { ...PREGUNTA, e }] }),
  });
  assert.equal(r.status, 200, r.text);
  esJsonApi(r);
  assert.equal(r.text, JSON.stringify({ ok: true, id }));

  const g = await pedir(`/api/readings?track=a2b1&after=${encodeURIComponent(desde)}`);
  const t = g.body.textos.find((x: any) => x.id === id);
  assert.ok(t, "aparece en la biblioteca");
  assert.deepEqual(Object.keys(t), CLAVES_FILA);
  assert.match(t.created_at, ISO);
  assert.equal(t.track, "a2b1");
  assert.equal(t.level, "B1");
  assert.equal(t.topic, "Viajes");
  assert.equal(t.title, "Título largo");
  assert.equal(t.words, 8);
  assert.equal(t.reads, 0);
  assert.deepEqual(Object.keys(t.data), ["qs", "body", "title"], "orden de claves de jsonb");
  assert.deepEqual(t.data.body, ["Primer párrafo con algo de texto.", "Segundo párrafo."]);
  assert.equal(t.data.title, "Título largo");
  assert.equal(t.data.qs[2].e,
    "Mira <b>esto</b> &amp; &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &lt;i onclick=&quot;y&quot;&gt;z</i> &amp; it&#39;s");
  assert.equal(t.data.qs[0].e, "Porque sí.");
});

test("sin id, con e ausente, sin title ni level: id generado, e vacía, título y nivel por defecto", async () => {
  const { token } = await login();
  const sinE = { q: "x", o: ["a", "b", "c", "d"], a: 3 };
  const r = await publicar(token, { data: { body: ["uno", "dos"], qs: [sinE, sinE, sinE] } });
  assert.equal(r.status, 200, r.text);
  assert.match(r.body.id, /^[a-z0-9]{9,}$/);
  const f = await fila(`select track, level, topic, title, words, data from shared_readings where id = $1`, [r.body.id]);
  assert.equal(f?.track, "b1b2");
  assert.equal(f?.level, "B2");
  assert.equal(f?.topic, "");
  assert.equal(f?.title, "Texto generado");
  assert.equal(f?.words, 2);
  assert.equal(f?.data.qs[0].e, "");
});

test("track del cuerpo fuera de lista → el de la query, y si no, b1b2", async () => {
  const { token } = await login();
  const id = idUnico();
  const r = await pedir("/api/readings?track=a2b1", { method: "POST", token, json: { id, track: "c1c2", data: lectura() } });
  assert.equal(r.status, 200, r.text);
  assert.equal((await fila(`select track from shared_readings where id = $1`, [id]))?.track, "a2b1");
});

test("GET con track desconocido → b1b2", async () => {
  const { token } = await login();
  const id = idUnico();
  const desde = await ahoraEnLaBase();
  await publicar(token, { id, data: lectura() });
  for (const q of ["track=zzz", "", "track=B1B2"]) {
    const g = await pedir(`/api/readings?${q}&after=${encodeURIComponent(desde)}`);
    assert.ok(g.body.textos.some((x: any) => x.id === id), q);
  }
  const otra = await pedir(`/api/readings?track=a2b1&after=${encodeURIComponent(desde)}`);
  assert.ok(!otra.body.textos.some((x: any) => x.id === id));
});

test("after filtra por created_at; orden de más nueva a más vieja", async () => {
  const { token } = await login();
  const [a, b] = [idUnico(), idUnico()];
  const desde = await ahoraEnLaBase();
  await publicar(token, { id: a, data: lectura() });
  // `after` va con milisegundos y la base guarda microsegundos: margen a los dos lados.
  await new Promise(r => setTimeout(r, 10));
  const medio = await ahoraEnLaBase();
  await new Promise(r => setTimeout(r, 10));
  await publicar(token, { id: b, data: lectura() });
  const todas = (await pedir(`/api/readings?after=${encodeURIComponent(desde)}`)).body.textos.map((x: any) => x.id);
  assert.ok(todas.indexOf(b) < todas.indexOf(a) && todas.indexOf(a) >= 0);
  const nuevas = (await pedir(`/api/readings?after=${encodeURIComponent(medio)}`)).body.textos.map((x: any) => x.id);
  assert.ok(nuevas.includes(b) && !nuevas.includes(a));
});

test("las ocultas por el administrador no se sirven", async () => {
  const { token } = await login();
  const id = idUnico();
  const desde = await ahoraEnLaBase();
  await publicar(token, { id, data: lectura() });
  const h = await pedir(`/api/admin?token=${ADMIN_TOKEN}&op=hide&id=${id}`, { method: "POST" });
  assert.equal(h.status, 200, h.text);
  const g = await pedir(`/api/readings?after=${encodeURIComponent(desde)}`);
  assert.ok(!g.body.textos.some((x: any) => x.id === id));
});

test("un id repetido no sobrescribe: {ok:true, id} y se queda el primero", async () => {
  const { token } = await login();
  const id = idUnico();
  await publicar(token, { id, data: lectura({ title: "Primero" }) });
  const r = await publicar(token, { id, data: lectura({ title: "Segundo" }) });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, id });
  assert.equal((await fila(`select title from shared_readings where id = $1`, [id]))?.title, "Primero");
});

test("?id=…&read=1 suma una lectura sin sesión ni cuerpo; un id inexistente también responde ok", async () => {
  const { token } = await login();
  const id = idUnico();
  await publicar(token, { id, data: lectura() });
  for (let i = 0; i < 2; i++) {
    const r = await pedir(`/api/readings?id=${id}&read=1`, { method: "POST" });
    assert.equal(r.status, 200);
    esJsonApi(r);
    assert.equal(r.text, '{"ok":true}');
  }
  assert.equal((await fila(`select reads from shared_readings where id = $1`, [id]))?.reads, 2);
  const nada = await pedir(`/api/readings?id=no-existe&read=1`, { method: "POST" });
  assert.equal(nada.text, '{"ok":true}');
});

const PREGUNTA_MAL = (cambio: Record<string, unknown>) => [PREGUNTA, PREGUNTA, { ...PREGUNTA, ...cambio }];

for (const [nombre, data, code, mensaje] of [
  ["sin data", undefined, "bad_payload", "Falta el texto."],
  ["data no objeto", "texto", "bad_payload", "Falta el texto."],
  ["un párrafo", lectura({ body: ["solo uno"] }), "bad_payload", "El texto tiene que traer al menos dos párrafos."],
  ["párrafos vacíos no cuentan", lectura({ body: ["uno", "   ", 3] }), "bad_payload", "El texto tiene que traer al menos dos párrafos."],
  ["dos preguntas", lectura({ qs: [PREGUNTA, PREGUNTA] }), "bad_payload", "El texto tiene que traer al menos tres preguntas."],
  ["tres opciones", lectura({ qs: PREGUNTA_MAL({ o: ["a", "b", "c"] }) }), "bad_payload", "Alguna pregunta no tiene cuatro opciones."],
  ["opción no texto", lectura({ qs: PREGUNTA_MAL({ o: ["a", "b", "c", 4] }) }), "bad_payload", "Alguna pregunta no tiene cuatro opciones."],
  ["q no texto", lectura({ qs: PREGUNTA_MAL({ q: 1 }) }), "bad_payload", "Alguna pregunta no tiene cuatro opciones."],
  ["a = 4", lectura({ qs: PREGUNTA_MAL({ a: 4 }) }), "bad_payload", "Alguna pregunta no marca cuál es la correcta."],
  ["a = 1.5", lectura({ qs: PREGUNTA_MAL({ a: 1.5 }) }), "bad_payload", "Alguna pregunta no marca cuál es la correcta."],
  ["a = '1'", lectura({ qs: PREGUNTA_MAL({ a: "1" }) }), "bad_payload", "Alguna pregunta no marca cuál es la correcta."],
  ["e número", lectura({ qs: PREGUNTA_MAL({ e: 5 }) }), "bad_payload", "Alguna explicación no es texto."],
  ["más de 1500 palabras", lectura({ body: ["palabra ".repeat(1000).trim(), "palabra ".repeat(501).trim()] }),
    "payload_too_large", "El texto es demasiado largo."],
] as const) {
  test(`validación: ${nombre} → 422 ${code}`, async () => {
    const { token } = await login();
    const r = await publicar(token, { id: idUnico(), data });
    esError(r, 422, code, mensaje);
    esJsonApi(r);
  });
}

test("e null se acepta y se guarda vacía", async () => {
  const { token } = await login();
  const id = idUnico();
  const r = await publicar(token, { id, data: lectura({ qs: PREGUNTA_MAL({ e: null }) }) });
  assert.equal(r.status, 200, r.text);
  assert.equal((await fila(`select data from shared_readings where id = $1`, [id]))?.data.qs[2].e, "");
});

for (const id of ["con espacio", "a".repeat(65), "ñ", 12, "a/b"]) {
  test(`id no válido ${JSON.stringify(id).slice(0, 20)} → 422 bad_payload`, async () => {
    const { token } = await login();
    esError(await publicar(token, { id, data: lectura() }), 422, "bad_payload", "El identificador del texto no es válido.");
  });
}

test("la validación del texto va antes que la del id", async () => {
  const { token } = await login();
  esError(await publicar(token, { id: "mal id", data: lectura({ body: [] }) }), 422, "bad_payload",
    "El texto tiene que traer al menos dos párrafos.");
});

test("cuerpo de más de 128 KB → 413 payload_too_large", async () => {
  const { token } = await login();
  const r = await publicar(token, { id: idUnico(), data: lectura(), x: "a".repeat(128 * 1024) });
  esError(r, 413, "payload_too_large", "El texto enviado es demasiado largo.");
});
