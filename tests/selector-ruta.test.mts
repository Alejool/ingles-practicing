import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ESTADO_INICIAL, avisos, diaActual, etiquetaIndicador, marcaConstruccion, opciones, reducir,
  resumenProgreso, seVaAPerder, textoCasilla, textoConfirmar,
} from "../src/scripts/selector-ruta.ts";
import type { Accion, EstadoSelector, MetaRuta } from "../src/scripts/selector-ruta.ts";
import type { SesionActiva } from "../src/scripts/sesion.ts";
import type { TrackId } from "../src/scripts/state.ts";

/** El id entra como texto: la tercera ruta todavía no está en `TrackId`. */
function meta(id: string, name: string, disponibles?: number): MetaRuta {
  return { id: id as TrackId, name, who: "Para quién es " + name, exam: "Examen de " + name, disponibles };
}
const A2B1 = meta("a2b1", "A2 → B1");
const B1B2 = meta("b1b2", "B1 → B2");
const B2C1 = meta("b2c1", "B2 → C1", 4);

function hechos(n: number): Record<string, boolean> {
  const dias: Record<string, boolean> = {};
  for (let d = 1; d <= n; d++) dias[d] = true;
  return dias;
}

/* ─────────────── resumen de progreso ─────────────── */

test("diaActual es el primer día sin hacer", () => {
  assert.equal(diaActual({}, 120), 1);
  assert.equal(diaActual(hechos(36), 120), 37);
  assert.equal(diaActual({ 1: true, 2: true, 4: true }, 120), 3);
  assert.equal(diaActual({ 1: true, 2: false }, 120), 2);
});

test("diaActual con todos los días hechos se queda en el último", () => {
  assert.equal(diaActual(hechos(120), 120), 120);
  assert.equal(diaActual(hechos(20), 20), 20);
});

test("resumenProgreso dice «sin empezar» sin días, sin tarjetas y sin diagnóstico", () => {
  assert.equal(resumenProgreso({ days: {}, srs: {}, diag: { answers: {}, done: false, score: null } }, 120), "sin empezar");
  assert.equal(resumenProgreso({}, 120), "sin empezar");
  assert.equal(resumenProgreso(undefined, 120), "sin empezar");
});

test("resumenProgreso da el día en curso sobre el total de la ruta", () => {
  assert.equal(resumenProgreso({ days: hechos(36) }, 120), "día 37 de 120");
  assert.equal(resumenProgreso({ days: hechos(2) }, 20), "día 3 de 20");
});

test("resumenProgreso cuenta como empezada una ruta con tarjetas o con diagnóstico", () => {
  assert.equal(resumenProgreso({ days: {}, srs: { "core:1": { b: 1, due: 0 } } }, 120), "día 1 de 120");
  assert.equal(resumenProgreso({ diag: { answers: { q1: 2 }, done: false, score: null } }, 120), "día 1 de 120");
  assert.equal(resumenProgreso({ diag: { answers: {}, done: true, score: { right: 20, pct: 67 } } }, 120), "día 1 de 120");
});

test("resumenProgreso no muta el progreso que recibe", () => {
  const p = { days: hechos(36), srs: { "core:1": { b: 2, due: 5 } }, diag: { answers: { q1: 1 }, done: true, score: { right: 1, pct: 3 } } };
  const copia = structuredClone(p);
  resumenProgreso(p, 120);
  assert.deepEqual(p, copia);
});

test("marcaConstruccion solo existe en una ruta incompleta", () => {
  assert.equal(marcaConstruccion(B2C1), "En construcción · 4 de 24 semanas");
  assert.equal(marcaConstruccion(B1B2), null);
});

test("etiquetaIndicador lleva la función y el valor, no solo el nombre", () => {
  assert.equal(etiquetaIndicador(B1B2), "Ruta actual: B1 → B2. Cambiar de ruta");
  assert.equal(etiquetaIndicador(A2B1), "Ruta actual: A2 → B1. Cambiar de ruta");
});

/* ─────────────── máquina de estados ─────────────── */

const SIN_SESION = { haySesionQueSePierde: false };
const CON_SESION = { haySesionQueSePierde: true };

/** Aplica una serie de acciones desde el estado inicial con b1b2 activa. */
function tras(acciones: Accion[], ctx = SIN_SESION): EstadoSelector {
  return acciones.reduce((e, a) => reducir(e, a, ctx), ESTADO_INICIAL("b1b2"));
}
const ELEGIR_OTRA: Accion[] = [{ t: "abrir" }, { t: "elegir", id: "a2b1" }];
const CARGANDO: Accion[] = [...ELEGIR_OTRA, { t: "confirmar" }];
const ERROR: Accion[] = [...CARGANDO, { t: "fallo", mensaje: "Sin conexión." }];

