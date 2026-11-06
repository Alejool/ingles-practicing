import { test } from "node:test";
import assert from "node:assert/strict";

import { ratio } from "./ui/util/contraste.ts";

test("negro sobre terracota #C2703F mide 5,68:1", () => {
  assert.ok(Math.abs(ratio("#000000", "#C2703F") - 5.68) <= 0.01);
});

test("un color contra sí mismo mide 1:1", () => {
  assert.equal(ratio("#FFFFFF", "#FFFFFF"), 1);
});

test("el orden de los colores no cambia el resultado", () => {
  assert.equal(ratio("#C2703F", "#000000"), ratio("#000000", "#C2703F"));
});

test("negro sobre blanco mide 21:1", () => {
  assert.equal(ratio("#000", "#fff"), 21);
});

test("acepta rgb() y rgba() opacos con el mismo resultado que el hex", () => {
  const hex = ratio("#000000", "#C2703F");
  assert.equal(ratio("rgb(0, 0, 0)", "rgb(194, 112, 63)"), hex);
  assert.equal(ratio("rgba(0, 0, 0, 1)", "rgba(194, 112, 63, 1)"), hex);
});

test("rechaza un color translúcido con un error que lo nombra", () => {
  assert.throws(() => ratio("rgba(0, 0, 0, 0.5)", "#FFFFFF"), /translúcido.*rgba\(0, 0, 0, 0\.5\)/);
  assert.throws(() => ratio("#000000", "#FFFFFF80"), /translúcido/);
});

test("rechaza lo que no es un color reconocible", () => {
  assert.throws(() => ratio("transparent", "#FFFFFF"), /no reconocido.*transparent/);
});
