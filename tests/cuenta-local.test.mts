/**
 * De quién es el progreso de este navegador (src/scripts/cuenta-local.ts).
 * landing-y-acceso 1.7 (AC-12, AC-14, AC-18, AC-20).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CLAVE_CUENTA, CLAVE_COPIA, CLAVES_POR_CUENTA, idDeCuenta, alinear, salir, puedeEntrar, leerMarcador,
} from "../src/scripts/cuenta-local.ts";

class Almacen {
  datos = new Map<string, string>();
  fallarEscritura = false;
  get length() { return this.datos.size; }
  key(i: number) { return [...this.datos.keys()][i] ?? null; }
  getItem(k: string) { return this.datos.has(k) ? this.datos.get(k)! : null; }
  setItem(k: string, v: string) {
    if (this.fallarEscritura) throw new Error("QuotaExceededError");
    this.datos.set(k, String(v));
  }
  removeItem(k: string) { this.datos.delete(k); }
  foto() { return new Map(this.datos); }
}

const V1 = "ruta-b1b2-v1";
const VER = "ruta-b1b2-sync-version";

/** Progreso con formato real: espacios y orden tal cual, para comprobar copias byte a byte. */
const progresoA = JSON.stringify({ track: "b1b2", tracks: { b1b2: { days: { "1": true } } }, theme: "dark", ai: { key: "sk" } });
const progresoB = JSON.stringify({ track: "a2b1", tracks: { a2b1: { days: { "9": true } } }, theme: "light" });

/* ── idDeCuenta ── */

test("idDeCuenta: 16 hex de SHA-256 del correo normalizado, estable", async () => {
  const id = await idDeCuenta("ana@example.com");
  assert.match(id, /^[0-9a-f]{16}$/);
  // sha256("ana@example.com") empieza por estos 16 hex.
  const { createHash } = await import("node:crypto");
  assert.equal(id, createHash("sha256").update("ana@example.com").digest("hex").slice(0, 16));
  assert.equal(await idDeCuenta("  Ana@Example.COM "), id);
  assert.notEqual(await idDeCuenta("otra@example.com"), id);
});

/* ── alinear ── */

test("ADOPTAR: sin marcador, copia literal en ruta-b1b2-v1-copia, marcador escrito y v1 intacto", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(VER, "3");
  const r = alinear(s, "aaaaaaaaaaaaaaaa");
  assert.deepEqual(r, { ok: true, accion: "adoptar" });
  assert.equal(s.getItem(V1), progresoA);
  assert.equal(s.getItem(CLAVE_COPIA), progresoA);
  assert.equal(s.getItem(VER), "3");
  assert.deepEqual(leerMarcador(s), { v: 1, id: "aaaaaaaaaaaaaaaa", salida: null });
});

test("ADOPTAR: sin progreso local no escribe copia", () => {
  const s = new Almacen();
  assert.deepEqual(alinear(s, "aaaaaaaaaaaaaaaa"), { ok: true, accion: "adoptar" });
  assert.equal(s.getItem(CLAVE_COPIA), null);
  assert.ok(leerMarcador(s));
});

test("IGUAL: misma cuenta, borra salida y no toca el progreso", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: "2026-11-05T10:00:00.000Z" }));
  const antes = s.foto();
  assert.deepEqual(alinear(s, "aaaaaaaaaaaaaaaa"), { ok: true, accion: "igual" });
  assert.deepEqual(leerMarcador(s), { v: 1, id: "aaaaaaaaaaaaaaaa", salida: null });
  antes.delete(CLAVE_CUENTA);
  const despues = s.foto();
  despues.delete(CLAVE_CUENTA);
  assert.deepEqual(despues, antes);
});

test("CAMBIAR: archiva A byte a byte, B sin archivo deja v1 ausente, el tema se conserva solo si hay v1", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(VER, "7");
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }));

  assert.deepEqual(alinear(s, "bbbbbbbbbbbbbbbb"), { ok: true, accion: "cambiar" });
  assert.equal(s.getItem(V1 + "@aaaaaaaaaaaaaaaa"), progresoA);
  assert.equal(s.getItem(VER + "@aaaaaaaaaaaaaaaa"), "7");
  assert.equal(s.getItem(V1), null, "B no tenía nada en este navegador");
  assert.equal(s.getItem(VER), null);
  assert.deepEqual(leerMarcador(s), { v: 1, id: "bbbbbbbbbbbbbbbb", salida: null });
});

test("CAMBIAR: con archivo de B lo restaura y le pone el tema del aparato", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: "2026-11-06T10:00:00.000Z" }));
  s.setItem(V1 + "@bbbbbbbbbbbbbbbb", progresoB);
  s.setItem(VER + "@bbbbbbbbbbbbbbbb", "2");

  assert.deepEqual(alinear(s, "bbbbbbbbbbbbbbbb"), { ok: true, accion: "cambiar" });
  const v1 = JSON.parse(s.getItem(V1)!);
  assert.equal(v1.theme, "dark", "el tema es del aparato, no de la cuenta");
  assert.deepEqual(v1.tracks, JSON.parse(progresoB).tracks);
  assert.equal(s.getItem(VER), "2");
});

test("CAMBIAR: volver a A restaura byte a byte", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(VER, "7");
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }));
  alinear(s, "bbbbbbbbbbbbbbbb");
  s.setItem(V1, progresoB.replace('"light"', '"dark"'));
  alinear(s, "aaaaaaaaaaaaaaaa");
  assert.equal(s.getItem(V1), progresoA);
  assert.equal(s.getItem(VER), "7");
  assert.equal(s.getItem(V1 + "@bbbbbbbbbbbbbbbb"), progresoB.replace('"light"', '"dark"'));
});

