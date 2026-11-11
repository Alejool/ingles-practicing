/**
 * Use of English de la muestra: la primera transformación de la ruta, con la
 * misma corrección que la app (`norm` sobre las respuestas aceptadas) (AC-3).
 */

import { anunciar, el, norm } from "../dom.ts";
import { acciones, ganas, icono } from "./comun.ts";
import type { Montar } from "./comun.ts";

export const montarUoe: Montar = (t, m) => {
  const tr = m.uoe;
  t.titulo("Pruébalo ahora: Use of English, transformación");
  t.chip("Key word transformation");

  const [antes, despues] = tr.s2.split(/_{3,}/);
  const fb = el("div", { class: "l-fb", hidden: "" });
  const error = el("span", { class: "l-err", id: "uoeErr", role: "alert", hidden: "" }, icono("alert"), el("span", {}));
  const campo = el("input", {
    class: "l-input", id: "uoeIn", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
    lang: "en", "aria-describedby": "uoeHint",
    oninput: () => { campo.removeAttribute("aria-invalid"); campo.setAttribute("aria-describedby", "uoeHint"); error.hidden = true; },
  }) as HTMLInputElement;
  const comprobar = el("button", { class: "l-btn l-btn-secondary", type: "submit" }, "Comprobar") as HTMLButtonElement;

  const form = el("form", {
    class: "l-field", novalidate: "",
    onsubmit: (e: Event) => {
      e.preventDefault();
      const v = norm(campo.value);
      if (!v) {
        campo.setAttribute("aria-invalid", "true");
        campo.setAttribute("aria-describedby", "uoeErr uoeHint");
        error.lastElementChild!.textContent = "Escribe tu respuesta antes de comprobar.";
        error.hidden = false;
        campo.focus();
        return;
      }
      const bien = tr.a.some(r => norm(r) === v);
      campo.readOnly = true;
      comprobar.disabled = true;
      fb.replaceChildren(
        el("p", {}, el("b", {}, bien ? "Correcta." : "Todavía no."), bien ? "" : " Una respuesta aceptada: ", bien ? null : el("b", { lang: "en" }, tr.a[0])),
        el("p", { html: tr.e }),
        ganas(), acciones("uoe"));
      fb.hidden = false;
      anunciar(bien ? "Correcta." : "Todavía no. Una respuesta aceptada es " + tr.a[0] + ".");
      t.enfocar("[data-ir-correo]");
    },
  },
    el("label", { for: "uoeIn" }, "Completa el hueco con 2 a 5 palabras, incluida ", el("span", { class: "l-key", lang: "en" }, tr.key)),
    el("div", { class: "l-row" }, campo, comprobar),
    el("span", { class: "l-hint", id: "uoeHint" }, "No cambies la palabra clave. Las contracciones cuentan como dos palabras."),
    error);

  t.cuerpo.replaceChildren(
    el("p", { class: "l-src", id: "pruebaFoco", tabindex: "-1", lang: "en" }, tr.s1),
    el("p", { lang: "en" }, (antes ?? "").trim() + " ", el("span", { "aria-hidden": "true" }, "______"),
      el("span", { class: "sr-only", lang: "es" }, "hueco"), " " + (despues ?? "").trim()),
    form, fb);
};
