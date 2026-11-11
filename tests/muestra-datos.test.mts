/**
 * Datos de la muestra de la landing (src/scripts/landing/muestra-datos.ts):
 * una pieza real de cada tipo por ruta, sin copias editadas. landing-y-acceso 3.6 (AC-3).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { muestraDe, preguntasDe } from "../src/scripts/landing/muestra-datos.ts";
import { muestraDiag } from "../src/scripts/diag-muestra.ts";
import { TRACK_META } from "../src/data/tracks.ts";

async function datos(id: string) {
  const [diag, decks, listening, uoe] = await Promise.all([
    import(`../src/data/${id}/diagnostic.ts`),
    import(`../src/data/${id}/decks.ts`),
    import(`../src/data/${id}/listening.ts`),
    import(`../src/data/${id}/uoe.ts`),
  ]);
  return { DIAG: diag.DIAG, DECKS: decks.DECKS, LISTENING: listening.LISTENING, TRANS: uoe.TRANS };
}

for (const { id } of TRACK_META) {
  test(`${id}: diez preguntas iguales a muestraDiag(DIAG, 10)`, async () => {
    const d = await datos(id);
    const m = muestraDe(id);
    assert.equal(m.diag.length, 10);
    assert.deepEqual(m.diag, muestraDiag(d.DIAG, 10));
    m.diag.forEach((it, i) => assert.equal(it, muestraDiag(d.DIAG, 10)[i], "mismo objeto"));
    assert.deepEqual(preguntasDe(id), m.diag);
  });

  test(`${id}: 8 tarjetas del primer mazo, el primer audio y la primera transformación, sin copias`, async () => {
    const d = await datos(id);
    const m = muestraDe(id);
    assert.equal(m.mazo, d.DECKS[0].name);
    assert.equal(m.tarjetas.length, 8);
    m.tarjetas.forEach((c, i) => assert.equal(c, d.DECKS[0].cards[i]));
    assert.equal(m.escucha, d.LISTENING[0]);
    assert.equal(m.uoe, d.TRANS[0]);
  });
}

test("determinista: dos llamadas dan lo mismo", () => {
  for (const { id } of TRACK_META) assert.deepEqual(muestraDe(id), muestraDe(id));
});

test("una ruta desconocida no tiene muestra", () => {
  assert.equal(preguntasDe("zz99"), null);
  assert.equal(preguntasDe("constructor"), null);
  assert.throws(() => muestraDe("zz99" as never), /zz99/);
});
