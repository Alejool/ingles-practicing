/**
 * Fusión del progreso (src/scripts/merge.ts).
 *
 * Caracterización (ruta-b2-c1 2.4): fija lo que hace hoy la fusión con dos
 * estados de dos rutas. Si una regla cambia a propósito (landing-y-acceso 1.9),
 * se cambia aquí la fila afectada con su motivo, no el resto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeState, mergeTrack } from "../src/scripts/merge.ts";
import { blankTrack } from "../src/scripts/state.ts";
import type { AppState, TrackProgress } from "../src/scripts/state.ts";

function pista(p: Partial<TrackProgress>): TrackProgress {
  return Object.assign(blankTrack(), structuredClone(p));
}

function estado(p: Partial<AppState>): AppState {
  return Object.assign({
    track: "b1b2",
    tracks: { a2b1: blankTrack(), b1b2: blankTrack() },
    errors: [], seen: [], streak: { days: [], last: null }, examDate: null, theme: null, ai: {}, onboarded: false,
  } as AppState, structuredClone(p));
}

const palabra = (en: string, o: Partial<Record<string, unknown>> = {}) =>
  ({ id: en, en, es: "x", ex: "", box: 2, fails: 1, seen: 3, due: 100, again: false, ...o }) as any;

const LOCAL = estado({
  track: "b1b2",
  tracks: {
    a2b1: pista({ days: { "1": true }, current: 2 }),
    b1b2: pista({
      days: { "1": true, "2": true },
      current: 5,
      diag: { answers: { d1: 0 }, done: true, score: { right: 6, pct: 60 } },
      srs: { "c:1": { b: 2, due: 500 }, "c:2": { b: 1, due: 900, seen: 4 } },
      gram: { u1: { q1: true, q2: false }, u2: { q1: true } },
      uoe: { t1: { ok: false, v: "a" }, t2: { ok: true, v: "b" } },
      mock: { best: 40, current: 1, history: [{ d: "2026-10-01", s: 20, cs: 140 }] },
      writing: { w1: { text: "corto", chk: { 0: false, 1: true } } },
      stats: { gram: { ok: 3, n: 5 } },
      steps: { "2": [true, false] },
      counters: { "2026-10-01": { cards: 5, drills: 1 } },
      mine: [palabra("cope", { box: 3, fails: 1, seen: 2, due: 300 })],
      gen: [{ id: "g1", made: 10, level: "B1", topic: "t", text: {} as any }],
      read: { r1: 1 },
      quiz: { best: 7, history: [{ at: 1, right: 7, total: 10, secs: 60, areas: [] }] },
      known: { "core:1": true },
    }),
  },
  errors: [{ id: 2, text: "e2", cat: "g", d: "2026-10-01" }],
  seen: ["logro-a"],
  streak: { days: ["2026-10-01", "2026-10-02"], last: "2026-10-02" },
  examDate: null,
  theme: "dark",
  ai: { key: "sk-local" },
  onboarded: true,
});

const REMOTO: Partial<AppState> = estado({
  track: "a2b1",
  tracks: {
    a2b1: pista({ days: { "3": true }, current: 4, known: { "core:9": true } }),
    b1b2: pista({
      days: { "3": true },
      current: 3,
      diag: { answers: { d1: 1 }, done: true, score: { right: 8, pct: 80 } },
      srs: { "c:1": { b: 3, due: 100 }, "c:2": { b: 0, due: 50, seen: 9 }, "c:3": { b: 1, due: 10 } },
      gram: { u1: { q1: false, q2: true, q3: true }, u3: { q1: true } },
      uoe: { t1: { ok: true, v: "c" }, t3: { ok: false, v: "d" } },
      mock: { best: 50, current: 2, history: [{ d: "2026-09-01", s: 25, cs: 150 }, { d: "2026-10-01", s: 20, cs: 140 }] },
      writing: { w1: { text: "un texto más largo", chk: { 0: true, 1: false, 2: true } }, w2: { text: "nuevo", chk: {} } },
      stats: { gram: { ok: 2, n: 9 }, vocab: { ok: 1, n: 1 } },
      steps: { "2": [false, true, true], "3": [true] },
      counters: { "2026-10-01": { cards: 2, drills: 4 }, "2026-10-03": { cards: 1 } },
      mine: [palabra("cope", { box: 1, fails: 4, seen: 5, due: 200, ex: "I cope." }), palabra("thrive")],
      gen: [{ id: "g1", made: 10, level: "B1", topic: "t", text: {} as any }, { id: "g2", made: 20, level: "B1", topic: "u", text: {} as any }],
      read: { r1: 3, r2: 1 },
      quiz: { best: 9, history: [{ at: 1, right: 7, total: 10, secs: 60, areas: [] }, { at: 2, right: 9, total: 10, secs: 50, areas: [] }] },
      known: { "core:2": true },
    }),
  },
  errors: [{ id: 1, text: "e1", cat: "v", d: "2026-09-30" }, { id: 2, text: "e2-remoto", cat: "g", d: "2026-10-01" }],
  seen: ["logro-b"],
  streak: { days: ["2026-10-02", "2026-10-03"], last: "2026-10-03" },
  examDate: "2027-01-15",
  onboarded: false,
});

/* ── 2.4 Caracterización: fusión hoy ── */