test("el estado inicial está cerrado, con la ruta activa y nada elegido", () => {
  assert.deepEqual(ESTADO_INICIAL("b1b2"),
    { fase: "cerrado", activa: "b1b2", elegida: null, aceptaPerder: false, error: null });
});

test("abrir enseña la lista", () => {
  assert.equal(tras([{ t: "abrir" }]).fase, "lista");
});

test("cerrado, ninguna acción que no sea abrir cambia nada (AC-4)", () => {
  const inicial = ESTADO_INICIAL("b1b2");
  const sueltas: Accion[] = [
    { t: "elegir", id: "a2b1" }, { t: "confirmar" }, { t: "cargada" }, { t: "reintentar" },
    { t: "volver" }, { t: "cancelar" }, { t: "aceptar", valor: true }, { t: "fallo", mensaje: "x" },
  ];
  for (const a of sueltas) assert.deepEqual(reducir(inicial, a, SIN_SESION), inicial, a.t);
});

test("elegir la ruta activa cierra sin cambios (AC-6)", () => {
  assert.deepEqual(tras([{ t: "abrir" }, { t: "elegir", id: "b1b2" }]), ESTADO_INICIAL("b1b2"));
});

test("elegir otra ruta lleva a confirmar, sin cambiar todavía la activa", () => {
  const e = tras(ELEGIR_OTRA);
  assert.equal(e.fase, "confirmar");
  assert.equal(e.elegida, "a2b1");
  assert.equal(e.activa, "b1b2");
});

test("volver desde confirmar regresa a la lista y olvida la elección y la casilla", () => {
  const e = tras([...ELEGIR_OTRA, { t: "aceptar", valor: true }, { t: "volver" }], CON_SESION);
  assert.deepEqual(e, { ...ESTADO_INICIAL("b1b2"), fase: "lista" });
});

test("confirmar pasa a cargando", () => {
  assert.equal(tras(CARGANDO).fase, "cargando");
});

test("con una sesión que se pierde, confirmar sin la casilla se ignora (AC-19)", () => {
  const antes = tras(ELEGIR_OTRA, CON_SESION);
  assert.deepEqual(reducir(antes, { t: "confirmar" }, CON_SESION), antes);
  const desmarcada = tras([...ELEGIR_OTRA, { t: "aceptar", valor: true }, { t: "aceptar", valor: false }, { t: "confirmar" }], CON_SESION);
  assert.equal(desmarcada.fase, "confirmar");
});

test("con la casilla marcada, confirmar pasa a cargando", () => {
  const e = tras([...ELEGIR_OTRA, { t: "aceptar", valor: true }, { t: "confirmar" }], CON_SESION);
  assert.equal(e.fase, "cargando");
});

test("cargando ignora abrir, elegir, confirmar, volver, reintentar y cancelar (AC-16)", () => {
  const cargando = tras(CARGANDO);
  const ignoradas: Accion[] = [
    { t: "abrir" }, { t: "elegir", id: "b1b2" }, { t: "confirmar" },
    { t: "volver" }, { t: "reintentar" }, { t: "cancelar" }, { t: "aceptar", valor: true },
  ];
  for (const a of ignoradas) assert.deepEqual(reducir(cargando, a, SIN_SESION), cargando, a.t);
});

test("un fallo enseña el motivo y deja la ruta activa como estaba (AC-17)", () => {
  const e = tras(ERROR);
  assert.equal(e.fase, "error");
  assert.equal(e.error, "Sin conexión.");
  assert.equal(e.activa, "b1b2");
  assert.equal(e.elegida, "a2b1");
});

test("reintentar vuelve a cargar la misma ruta y borra el error", () => {
  const e = tras([...ERROR, { t: "reintentar" }]);
  assert.equal(e.fase, "cargando");
  assert.equal(e.elegida, "a2b1");
  assert.equal(e.error, null);
});

test("cargada cierra con la ruta elegida como activa", () => {
  assert.deepEqual(tras([...CARGANDO, { t: "cargada" }]), ESTADO_INICIAL("a2b1"));
  assert.deepEqual(tras([...ERROR, { t: "reintentar" }, { t: "cargada" }]), ESTADO_INICIAL("a2b1"));
});

