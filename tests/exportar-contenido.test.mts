/**
 * scripts/exportar-contenido.mts: el índice de contenido que lee el backend
 * (rutas válidas para el pulso y las lecturas; contenido para el harness).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { TRACK_META } from "../src/data/tracks.ts";

function exportar(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "contenido-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/exportar-contenido.mts", dir]);
  return dir;
}

const leer = (dir: string, archivo: string) => JSON.parse(readFileSync(path.join(dir, archivo), "utf8"));

test("tracks.json lleva las rutas de TRACK_META, en su orden", () => {
  const dir = exportar();
  const tracks = leer(dir, "tracks.json");
  assert.deepEqual(tracks.map((t: { id: string }) => t.id), TRACK_META.map(t => t.id));
  assert.deepEqual(Object.keys(tracks[0]), ["id", "name", "exam"]);
});

test("cada ruta tiene su índice: unidades, mazos, lecturas, escucha y días con sus referencias", () => {
  const dir = exportar();
  assert.deepEqual(readdirSync(dir).sort(), ["tracks.json", ...TRACK_META.map(t => `${t.id}.json`)].sort());
  for (const { id } of TRACK_META) {
    const r = leer(dir, `${id}.json`);
    assert.deepEqual(Object.keys(r), ["id", "units", "decks", "readings", "listening", "days"]);
    assert.equal(r.id, id);
    assert.ok(r.units.length > 0 && r.units.every((u: any) => typeof u.id === "string" && typeof u.t === "string"));
    assert.ok(r.decks.length > 0 && r.decks.every((d: any) => typeof d.id === "string" && Number.isInteger(d.cards)));
    assert.ok(r.readings.length > 0 && r.readings.every((x: any, i: number) => x.i === i && typeof x.title === "string"));
    assert.ok(r.listening.length > 0 && r.listening.every((x: any, i: number) => x.i === i && typeof x.id === "string"));
    assert.ok(r.days.length > 0);
    const unidades = new Set(r.units.map((u: any) => u.id));
    const mazos = new Set(r.decks.map((d: any) => d.id));
    for (const d of r.days) {
      assert.equal(typeof d.n, "number");
      assert.ok(Array.isArray(d.refs));
      if (d.unit) assert.ok(unidades.has(d.unit), `día ${d.n}: unidad ${d.unit}`);
      if (d.deck) assert.ok(mazos.has(d.deck), `día ${d.n}: mazo ${d.deck}`);
    }
  }
});

test("determinista: dos exportaciones dan los mismos bytes", () => {
  const a = exportar();
  const b = exportar();
  for (const f of readdirSync(a)) {
    assert.equal(readFileSync(path.join(a, f), "utf8"), readFileSync(path.join(b, f), "utf8"), f);
  }
});
