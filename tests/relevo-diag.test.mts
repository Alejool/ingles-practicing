/**
 * Relevo del diagnóstico de la landing a la app (src/scripts/relevo-diag.ts).
 * landing-y-acceso 1.5 (AC-6b).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CLAVE_RELEVO, serializar, leer, validar, leerMensaje, mensajePide, mensajeDa,
  guardar, leerDe, quitar, darAlPedir, pedir,
} from "../src/scripts/relevo-diag.ts";
import type { RelevoDiag, Canal } from "../src/scripts/relevo-diag.ts";
import { muestraDiag } from "../src/scripts/diag-muestra.ts";
import { DIAG as DIAG_A2B1 } from "../src/data/a2b1/diagnostic.ts";
import { DIAG as DIAG_B1B2 } from "../src/data/b1b2/diagnostic.ts";
import type { DiagItem } from "../src/data/types.ts";

const DIEZ: Record<string, DiagItem[]> = { a2b1: muestraDiag(DIAG_A2B1), b1b2: muestraDiag(DIAG_B1B2) };
const preguntasDe = (t: string) => DIEZ[t] || null;

function relevo(track = "b1b2"): RelevoDiag {
  const respuestas: Record<string, number> = {};
  DIEZ[track].forEach((i, k) => { respuestas[i.id] = k % 4; });
  return { v: 1, track: track as RelevoDiag["track"], respuestas, hecho: "2026-11-05T10:00:00.000Z" };
}

class Almacen {
  datos = new Map<string, string>();
  getItem(k: string) { return this.datos.has(k) ? this.datos.get(k)! : null; }
  setItem(k: string, v: string) { this.datos.set(k, String(v)); }
  removeItem(k: string) { this.datos.delete(k); }
}

/** Dos extremos de un canal en memoria, como dos pestañas con el mismo BroadcastChannel. */
function canales(): [Canal, Canal] {
  const oyentes: Array<Set<(e: { data: unknown }) => void>> = [new Set(), new Set()];
  const extremo = (yo: number): Canal => ({
    postMessage: (m: unknown) => { const otro = oyentes[1 - yo]; queueMicrotask(() => otro.forEach(fn => fn({ data: structuredClone(m) }))); },
    addEventListener: (_t: "message", fn: (e: { data: unknown }) => void) => { oyentes[yo].add(fn); },
    removeEventListener: (_t: "message", fn: (e: { data: unknown }) => void) => { oyentes[yo].delete(fn); },
  });
  return [extremo(0), extremo(1)];
}

/* ── serializar / leer ── */

test("serializar y leer devuelven lo mismo", () => {
  const r = relevo();
  const l = leer(serializar(r), preguntasDe);
  assert.deepEqual(l, { ok: true, valor: r });
});

test("leer: vacío o JSON roto se rechaza con motivo", () => {
  assert.equal(leer(null, preguntasDe).ok, false);
  const roto = leer("{no es json", preguntasDe);
  assert.equal(roto.ok, false);
  assert.match((roto as { motivo: string }).motivo, /JSON/);
});

test("validar: rechaza otra versión", () => {
  assert.equal(validar({ ...relevo(), v: 2 }, preguntasDe).ok, false);
});

test("validar: rechaza una ruta fuera de TRACK_META", () => {
  const r = { ...relevo(), track: "zz99" };
  assert.equal(validar(r, preguntasDe).ok, false);
});

test("validar: rechaza ids que no están en las diez de esa ruta", () => {
  const r = relevo();
  r.respuestas.d2 = 1; // d2 existe en b1b2 pero no está entre las diez
  assert.equal(validar(r, preguntasDe).ok, false);
  const otra = relevo("a2b1");
  assert.equal(validar({ ...otra, track: "b1b2" }, preguntasDe).ok, false, "respuestas de otra ruta");
});

test("validar: rechaza menos de diez respuestas", () => {
  const r = relevo();
  delete r.respuestas.d28;
  assert.equal(validar(r, preguntasDe).ok, false);
});