test("cancelar desde lista, confirmar y error cierra sin tocar la activa (AC-9)", () => {
  for (const camino of [[{ t: "abrir" }] as Accion[], ELEGIR_OTRA, ERROR]) {
    assert.deepEqual(tras([...camino, { t: "cancelar" }]), ESTADO_INICIAL("b1b2"));
  }
});

test("reducir no muta el estado que recibe", () => {
  const e = tras(ELEGIR_OTRA);
  const copia = structuredClone(e);
  reducir(e, { t: "confirmar" }, SIN_SESION);
  reducir(e, { t: "cancelar" }, SIN_SESION);
  assert.deepEqual(e, copia);
});

/* ─────────────── opciones ─────────────── */

const EN_LINEA = { enLinea: true, enMemoria: ["b1b2" as TrackId], enCache: null };
const PROGRESO = { a2b1: {}, b1b2: { days: hechos(36) }, b2c1: { days: hechos(2) } };

test("opciones con dos rutas: ficha completa, activa marcada y progreso de cada una", () => {
  assert.deepEqual(opciones([A2B1, B1B2], "b1b2", PROGRESO, EN_LINEA), [
    { id: "a2b1", name: "A2 → B1", who: A2B1.who, exam: A2B1.exam, activa: false, progreso: "sin empezar", marca: null, disponible: true },
    { id: "b1b2", name: "B1 → B2", who: B1B2.who, exam: B1B2.exam, activa: true, progreso: "día 37 de 120", marca: null, disponible: true },
  ]);
});

test("opciones con tres rutas: la incompleta lleva su marca y cuenta sobre lo publicado", () => {
  const ops = opciones([A2B1, B1B2, B2C1], "b1b2", PROGRESO, EN_LINEA);
  assert.deepEqual(ops.map(o => o.id), ["a2b1", "b1b2", "b2c1"]);
  assert.deepEqual(ops.map(o => o.activa), [false, true, false]);
  assert.equal(ops[2].marca, "En construcción · 4 de 24 semanas");
  assert.equal(ops[2].progreso, "día 3 de 20");
});

test("opciones: una ruta sin progreso guardado sale «sin empezar»", () => {
  assert.equal(opciones([A2B1, B1B2], "b1b2", {}, EN_LINEA)[0].progreso, "sin empezar");
});

test("opciones: no disponible solo sin conexión, fuera de memoria y fuera de la caché (AC-18)", () => {
  const disp = (d: Parameters<typeof opciones>[3]) =>
    opciones([A2B1, B1B2, B2C1], "b1b2", PROGRESO, d).map(o => o.disponible);
  const b1b2 = ["b1b2" as TrackId];
  assert.deepEqual(disp({ enLinea: false, enMemoria: b1b2, enCache: ["b1b2" as TrackId] }), [false, true, false]);
  assert.deepEqual(disp({ enLinea: false, enMemoria: b1b2, enCache: ["a2b1" as TrackId] }), [true, true, false]);
  assert.deepEqual(disp({ enLinea: false, enMemoria: b1b2, enCache: [] }), [false, true, false]);
  assert.deepEqual(disp({ enLinea: true, enMemoria: b1b2, enCache: [] }), [true, true, true]);
});

test("opciones: si la caché no contesta, nada se marca como no disponible (S-7)", () => {
  const ops = opciones([A2B1, B1B2, B2C1], "b1b2", PROGRESO, { enLinea: false, enMemoria: [], enCache: null });
  assert.deepEqual(ops.map(o => o.disponible), [true, true, true]);
});

/* ─────────────── avisos ─────────────── */

function sesion(tipo: SesionActiva["tipo"], nombre: string, pierde: string, conserva: string): SesionActiva {
  return { tipo, nombre, pierde, conserva, cerrar: () => {} };
}
const SIMULACRO = sesion("simulacro", "Simulacro 2", "Se pierde lo respondido en el simulacro.", "Tus simulacros anteriores se conservan.");
const TANDA = sesion("tanda", "Gramática · unidad 3", "", "Lo que ya has respondido queda guardado.");

test("avisos: sin nada en curso, solo el progreso y lo común, en ese orden (AC-7, AC-12)", () => {
  assert.deepEqual(avisos(B1B2, A2B1, [], false), [
    { clase: "progreso", texto: "Vas a cambiar a A2 → B1. Tu progreso en B1 → B2 se queda como está: cada ruta lleva el suyo y puedes volver cuando quieras." },
    { clase: "progreso", texto: "La racha, el cuaderno de errores y los ajustes son los mismos en todas las rutas." },
  ]);
});

