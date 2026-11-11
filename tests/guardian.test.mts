/**
 * El guardián en línea de `index.astro` decide igual que `puedeEntrar(token,
 * leerMarcador())` de `cuenta-local.ts` (revisión de código, hallazgo 3). Se
 * extrae el script del `.astro` y se ejecuta con `localStorage` y `location`
 * falsos sobre los mismos casos.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

import { leerMarcador, puedeEntrar } from "../src/scripts/cuenta-local.ts";

const fuente = await readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8");
const guardian = /<script is:inline slot="head"[^>]*>([\s\S]*?)<\/script>/.exec(fuente)?.[1];

function memoria(datos: Record<string, string>) {
  return { getItem: (k: string) => (k in datos ? datos[k] : null), setItem() {}, removeItem() {} };
}

/** Ejecuta el guardián y devuelve a dónde manda: "app" o la URL de la landing. */
function decide(datos: Record<string, string>, hash = ""): string {
  let destino = "app";
  const contexto = {
    base: "/",
    localStorage: memoria(datos),
    location: { hash, replace: (u: string) => { destino = u; } },
    document: { documentElement: { dataset: {} as Record<string, string> } },
    JSON,
  };
  vm.runInNewContext(guardian!, contexto);
  return destino;
}

const marcador = (o: unknown) => ({ "ruta-b1b2-cuenta": JSON.stringify(o) });
const CASOS: Array<[string, Record<string, string>]> = [
  ["vacío", {}],
  ["token", { "ruta-b1b2-session": "tok" }],
  ["marcador activo", marcador({ v: 1, id: "0123456789abcdef", salida: null })],
  ["marcador con salida", marcador({ v: 1, id: "0123456789abcdef", salida: "2026-11-07T08:00:00.000Z" })],
  ["salida numérica", marcador({ v: 1, id: "0123456789abcdef", salida: 5 })],
  ["salida ausente", marcador({ v: 1, id: "0123456789abcdef" })],
  ["salida objeto", marcador({ v: 1, id: "0123456789abcdef", salida: {} })],
  ["id no hex", marcador({ v: 1, id: "NO-HEX", salida: null })],
  ["otra versión", marcador({ v: 2, id: "0123456789abcdef", salida: null })],
  ["JSON roto", { "ruta-b1b2-cuenta": "{roto" }],
  ["token y salida", { "ruta-b1b2-session": "tok", ...marcador({ v: 1, id: "0123456789abcdef", salida: "x" }) }],
];

test("se encuentra el guardián en index.astro", () => {
  assert.ok(guardian, "falta <script is:inline slot=\"head\"> en index.astro");
});

for (const [nombre, datos] of CASOS) {
  test(`mismo veredicto que puedeEntrar: ${nombre}`, () => {
    const s = memoria(datos);
    const esperado = puedeEntrar(s.getItem("ruta-b1b2-session"), leerMarcador(s)) ? "app" : "/bienvenida/";
    assert.equal(decide(datos), esperado);
  });
}

test("enlace caducado o con error → landing con su aviso, aunque haya sesión", () => {
  assert.equal(decide({ "ruta-b1b2-session": "tok" }, "#auth=expired"), "/bienvenida/#acceso=caducado");
  assert.equal(decide({}, "#auth=error"), "/bienvenida/#acceso=error");
  assert.equal(decide({}, "#auth=tok-nuevo"), "app");
});
