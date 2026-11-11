/**
 * Tarjetas de la muestra: ocho del primer mazo de la ruta, "lo sé / no lo sé"
 * y la traducción al girar (AC-3). Todo en memoria.
 */

import { anunciar, el } from "../dom.ts";
import { acciones, ganas } from "./comun.ts";
import type { Montar } from "./comun.ts";

export const montarTarjetas: Montar = (t, m) => {
  const sabidas: boolean[] = [];
  let i = 0;

  function tarjeta(): void {
    const [en, , es, ej] = m.tarjetas[i];
    t.titulo("Pruébalo ahora: tarjetas de " + m.mazo);
    t.chip("Tarjeta " + (i + 1) + " de " + m.tarjetas.length);
    const fb = el("div", { class: "l-fb", hidden: "" });
    const botones = el("div", { class: "l-row" },
      [["Lo sé", true], ["No lo sé", false]].map(([texto, sabe]) =>
        el("button", { class: "l-btn l-btn-secondary", type: "button", onclick: () => girar(sabe as boolean) }, texto as string)));

    function girar(sabe: boolean): void {
      sabidas[i] = sabe;
      botones.hidden = true;
      const ultima = i === m.tarjetas.length - 1;
      fb.replaceChildren(
        el("p", {}, el("b", { lang: "en" }, en), " = " + es),
        el("div", { class: "l-row" },
          el("button", {
            class: "l-btn l-btn-secondary", type: "button", "data-siguiente": "",
            onclick: () => { i++; if (ultima) resultado(); else tarjeta(); t.enfocar("#pruebaFoco"); },
          }, ultima ? "Ver cómo te fue" : "Siguiente tarjeta")));
      fb.hidden = false;
      anunciar(en + ": " + es);
      t.enfocar("[data-siguiente]");
    }

    t.cuerpo.replaceChildren(
      el("div", {},
        el("span", { class: "l-en", id: "pruebaFoco", tabindex: "-1", lang: "en" }, en),
        el("p", { lang: "en" }, ej)),
      botones, fb);
  }

  function resultado(): void {
    const n = sabidas.filter(Boolean).length;
    const falladas = m.tarjetas.filter((_, j) => !sabidas[j]).map(c => c[0]);
    t.titulo("Pruébalo ahora: tarjetas de " + m.mazo + ", resultado");
    t.chip("");
    t.cuerpo.replaceChildren(
      el("div", {},
        el("span", { class: "l-score", id: "pruebaFoco", tabindex: "-1" }, n + " de " + m.tarjetas.length),
        falladas.length
          ? el("p", {}, "En la app, estas volverían mañana: ", el("b", { lang: "en" }, falladas.join(", ")), ". Las que sabes, dentro de unos días.")
          : el("p", {}, "Las sabías todas. En la app no volverían hasta dentro de unos días.")),
      ganas(), acciones("tarjetas"));
  }

  tarjeta();
};