test("caracterización: mergeState sin remoto devuelve lo local tal cual", () => {
  assert.equal(mergeState(LOCAL, null), LOCAL);
});

test("caracterización: lo común a las rutas", () => {
  const m = mergeState(LOCAL, REMOTO);
  assert.equal(m.track, "b1b2", "la ruta activa es la local");
  assert.deepEqual(m.errors.map(e => [e.id, e.text]), [[1, "e1"], [2, "e2"]], "unión por id; a igualdad, lo local");
  assert.deepEqual(m.streak, { days: ["2026-10-01", "2026-10-02", "2026-10-03"], last: "2026-10-03" });
  assert.equal(m.examDate, "2027-01-15", "sin fecha local se toma la remota");
  assert.equal(m.theme, "dark");
  assert.deepEqual(m.ai, { key: "sk-local" });
  assert.deepEqual(m.seen, ["logro-a"], "hoy los logros remotos se pierden");
  assert.equal(m.onboarded, true, "hoy onboarded es el local");
});

test("caracterización: ruta b1b2", () => {
  const t = mergeState(LOCAL, REMOTO).tracks.b1b2;
  assert.deepEqual(t.days, { "1": true, "2": true, "3": true });
  assert.equal(t.current, 5);
  assert.deepEqual(t.diag, { answers: { d1: 1 }, done: true, score: { right: 8, pct: 80 } });
  assert.deepEqual(t.srs, { "c:1": { b: 3, due: 100 }, "c:2": { b: 1, due: 900, seen: 4 }, "c:3": { b: 1, due: 10 } });
  assert.deepEqual(t.gram, { u1: { q1: false, q2: true, q3: true }, u2: { q1: true }, u3: { q1: true } },
    "hoy gana la unidad entera con más claves");
  assert.deepEqual(t.uoe, { t1: { ok: true, v: "c" }, t2: { ok: true, v: "b" }, t3: { ok: false, v: "d" } });
  assert.deepEqual(t.mock, {
    best: 50, current: 2,
    history: [{ d: "2026-09-01", s: 25, cs: 150 }, { d: "2026-10-01", s: 20, cs: 140 }],
  });
  assert.deepEqual(t.writing, {
    w1: { text: "un texto más largo", chk: { 0: false, 1: true, 2: true } },
    w2: { text: "nuevo", chk: {} },
  }, "hoy un chk local false pisa un true remoto");
  assert.deepEqual(t.stats, { gram: { ok: 3, n: 9 }, vocab: { ok: 1, n: 1 } });
  assert.deepEqual(t.steps, { "2": [true, true, true], "3": [true] });
  assert.deepEqual(t.counters, { "2026-10-01": { cards: 5, drills: 4 }, "2026-10-03": { cards: 1 } });
  assert.deepEqual(t.mine.map(w => [w.en, w.box, w.fails, w.seen, w.due, w.ex]),
    [["cope", 1, 4, 5, 200, "I cope."], ["thrive", 2, 1, 3, 100, ""]]);
  assert.deepEqual(t.gen.map(g => g.id), ["g2", "g1"]);
  assert.deepEqual(t.read, { r1: 3, r2: 1 });
  assert.equal(t.quiz.best, 9);
  assert.deepEqual(t.quiz.history.map(h => h.at), [1, 2]);
  assert.deepEqual(t.known, { "core:1": true }, "hoy known remoto se pierde");
});