test("avisos: una ruta incompleta añade el aviso de construcción (AC-14)", () => {
  const a = avisos(B1B2, B2C1, [], false);
  assert.equal(a.length, 3);
  assert.deepEqual(a[2], { clase: "construccion", texto: "B2 → C1 está en construcción: tiene 4 de 24 semanas." });
  assert.ok(!avisos(B2C1, B1B2, [], false).some(x => x.clase === "construccion"), "solo cuenta el destino");
});

test("avisos: cada sesión dice qué se pierde y qué se conserva (AC-19, AC-20)", () => {
  const a = avisos(B1B2, A2B1, [SIMULACRO, TANDA], false).filter(x => x.clase === "sesion");
  assert.deepEqual(a.map(x => x.texto), [
    "Tienes en curso: Simulacro 2. Se pierde lo respondido en el simulacro. Tus simulacros anteriores se conservan.",
    "Tienes en curso: Gramática · unidad 3. Lo que ya has respondido queda guardado.",
  ]);
});

test("avisos: una respuesta de IA en curso se menciona una sola vez (AC-21)", () => {
  const texto = "Hay una respuesta de la IA en camino y se cancela al cambiar. El texto que ya está guardado se conserva.";
  assert.deepEqual(avisos(B1B2, A2B1, [], true).at(-1), { clase: "ia", texto });
  const tutor = sesion("ia", "Tutor", "", "");
  const conTutor = avisos(B1B2, A2B1, [tutor], true);
  assert.equal(conTutor.filter(x => x.clase === "ia").length, 1);
  assert.equal(conTutor.filter(x => x.clase === "sesion").length, 0);
  assert.equal(avisos(B1B2, A2B1, [tutor], false).at(-1).clase, "ia");
});

test("avisos: el orden es progreso, construcción, sesiones, IA", () => {
  assert.deepEqual(avisos(B1B2, B2C1, [SIMULACRO], true).map(x => x.clase),
    ["progreso", "progreso", "construccion", "sesion", "ia"]);
});

test("textoConfirmar nombra el destino (AC-9)", () => {
  assert.equal(textoConfirmar(B2C1), "Cambiar a B2 → C1");
  assert.equal(textoConfirmar(A2B1), "Cambiar a A2 → B1");
});

/* ─────────────── correcciones de la revisión ─────────────── */

test("cargada sin ruta elegida no cambia nada", () => {
  const raro: EstadoSelector = { fase: "cargando", activa: "b1b2", elegida: null, aceptaPerder: false, error: null };
  assert.deepEqual(reducir(raro, { t: "cargada" }, SIN_SESION), raro);
});

test("si el navegador cierra el diálogo, cualquier fase vuelve a cerrado sin cambiar de ruta", () => {
  for (const camino of [[{ t: "abrir" }] as Accion[], ELEGIR_OTRA, CARGANDO, ERROR]) {
    assert.deepEqual(tras([...camino, { t: "descartar" }]), ESTADO_INICIAL("b1b2"));
  }
});

test("una carga que termina después de descartar ya no cambia de ruta", () => {
  assert.deepEqual(tras([...CARGANDO, { t: "descartar" }, { t: "cargada" }]), ESTADO_INICIAL("b1b2"));
  assert.deepEqual(tras([...CARGANDO, { t: "descartar" }, { t: "fallo", mensaje: "x" }]), ESTADO_INICIAL("b1b2"));
});

test("seVaAPerder es verdadero solo si alguna sesión declara que pierde algo", () => {
  assert.equal(seVaAPerder([]), false);
  assert.equal(seVaAPerder([TANDA]), false);
  assert.equal(seVaAPerder([TANDA, SIMULACRO]), true);
});

test("textoCasilla nombra lo que se pierde, y solo eso (AC-19)", () => {
  const quiz = sesion("tanda", "Prueba rápida", "Se pierde la tanda.", "");
  const dictado = sesion("tanda", "Dictado", "Se pierde el dictado.", "");
  assert.equal(textoCasilla([SIMULACRO, TANDA]), "Entiendo que pierdo lo que tengo a medias en Simulacro 2");
  assert.equal(textoCasilla([SIMULACRO, quiz]), "Entiendo que pierdo lo que tengo a medias en Simulacro 2 y Prueba rápida");
  assert.equal(textoCasilla([SIMULACRO, quiz, dictado]), "Entiendo que pierdo lo que tengo a medias en Simulacro 2, Prueba rápida y Dictado");
});
