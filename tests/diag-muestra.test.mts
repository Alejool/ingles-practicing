/**
 * Diagnóstico corto (src/scripts/diag-muestra.ts): la selección de diez
 * preguntas del onboarding, la nota y aplicar el resultado al estado.
 * landing-y-acceso 1.1 y 1.3 (AC-3, AC-6b, AC-24).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { muestraDiag, puntuar, aplicarResultado } from "../src/scripts/diag-muestra.ts";
import { DIAG as DIAG_A2B1 } from "../src/data/a2b1/diagnostic.ts";
import { DIAG as DIAG_B1B2 } from "../src/data/b1b2/diagnostic.ts";
import { blankTrack } from "../src/scripts/state.ts";
import type { AppState } from "../src/scripts/state.ts";
import type { DiagItem } from "../src/data/types.ts";

/* ── muestraDiag: caracterización de `muestra()` de onboarding.ts ── */

test("muestraDiag: las diez del onboarding de hoy en b1b2", () => {
  assert.deepEqual(muestraDiag(DIAG_B1B2, 10).map(i => i.id),
    ["d1", "d4", "d7", "d10", "d13", "d16", "d19", "d22", "d25", "d28"]);
});

test("muestraDiag: las diez del onboarding de hoy en a2b1", () => {
  assert.deepEqual(muestraDiag(DIAG_A2B1, 10).map(i => i.id),
    ["d1", "d3", "d6", "d8", "d11", "d13", "d16", "d18", "d21", "d23"]);
});

test("muestraDiag: devuelve los mismos objetos, sin copias", () => {
  const diez = muestraDiag(DIAG_B1B2);
  assert.equal(diez.length, 10);
  assert.ok(diez.every(i => DIAG_B1B2.includes(i)));
});

test("muestraDiag: con menos ítems que n devuelve todos", () => {
  const tres = DIAG_B1B2.slice(0, 3);
  assert.deepEqual(muestraDiag(tres, 10), tres);
});

test("muestraDiag: es determinista", () => {
  assert.deepEqual(muestraDiag(DIAG_B1B2), muestraDiag(DIAG_B1B2));
});

/* ── puntuar ── */

function item(id: string, area: string, a = 0): DiagItem {
  return { id, area, lvl: "B1", q: "?", opts: ["x", "y", "z", "w"], a, exp: "" };
}

/** Diez preguntas en cuatro áreas: T×4, M×3, P×2, V×1. */
const DIEZ: DiagItem[] = [
  item("q1", "Tiempos"), item("q2", "Tiempos"), item("q3", "Modales"), item("q4", "Tiempos"),
  item("q5", "Preposiciones"), item("q6", "Modales"), item("q7", "Tiempos"), item("q8", "Vocabulario"),
  item("q9", "Preposiciones"), item("q10", "Modales"),
];

function respuestas(aciertos: string[]): Record<string, number> {
  const r: Record<string, number> = {};
  DIEZ.forEach(i => { r[i.id] = aciertos.includes(i.id) ? i.a : i.a + 1; });
  return r;
}

test("puntuar: aciertos, pct, semana y día con la escala del onboarding", () => {
  const casos: Array<[string[], number, number, number]> = [
    [[], 0, 1, 1],
    [["q1", "q2", "q3", "q4"], 40, 1, 1],
    [["q1", "q2", "q3", "q4", "q5"], 50, 4, 16],
    [["q1", "q2", "q3", "q4", "q5", "q6", "q7"], 70, 9, 41],
    [["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"], 80, 13, 61],
  ];
  for (const [ok, pct, semana, dia] of casos) {
    const p = puntuar(DIEZ, respuestas(ok));
    assert.equal(p.aciertos, ok.length);
    assert.equal(p.pct, pct);
    assert.equal(p.semana, semana, "semana con " + pct + " %");
    assert.equal(p.dia, dia, "día con " + pct + " %");
  }
});

test("puntuar: por área, en el orden del diagnóstico, con banda", () => {
  // Tiempos 2/4 (50 → nivel), Modales 3/3 (100 → encima), Preposiciones 0/2 (0 → debajo), Vocabulario 1/1.
  const p = puntuar(DIEZ, respuestas(["q1", "q2", "q3", "q6", "q10", "q8"]));
  assert.deepEqual(p.porArea, [
    { area: "Tiempos", ok: 2, n: 4, banda: "nivel" },
    { area: "Modales", ok: 3, n: 3, banda: "encima" },
    { area: "Preposiciones", ok: 0, n: 2, banda: "debajo" },
    { area: "Vocabulario", ok: 1, n: 1, banda: "encima" },
  ]);
});