test("un Storage que falla al escribir: alinear no cambia nada y dice el motivo", () => {
  for (const marcador of [null, { v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }, { v: 1, id: "cccccccccccccccc", salida: null }]) {
    const s = new Almacen();
    s.setItem(V1, progresoA);
    s.setItem(VER, "7");
    if (marcador) s.setItem(CLAVE_CUENTA, JSON.stringify(marcador));
    const antes = s.foto();
    s.fallarEscritura = true;
    const r = alinear(s, "bbbbbbbbbbbbbbbb");
    assert.equal(r.ok, false);
    assert.match((r as { motivo: string }).motivo, /QuotaExceededError/);
    assert.deepEqual(s.foto(), antes);
  }
});

test("CAMBIAR: si falla a mitad, deshace lo escrito y no quita nada", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(VER, "7");
  s.setItem(VER + "@aaaaaaaaaaaaaaaa", "1");
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }));
  const antes = s.foto();
  // Deja escribir la primera copia y falla en la segunda.
  let escrituras = 0;
  const original = s.setItem.bind(s);
  s.setItem = (k: string, v: string) => { if (++escrituras === 2) throw new Error("QuotaExceededError"); original(k, v); };
  const r = alinear(s, "bbbbbbbbbbbbbbbb");
  assert.equal(r.ok, false);
  assert.deepEqual(s.foto(), antes);
});

test("un marcador ilegible cuenta como ausente", () => {
  const s = new Almacen();
  s.setItem(CLAVE_CUENTA, "{roto");
  assert.equal(leerMarcador(s), null);
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "NO-HEX", salida: null }));
  assert.equal(leerMarcador(s), null);
});

/* ── salir / puedeEntrar ── */

test("salir: solo pone la fecha de salida en el marcador", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }));
  const antes = s.foto();
  salir(s, new Date("2026-11-07T08:00:00.000Z"));
  assert.deepEqual(leerMarcador(s), { v: 1, id: "aaaaaaaaaaaaaaaa", salida: "2026-11-07T08:00:00.000Z" });
  antes.delete(CLAVE_CUENTA);
  const despues = s.foto();
  despues.delete(CLAVE_CUENTA);
  assert.deepEqual(despues, antes);
});

test("salir: sin marcador no escribe nada", () => {
  const s = new Almacen();
  salir(s);
  assert.equal(s.length, 0);
});

test("puedeEntrar: token, o marcador sin salida", () => {
  assert.equal(puedeEntrar("tok", null), true);
  assert.equal(puedeEntrar(null, null), false);
  assert.equal(puedeEntrar(null, { v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }), true);
  assert.equal(puedeEntrar(null, { v: 1, id: "aaaaaaaaaaaaaaaa", salida: "2026-11-07T08:00:00.000Z" }), false);
  assert.equal(puedeEntrar("tok", { v: 1, id: "aaaaaaaaaaaaaaaa", salida: "2026-11-07T08:00:00.000Z" }), true);
});

/* ── claves ── */

test("CLAVES_POR_CUENTA coincide con las claves de state.ts y sync.ts", async () => {
  const state = await readFile(new URL("../src/scripts/state.ts", import.meta.url), "utf8");
  const sync = await readFile(new URL("../src/scripts/sync.ts", import.meta.url), "utf8");
  const key = /export const KEY = "([^"]+)"/.exec(state)?.[1];
  const ver = /const VERSION_KEY = "([^"]+)"/.exec(sync)?.[1];
  assert.deepEqual([...CLAVES_POR_CUENTA], [key, ver]);
});

test("CAMBIAR: una clave ausente en la cuenta que sale borra su archivo viejo (no vuelve una versión caducada)", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(VER + "@aaaaaaaaaaaaaaaa", "3");
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }));
  assert.deepEqual(alinear(s, "bbbbbbbbbbbbbbbb"), { ok: true, accion: "cambiar" });
  assert.equal(s.getItem(VER + "@aaaaaaaaaaaaaaaa"), null, "el archivo viejo no sobrevive");
  alinear(s, "aaaaaaaaaaaaaaaa");
  assert.equal(s.getItem(VER), null, "A vuelve sin versión, como la dejó");
  assert.equal(s.getItem(V1), progresoA);
});

test("CAMBIAR: un archivo de la cuenta nueva que no es JSON se restaura tal cual, sin deshacer el cambio", () => {
  const s = new Almacen();
  s.setItem(V1, progresoA);
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: null }));
  s.setItem(V1 + "@bbbbbbbbbbbbbbbb", "{roto");
  assert.deepEqual(alinear(s, "bbbbbbbbbbbbbbbb"), { ok: true, accion: "cambiar" });
  assert.equal(s.getItem(V1), "{roto", "los bytes no se tocan");
  assert.equal(s.getItem(V1 + "@aaaaaaaaaaaaaaaa"), progresoA);
  assert.deepEqual(leerMarcador(s), { v: 1, id: "bbbbbbbbbbbbbbbb", salida: null });
});

test("leerMarcador: una salida que no es texto ni null invalida el marcador", () => {
  const s = new Almacen();
  s.setItem(CLAVE_CUENTA, JSON.stringify({ v: 1, id: "aaaaaaaaaaaaaaaa", salida: 5 }));
  assert.equal(leerMarcador(s), null);
});
