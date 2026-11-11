/**
 * Respaldo de navegación sin red del service worker (public/sw.js): qué página
 * cacheada sirve cada ruta (revisión de código, hallazgo 6).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const fuente = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function cargar(href: string): { paginaSinRed: (pathname: string) => string } {
  const contexto: Record<string, unknown> = {
    self: { addEventListener() {}, location: { href, origin: new URL(href).origin } },
    URL,
  };
  vm.runInNewContext(fuente, contexto);
  return contexto as { paginaSinRed: (pathname: string) => string };
}

test("la landing y lo que cuelga de ella → bienvenida/index.html", () => {
  const sw = cargar("https://x.example/sw.js");
  for (const p of ["/bienvenida", "/bienvenida/", "/bienvenida/index.html"]) {
    assert.equal(sw.paginaSinRed(p), "./bienvenida/index.html", p);
  }
});

test("el resto, incluido lo que solo empieza igual → index.html", () => {
  const sw = cargar("https://x.example/sw.js");
  for (const p of ["/", "/index.html", "/bienvenidas", "/bienvenida-x/", "/otra/bienvenida/"]) {
    assert.equal(sw.paginaSinRed(p), "./index.html", p);
  }
});

test("con la app publicada en un subdirectorio", () => {
  const sw = cargar("https://x.example/ruta/sw.js");
  assert.equal(sw.paginaSinRed("/ruta/bienvenida/"), "./bienvenida/index.html");
  assert.equal(sw.paginaSinRed("/ruta/bienvenidas"), "./index.html");
});