test("puntuar: los límites de banda son < 50, 50–75 y > 75", () => {
  const cuatro = [item("a", "X"), item("b", "X"), item("c", "X"), item("d", "X")];
  const banda = (ok: number) => {
    const r: Record<string, number> = {};
    cuatro.forEach((i, k) => { r[i.id] = k < ok ? i.a : i.a + 1; });
    return puntuar(cuatro, r).porArea[0].banda;
  };
  assert.equal(banda(1), "debajo");   // 25
  assert.equal(banda(2), "nivel");    // 50
  assert.equal(banda(3), "nivel");    // 75
  assert.equal(banda(4), "encima");   // 100
});

test("puntuar: con menos respuestas que preguntas da un error explícito", () => {
  const r = respuestas([]);
  delete r.q10;
  assert.throws(() => puntuar(DIEZ, r), /Faltan 1 respuesta/);
});

test("puntuar: los ids ajenos se ignoran", () => {
  const r = { ...respuestas(["q1"]), zz: 0, d99: 3 };
  const p = puntuar(DIEZ, r);
  assert.equal(p.aciertos, 1);
  assert.deepEqual(Object.keys(p.respuestas).sort(), DIEZ.map(i => i.id).sort());
});

test("puntuar: una respuesta ajena no tapa una que falta", () => {
  const r: Record<string, number> = { ...respuestas([]), zz: 0 };
  delete r.q1;
  assert.throws(() => puntuar(DIEZ, r), /Faltan 1 respuesta/);
});

/* ── aplicarResultado ── */

function estado(): AppState {
  return {
    track: "b1b2",
    tracks: { a2b1: blankTrack(), b1b2: blankTrack() },
    errors: [{ id: 1, text: "e", cat: "g", d: "2026-10-01" }], seen: ["x"],
    streak: { days: ["2026-10-01"], last: "2026-10-01" }, examDate: null, theme: "dark", ai: {}, onboarded: false,
  };
}

test("aplicarResultado: escribe diag, stats.diag, current y track como el paso 3 del onboarding", () => {
  const s = estado();
  const p = puntuar(DIEZ, respuestas(["q1", "q2", "q3", "q4", "q5", "q6", "q7"]));
  const antes = structuredClone(s);

  assert.equal(aplicarResultado(s, "a2b1", p), "aplicado");

  assert.equal(s.track, "a2b1");
  assert.deepEqual(s.tracks.a2b1.diag, { answers: p.respuestas, done: false, score: { right: 7, pct: 70 } });
  assert.deepEqual(s.tracks.a2b1.stats.diag, { ok: 7, n: 10 });
  assert.equal(s.tracks.a2b1.current, 41);

  // El resto queda igual.
  const esperado = structuredClone(antes);
  esperado.track = "a2b1";
  esperado.tracks.a2b1.diag = s.tracks.a2b1.diag;
  esperado.tracks.a2b1.stats = { diag: { ok: 7, n: 10 } };
  esperado.tracks.a2b1.current = 41;
  assert.deepEqual(s, esperado);
});

test("aplicarResultado: las respuestas guardadas son una copia", () => {
  const s = estado();
  const p = puntuar(DIEZ, respuestas([]));
  aplicarResultado(s, "b1b2", p);
  p.respuestas.q1 = 3;
  assert.notEqual(s.tracks.b1b2.diag.answers.q1, 3);
});

test("aplicarResultado: con diagnóstico empezado o hecho en esa ruta no cambia nada", () => {
  const p = puntuar(DIEZ, respuestas(["q1"]));

  const empezado = estado();
  empezado.tracks.b1b2.diag = { answers: { d1: 2 }, done: false, score: null };
  const copia1 = structuredClone(empezado);
  assert.equal(aplicarResultado(empezado, "b1b2", p), "ignorado");
  assert.deepEqual(empezado, copia1);

  const hecho = estado();
  hecho.tracks.b1b2.diag = { answers: {}, done: true, score: { right: 20, pct: 66 } };
  const copia2 = structuredClone(hecho);
  assert.equal(aplicarResultado(hecho, "b1b2", p), "ignorado");
  assert.deepEqual(hecho, copia2);
});

test("aplicarResultado: un diagnóstico en otra ruta no lo impide", () => {
  const s = estado();
  s.tracks.b1b2.diag = { answers: { d1: 2 }, done: true, score: { right: 1, pct: 3 } };
  assert.equal(aplicarResultado(s, "a2b1", puntuar(DIEZ, respuestas([]))), "aplicado");
});

test("aplicarResultado: ruta sin progreso en el estado → error explícito", () => {
  const s = estado();
  assert.throws(() => aplicarResultado(s, "zz99" as any, puntuar(DIEZ, respuestas([]))), /zz99/);
});