test("caracterización: ruta a2b1", () => {
  const t = mergeState(LOCAL, REMOTO).tracks.a2b1;
  assert.deepEqual(t.days, { "1": true, "3": true });
  assert.equal(t.current, 4);
  assert.deepEqual(t.known, {});
});

test("caracterización: no muta sus argumentos", () => {
  const a = structuredClone(LOCAL);
  const b = structuredClone(REMOTO);
  mergeState(a, b);
  assert.deepEqual(a, LOCAL);
  assert.deepEqual(b, REMOTO);
});

test("caracterización: mergeTrack sobre una ruta en blanco toma lo remoto", () => {
  const r = REMOTO.tracks!.a2b1;
  const t = mergeTrack(blankTrack(), r);
  assert.deepEqual(t.days, { "3": true });
  assert.equal(t.current, 4);
});

test("sync.ts reexporta mergeState de merge.ts", async () => {
  const fs = await import("node:fs/promises");
  const src = await fs.readFile(new URL("../src/scripts/sync.ts", import.meta.url), "utf8");
  assert.match(src, /from "\.\/merge(\.ts)?"/);
  assert.doesNotMatch(src, /function mergeTrack/);
  assert.match(src, /export \{[^}]*mergeState[^}]*\}/);
});

/* ── 2.5 Fusión con rutas nuevas (ruta-b2-c1 AC-36) ── */

function conRutas(base: AppState, extra: Record<string, TrackProgress>): AppState {
  const s = structuredClone(base);
  Object.assign(s.tracks as Record<string, TrackProgress>, structuredClone(extra));
  return s;
}

test("rutas nuevas: b2c1 solo en remoto aparece en el resultado", () => {
  const remoto = conRutas(REMOTO as AppState, { b2c1: pista({ days: { "7": true }, current: 7 }) });
  const t = (mergeState(LOCAL, remoto).tracks as Record<string, TrackProgress>).b2c1;
  assert.ok(t, "b2c1 llega");
  assert.deepEqual(t.days, { "7": true });
  assert.equal(t.current, 7);
});

test("rutas nuevas: b2c1 solo en local se conserva", () => {
  const local = conRutas(LOCAL, { b2c1: pista({ days: { "2": true }, current: 2 }) });
  const t = (mergeState(local, REMOTO).tracks as Record<string, TrackProgress>).b2c1;
  assert.deepEqual(t.days, { "2": true });
});

test("rutas nuevas: b2c1 y zz99 en los dos lados se funden con las mismas reglas", () => {
  for (const id of ["b2c1", "zz99"]) {
    const local = conRutas(LOCAL, { [id]: pista({ days: { "1": true }, current: 2 }) });
    const remoto = conRutas(REMOTO as AppState, { [id]: pista({ days: { "4": true }, current: 5 }) });
    const t = (mergeState(local, remoto).tracks as Record<string, TrackProgress>)[id];
    assert.deepEqual(t.days, { "1": true, "4": true }, id);
    assert.equal(t.current, 5, id);
  }
});

test("rutas nuevas: con rutas extra, a2b1 y b1b2 dan lo mismo que sin ellas", () => {
  const sin = mergeState(LOCAL, REMOTO);
  const con = mergeState(conRutas(LOCAL, { zz99: pista({}) }), conRutas(REMOTO as AppState, { b2c1: pista({}) }));
  assert.deepEqual(con.tracks.a2b1, sin.tracks.a2b1);
  assert.deepEqual(con.tracks.b1b2, sin.tracks.b1b2);
});

test("rutas nuevas: la ruta activa local no la pisa el remoto", () => {
  const local = structuredClone(LOCAL);
  (local as any).track = "b2c1";
  const remoto = conRutas(REMOTO as AppState, { b2c1: pista({}) });
  assert.equal(mergeState(local, remoto).track, "b2c1");
});
