import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";

import { cerrarSesiones, declararSesion, sesionesActivas } from "../src/scripts/sesion.ts";
import type { SesionActiva } from "../src/scripts/sesion.ts";

function sesion(nombre: string, cerrar: () => void = () => {}): SesionActiva {
  return { tipo: "tanda", nombre, pierde: "", conserva: "Lo respondido se conserva.", cerrar };
}

beforeEach(() => cerrarSesiones());

test("sin declarar nada no hay sesiones", () => {
  assert.deepEqual(sesionesActivas(), []);
});

test("declarar añade la sesión y listar la devuelve", () => {
  const s = sesion("Gramática · unidad 3");
  declararSesion("gram", s);
  assert.deepEqual(sesionesActivas(), [s]);
});

test("declarar otra vez con el mismo id sustituye, no duplica", () => {
  declararSesion("gram", sesion("Gramática · unidad 3"));
  const nueva = sesion("Gramática · unidad 4");
  declararSesion("gram", nueva);
  assert.deepEqual(sesionesActivas(), [nueva]);
});

test("declarar null retira solo esa sesión", () => {
  const mock = sesion("Simulacro 2");
  declararSesion("gram", sesion("Gramática · unidad 3"));
  declararSesion("mock", mock);
  declararSesion("gram", null);
  assert.deepEqual(sesionesActivas(), [mock]);
});

test("la lista que se devuelve es una copia: tocarla no cambia el registro", () => {
  declararSesion("gram", sesion("Gramática · unidad 3"));
  sesionesActivas().pop();
  assert.equal(sesionesActivas().length, 1);
});

test("cerrarSesiones llama a todos los cerrar() y deja el registro vacío", () => {
  const cerradas: string[] = [];
  declararSesion("gram", sesion("Gramática", () => cerradas.push("gram")));
  declararSesion("mock", sesion("Simulacro", () => cerradas.push("mock")));
  cerrarSesiones();
  assert.deepEqual(cerradas, ["gram", "mock"]);
  assert.deepEqual(sesionesActivas(), []);
});

test("si un cerrar() lanza, se registra el error y se cierran las demás", t => {
  const consola = t.mock.method(console, "error", () => {});
  const cerradas: string[] = [];
  declararSesion("rota", sesion("Prueba rápida", () => { throw new Error("reloj roto"); }));
  declararSesion("mock", sesion("Simulacro", () => cerradas.push("mock")));
  assert.doesNotThrow(() => cerrarSesiones());
  assert.deepEqual(cerradas, ["mock"]);
  assert.deepEqual(sesionesActivas(), []);
  assert.equal(consola.mock.callCount(), 1);
});

test("una sesión declarada desde un cerrar() no sobrevive al cierre", () => {
  declararSesion("gram", sesion("Gramática", () => declararSesion("otra", sesion("Otra"))));
  cerrarSesiones();
  assert.deepEqual(sesionesActivas(), []);
});
