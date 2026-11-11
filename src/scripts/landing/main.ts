/**
 * Entrada de la landing pública (/bienvenida/).
 *
 * No importa nada que lea o escriba el estado de la app (lo comprueba
 * tests/landing-aislada.test.mts): lo que se juega aquí vive en memoria. La
 * única excepción es el resultado del diagnóstico, en `sessionStorage`.
 */

import { $, $$, anunciar } from "../dom.ts";
import { TRACK_META } from "../../data/tracks.ts";
import type { TrackId } from "../../data/types.ts";
import type { Actividad, Montar, Tarjeta } from "./comun.ts";
import { montarDiagnostico, guardadoDe } from "./diagnostico.ts";
import { montarEntrada } from "./entrada.ts";
import { montarEscucha } from "./escucha.ts";
import { muestraDe } from "./muestra-datos.ts";
import { leerMarcador, puedeEntrar } from "../cuenta-local.ts";
import { montarTarjetas } from "./tarjetas.ts";
import { montarUoe } from "./uoe.ts";

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

function leer(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}

// Con sesión (token, o marcador de una cuenta que no salió) no hay nada que enseñar aquí:
// a la app. Misma regla que el guardián de index.astro.
function almacen(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
const local = almacen();
if (puedeEntrar(leer("ruta-b1b2-session"), local ? leerMarcador(local) : null)) location.replace(BASE);

const ACTIVIDADES: Record<Actividad, Montar> = {
  diag: montarDiagnostico, tarjetas: montarTarjetas, escucha: montarEscucha, uoe: montarUoe,
};

const prueba = $("#prueba")!;
const cuerpo = $("#pruebaCuerpo")!;
const chip = $("#pruebaChip")!;
let ruta: TrackId = "b1b2";
let actual: Actividad = "diag";
let parar: (() => void) | undefined;

const tarjeta: Tarjeta = {
  cuerpo,
  titulo: texto => { $("#pruebaT")!.textContent = texto; },
  chip: texto => { chip.textContent = texto; chip.hidden = !texto; },
  get nombreRuta() { return TRACK_META.find(t => t.id === ruta)?.name ?? ruta; },
  enfocar: sel => { $<HTMLElement>(sel, prueba)?.focus({ preventScroll: true }); },
};

function empezar(a: Actividad, enfocar: boolean): void {
  parar?.();
  actual = a;
  parar = ACTIVIDADES[a](tarjeta, muestraDe(ruta)) || undefined;
  if (enfocar) {
    prueba.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    tarjeta.enfocar("#pruebaFoco");
  }
}

const { irAlCorreo } = montarEntrada();

document.querySelector(".landing")!.addEventListener("click", e => {
  const objetivo = e.target as Element;
  const probar = objetivo.closest<HTMLElement>("[data-probar]");
  if (probar) { empezar(probar.dataset.probar as Actividad, true); return; }
  if (objetivo.closest("[data-otra]")) {
    const primera = $<HTMLElement>('.l-rows [data-probar="diag"]')!;
    primera.scrollIntoView({ block: "center" });
    primera.focus({ preventScroll: true });
    return;
  }
  if (objetivo.closest("[data-ir-correo]")) irAlCorreo();
});

$$<HTMLInputElement>('#rutaMuestra input[name="rutaMuestra"]').forEach(r => r.addEventListener("change", () => {
  ruta = r.value as TrackId;
  empezar(actual, false);
  anunciar("Muestra de la ruta " + tarjeta.nombreRuta + ": " + ($("#pruebaT")!.textContent ?? ""));
}));

// El navegador puede restaurar la ruta marcada al recargar: manda lo que se ve.
ruta = ($<HTMLInputElement>('#rutaMuestra input:checked')?.value as TrackId) || ruta;

// Si en esta pestaña ya se hizo el diagnóstico de otra ruta, la muestra abre en esa ruta.
const conResultado = TRACK_META.find(t => guardadoDe(t.id));
if (conResultado) {
  ruta = conResultado.id;
  const radio = $<HTMLInputElement>(`#rutaMuestra input[value="${ruta}"]`);
  if (radio) radio.checked = true;
}

// Quien ya estudiaba aquí sin cuenta: su progreso sigue en este navegador (solo se lee la clave).
if (leer("ruta-b1b2-v1")) $("#tuyo")!.hidden = false;

empezar("diag", false);

// La landing también abre sin red una vez cargada (AC-7). El service worker guarda
// archivos del sitio en Cache Storage, no lo que se hace en la muestra.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(BASE + "sw.js").catch(e => console.warn("[landing] sin service worker", e));
}