test("validar: rechaza respuestas que no son índices de opción", () => {
  const r = relevo();
  r.respuestas.d1 = 7;
  assert.equal(validar(r, preguntasDe).ok, false);
  const s = relevo();
  (s.respuestas as Record<string, unknown>).d1 = "2";
  assert.equal(validar(s, preguntasDe).ok, false);
});

test("validar: rechaza una fecha que no es texto y campos que no son objeto", () => {
  assert.equal(validar({ ...relevo(), hecho: 5 }, preguntasDe).ok, false);
  assert.equal(validar({ ...relevo(), respuestas: null }, preguntasDe).ok, false);
  assert.equal(validar([], preguntasDe).ok, false);
});

test("validar: devuelve solo los campos conocidos", () => {
  const l = validar({ ...relevo(), extra: "x" }, preguntasDe);
  assert.ok(l.ok);
  assert.deepEqual(Object.keys((l as { valor: object }).valor).sort(), ["hecho", "respuestas", "track", "v"]);
});

/* ── mensajes del canal ── */

test("mensajes: forma fija", () => {
  assert.deepEqual(mensajePide(), { tipo: "pide" });
  const r = relevo();
  assert.deepEqual(mensajeDa(r), { tipo: "da", resultado: r });
  assert.deepEqual(leerMensaje({ tipo: "pide" }, preguntasDe), { tipo: "pide" });
  assert.deepEqual(leerMensaje({ tipo: "da", resultado: r }, preguntasDe), { tipo: "da", resultado: r });
  assert.equal(leerMensaje({ tipo: "da", resultado: { ...r, v: 9 } }, preguntasDe), null);
  assert.equal(leerMensaje({ tipo: "otro" }, preguntasDe), null);
  assert.equal(leerMensaje("pide", preguntasDe), null);
});

/* ── adaptadores ── */

test("guardar, leerDe y quitar usan la clave ruta-muestra-diag", () => {
  const a = new Almacen();
  const r = relevo();
  guardar(a, r);
  assert.ok(a.getItem(CLAVE_RELEVO));
  assert.equal(CLAVE_RELEVO, "ruta-muestra-diag");
  assert.deepEqual(leerDe(a, preguntasDe), r);
  quitar(a);
  assert.equal(leerDe(a, preguntasDe), null);
});

test("leerDe: un valor inválido se trata como ausente", () => {
  const a = new Almacen();
  a.setItem(CLAVE_RELEVO, JSON.stringify({ ...relevo(), v: 3 }));
  assert.equal(leerDe(a, preguntasDe), null);
});

test("darAlPedir: responde con el resultado y borra la copia local tras responder", async () => {
  const [landing, app] = canales();
  const a = new Almacen();
  const r = relevo();
  guardar(a, r);
  const parar = darAlPedir(a, landing, preguntasDe);

  const recibido = await pedir(app, preguntasDe, 200);
  assert.deepEqual(recibido, r);
  assert.equal(a.getItem(CLAVE_RELEVO), null);
  parar();
});

test("pedir: sin nadie que responda devuelve null al vencer la espera", async () => {
  const [, app] = canales();
  assert.equal(await pedir(app, preguntasDe, 30), null);
});

test("darAlPedir: sin resultado guardado no responde", async () => {
  const [landing, app] = canales();
  const parar = darAlPedir(new Almacen(), landing, preguntasDe);
  assert.equal(await pedir(app, preguntasDe, 30), null);
  parar();
});

test("darAlPedir: parar deja de responder", async () => {
  const [landing, app] = canales();
  const a = new Almacen();
  guardar(a, relevo());
  darAlPedir(a, landing, preguntasDe)();
  assert.equal(await pedir(app, preguntasDe, 30), null);
  assert.ok(a.getItem(CLAVE_RELEVO), "sin responder no se borra");
});

test("pedir: ignora respuestas inválidas", async () => {
  const [landing, app] = canales();
  landing.addEventListener("message", () => landing.postMessage({ tipo: "da", resultado: { ...relevo(), v: 2 } }));
  assert.equal(await pedir(app, preguntasDe, 40), null);
});
