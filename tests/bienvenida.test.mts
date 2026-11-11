/**
 * Bienvenida sin modelo (src/scripts/bienvenida.ts): nivel por área, tres
 * puntos para empezar y qué toca hoy. landing-y-acceso 1.11 (AC-25).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { bienvenida } from "../src/scripts/bienvenida.ts";
import { puntuar } from "../src/scripts/diag-muestra.ts";
import type { DiagItem } from "../src/data/types.ts";

function item(id: string, area: string): DiagItem {
  return { id, area, lvl: "B1", q: "?", opts: ["x", "y", "z"], a: 0, exp: "" };
}

const DIEZ: DiagItem[] = [
  item("q1", "Tiempos verbales"), item("q2", "Modales"), item("q3", "Preposiciones"), item("q4", "Tiempos verbales"),
  item("q5", "Vocabulario"), item("q6", "Modales"), item("q7", "Condicionales"), item("q8", "Preposiciones"),
  item("q9", "Vocabulario"), item("q10", "Condicionales"),
];

function resultado(aciertos: string[]) {
  const r: Record<string, number> = {};
  DIEZ.forEach(i => { r[i.id] = aciertos.includes(i.id) ? 0 : 1; });
  return puntuar(DIEZ, r);
}

const BLOQUES = ["Lección: present perfect", "Vocabulario: 12 tarjetas", "Use of English"];

test("nivel por área con aciertos y banda, en el orden del diagnóstico", () => {
  const b = bienvenida(resultado(["q1", "q4", "q2", "q5"]), 1, BLOQUES);
  assert.deepEqual(b.niveles.map(n => [n.area, n.ok, n.n, n.banda]), [
    ["Tiempos verbales", 2, 2, "encima"],
    ["Modales", 1, 2, "nivel"],
    ["Preposiciones", 0, 2, "debajo"],
    ["Vocabulario", 1, 2, "nivel"],
    ["Condicionales", 0, 2, "debajo"],
  ]);
  assert.equal(b.niveles[0].texto, "Tiempos verbales: 2 de 2, por encima del nivel");
  assert.equal(b.niveles[1].texto, "Modales: 1 de 2, en el nivel");
  assert.equal(b.niveles[2].texto, "Preposiciones: 0 de 2, por debajo del nivel");
});

test("tres puntos: las tres áreas con menor acierto; empates por orden del diagnóstico", () => {
  const b = bienvenida(resultado(["q1", "q4", "q2", "q5"]), 1, BLOQUES);
  // 0 %: Preposiciones, Condicionales; 50 %: Modales, Vocabulario → gana Modales por orden.
  assert.deepEqual(b.puntos, ["Preposiciones", "Condicionales", "Modales"]);
});

test("con menos de tres áreas, tantos puntos como áreas", () => {
  const dos = [item("a", "X"), item("b", "Y")];
  const b = bienvenida(puntuar(dos, { a: 0, b: 1 }), 1, []);
  assert.deepEqual(b.puntos, ["Y", "X"]);
});

test("hoy: día, semana y títulos de los bloques", () => {
  const b = bienvenida(resultado([]), 41, BLOQUES);
  assert.deepEqual(b.hoy, { dia: 41, semana: 9, bloques: BLOQUES });
  assert.equal(bienvenida(resultado([]), 1, []).hoy.semana, 1);
  assert.equal(bienvenida(resultado([]), 5, []).hoy.semana, 1);
  assert.equal(bienvenida(resultado([]), 6, []).hoy.semana, 2);
});

test("texto: menciona niveles, puntos y lo de hoy", () => {
  const b = bienvenida(resultado(["q1", "q4", "q2", "q5"]), 16, BLOQUES);
  assert.match(b.texto, /Tiempos verbales: 2 de 2, por encima del nivel/);
  assert.match(b.texto, /Empieza por Preposiciones, Condicionales y Modales\./);
  assert.match(b.texto, /Hoy toca el día 16 \(semana 4\): Lección: present perfect, Vocabulario: 12 tarjetas y Use of English\./);
});

test("dos diagnósticos distintos dan mensajes distintos", () => {
  const a = bienvenida(resultado(["q1", "q2", "q3"]), 1, BLOQUES);
  const b = bienvenida(resultado(["q7", "q8", "q9", "q10"]), 1, BLOQUES);
  assert.notEqual(a.texto, b.texto);
  assert.notDeepEqual(a.puntos, b.puntos);
});

test("texto plano: sin HTML aunque los títulos lo traigan", () => {
  const b = bienvenida(resultado([]), 1, ["<b>Gramática</b> del día", "Repaso & <i>tarjetas</i>"]);
  assert.doesNotMatch(b.texto, /<|>/);
  assert.match(b.texto, /Gramática del día y Repaso & tarjetas/);
  assert.deepEqual(b.hoy.bloques, ["Gramática del día", "Repaso & tarjetas"]);
});

test("sin bloques no inventa contenido", () => {
  const b = bienvenida(resultado([]), 1, []);
  assert.match(b.texto, /Hoy toca el día 1 \(semana 1\)\./);
});
