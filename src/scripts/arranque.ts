/**
 * Arranque de la app tras el guardián de `index.astro`.
 *
 * El navegador pide este módulo en cuanto ve la etiqueta, aunque el guardián ya
 * esté mandando a la landing. Por eso es mínimo: si el guardián decidió salir,
 * no carga nada más; si no, trae la app entera.
 * (landing-y-acceso 3.3; en la fase 4 suma el enlace, la sesión y `alinear`.)
 */

if (document.documentElement.dataset.acceso !== "fuera") void import("./main");
