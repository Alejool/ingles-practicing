/**
 * Entrar desde la landing: correo → enlace mágico (AC-8, AC-10, AC-11).
 *
 * Mismo flujo para cuenta nueva y existente (el servidor crea la cuenta al
 * abrir el enlace). Las peticiones van sin identificador de dispositivo: entrar
 * en la landing no escribe nada en el navegador (plan K-10). Cada error se dice
 * bajo el campo, sin vaciarlo.
 */

import { $, anunciar, el } from "../dom.ts";
import { ApiError, get, requestLoginLink } from "../api.ts";

const SIN_DISPOSITIVO = { dispositivo: false } as const;
/** Forma mínima; el servidor valida de verdad. Admite dominios punycode (`xn--p1ai`). */
const CORREO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const MENSAJES: Record<string, string> = {
  bad_email: "Ese correo no parece válido. Revísalo y vuelve a enviarlo.",
  mail_failed: "No pudimos enviar el correo. Tu dirección sigue escrita: inténtalo otra vez en un momento.",
  too_many_links: "Has pedido demasiados enlaces seguidos. Espera unos minutos y vuelve a intentarlo.",
  accounts_off: "La entrada no está disponible ahora. Las actividades de prueba siguen funcionando.",
  network: "Sin conexión: para entrar necesitas internet. Tu correo sigue escrito.",
};

export function montarEntrada(): { irAlCorreo: () => void } {
  const form = $<HTMLFormElement>("#entrada")!;
  const campo = $<HTMLInputElement>("#lmail")!;
  const boton = $<HTMLButtonElement>("#lgo")!;
  const error = $("#lmailErr")!;
  const enviado = $("#enviado")!;
  const apagada = $("#avisoApagada")!;
  let ultimo = "";

  function mostrarError(msg: string): void {
    campo.setAttribute("aria-invalid", "true");
    campo.setAttribute("aria-describedby", "lmailErr lmailHint");
    $("#lmailErrTx")!.textContent = msg;
    error.hidden = false;
    campo.focus();
  }

  function limpiarError(): void {
    campo.removeAttribute("aria-invalid");
    campo.setAttribute("aria-describedby", "lmailHint");
    error.hidden = true;
  }

  function apagar(): void {
    apagada.hidden = false;
    campo.disabled = true;
    boton.disabled = true;
  }

  function ocupado(b: HTMLButtonElement, texto: string | null): void {
    if (texto) {
      b.dataset.texto = b.textContent ?? "";
      b.textContent = texto;
      b.setAttribute("aria-busy", "true");
      b.disabled = true;
    } else {
      b.textContent = b.dataset.texto ?? b.textContent;
      b.removeAttribute("aria-busy");
      b.disabled = false;
    }
  }

  /** `alFallar` se ejecuta antes de pintar el error (p. ej. volver a enseñar el formulario para que el foco caiga). */
  async function pedir(correo: string, b: HTMLButtonElement, cargando: string, alFallar = () => {}): Promise<boolean> {
    ocupado(b, cargando);
    try {
      const r = await requestLoginLink(correo, SIN_DISPOSITIVO);
      ultimo = correo;
      $("#enviadoTx")!.replaceChildren("Hemos enviado un enlace a ", el("b", {}, correo),
        ". Ábrelo en este dispositivo: caduca en " + (r?.minutes ?? 15) + " minutos y solo sirve una vez.");
      const buzon = $("#buzon")!;
      if (r?.delivery === "mailbox") {
        // Instalación de desarrollo: el correo se queda en el buzón local, no sale a internet.
        buzon.replaceChildren("Esta instalación usa un buzón local: el correo no sale a internet. ",
          el("a", { href: r.mailboxUrl || "http://localhost:8025", target: "_blank", rel: "noopener" }, "Abrir el buzón"));
        buzon.hidden = false;
      } else buzon.hidden = true;
      return true;
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "network";
      if (code === "accounts_off" || code === "api_unreachable") apagar();
      alFallar();
      mostrarError(MENSAJES[code] ?? (e instanceof ApiError && e.message ? e.message : MENSAJES.network));
      return false;
    } finally {
      ocupado(b, null);
    }
  }

  campo.addEventListener("input", limpiarError);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (boton.disabled) return;
    const correo = campo.value.trim();
    if (!correo) { mostrarError("Escribe tu correo para recibir el enlace."); return; }
    if (!CORREO.test(correo)) { mostrarError("Falta el dominio completo, por ejemplo ana@correo.com."); return; }
    limpiarError();
    if (await pedir(correo, boton, "Enviando el enlace…")) {
      form.hidden = true;
      $("#avisoCaducado")!.hidden = true;
      $("#avisoError")!.hidden = true;
      enviado.hidden = false;
      enviado.focus();
    }
  });

  $<HTMLButtonElement>("#reenviar")!.addEventListener("click", async e => {
    const b = e.currentTarget as HTMLButtonElement;
    const volverAlFormulario = () => { enviado.hidden = true; form.hidden = false; };
    if (await pedir(ultimo, b, "Reenviando…", volverAlFormulario)) anunciar("Te hemos enviado otro enlace a " + ultimo + ".");
  });

  $("#otroCorreo")!.addEventListener("click", () => {
    enviado.hidden = true;
    form.hidden = false;
    campo.focus();
    campo.select();
  });

  // Vuelta desde un enlace que no sirvió (el guardián de la app trae aquí).
  const acceso = location.hash.match(/^#acceso=(caducado|error)$/)?.[1];
  if (acceso) {
    const aviso = $(acceso === "caducado" ? "#avisoCaducado" : "#avisoError")!;
    aviso.hidden = false;
    // Un role=alert presente al cargar no siempre se anuncia: el foco lo lee.
    aviso.focus();
  }

  // ¿Se puede entrar? Sin cuentas en el servidor, o sin API detrás, no se pide un correo que no llegará.
  get("/api/auth/session", SIN_DISPOSITIVO).then(s => {
    if (s?.accounts === false) apagar();
  }).catch(e => {
    if (e instanceof ApiError && (e.code === "api_unreachable" || [404, 405, 501].includes(e.status))) apagar();
    else if (e instanceof ApiError && e.code === "network") $("#avisoRed")!.hidden = false;
  });

  function irAlCorreo(): void {
    if (campo.disabled) { apagada.focus(); return; }
    if (form.hidden) { enviado.hidden = true; form.hidden = false; }
    $("#t-land")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    campo.focus({ preventScroll: true });
  }

  return { irAlCorreo };
}
