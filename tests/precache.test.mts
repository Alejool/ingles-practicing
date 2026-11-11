/**
 * Reparto del precache (scripts/precache-lib.mts): qué se instala de golpe
 * (esqueleto) y qué se guarda al usarse (contenido). landing-y-acceso 3.16 (AC-7):
 * la landing y sus bundles van en el esqueleto, para abrir sin red.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { clasificar } from "../scripts/precache-lib.mts";

const BUILD = [
  "./index.html",
  "./bienvenida/index.html",
  "./sw.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./_assets/Base.abc.css",
  "./_assets/index.astro_astro_type_script_index_0_lang.abc.js",
  "./_assets/main.abc.js",
  "./_assets/bienvenida.astro_astro_type_script_index_0_lang.abc.js",
  "./_assets/uoe.abc.js",
  "./_assets/voice.abc.js",
  "./_assets/a2b1.abc.js",
  "./_assets/b1b2.abc.js",
  "./_assets/reading3.abc.js",
  "./admin.html",
];

test("la landing (página y bundles) va en el esqueleto", () => {
  const { esqueleto } = clasificar(BUILD);
  for (const r of ["./bienvenida/", "./bienvenida/index.html", "./_assets/bienvenida.astro_astro_type_script_index_0_lang.abc.js",
    "./_assets/uoe.abc.js", "./_assets/voice.abc.js"]) {
    assert.ok(esqueleto.includes(r), r);
  }
});

test("la app sigue igual: raíz, index, manifest, iconos, css y js de arranque en el esqueleto", () => {
  const { esqueleto } = clasificar(BUILD);
  for (const r of ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./_assets/Base.abc.css",
    "./_assets/main.abc.js", "./_assets/index.astro_astro_type_script_index_0_lang.abc.js"]) {
    assert.ok(esqueleto.includes(r), r);
  }
});

test("el contenido de las rutas y las lecturas va aparte; sw.js y otras páginas, fuera", () => {
  const { esqueleto, opcional } = clasificar(BUILD);
  assert.deepEqual(opcional, ["./_assets/a2b1.abc.js", "./_assets/b1b2.abc.js", "./_assets/reading3.abc.js"]);
  assert.ok(!esqueleto.includes("./sw.js"));
  assert.ok(!esqueleto.includes("./admin.html"));
});

test("listas ordenadas y sin duplicados", () => {
  const { esqueleto, opcional } = clasificar([...BUILD, ...BUILD]);
  assert.deepEqual(esqueleto, [...new Set(esqueleto)].sort());
  assert.deepEqual(opcional, [...new Set(opcional)].sort());
});
