/**
 * El armazón de «una pregunta por pantalla».
 *
 * Nació en Vocabulario y lo usan también Gramática y Use of English, porque el
 * problema era el mismo en los tres: una lista larguísima donde había que
 * desplazarse para encontrar la siguiente pregunta, perder de vista la
 * anterior, y no saber nunca cuánto quedaba.
 *
 * La forma es siempre igual:
 *
 *   ┌──────────────────────────────┐
 *   │ ‹ Salir   ▓▓▓▓▓░░░░   3 / 10 │  cabecera: salir y cuánto queda
 *   ├──────────────────────────────┤
 *   │                              │
 *   │        la pregunta           │  cuerpo: se centra; si no cabe, se
 *   │                              │  desplaza ESTA caja, nunca la página
 *   ├──────────────────────────────┤
 *   │ ‹ Atrás          Siguiente › │  pie: siempre visible, siempre ahí
 *   └──────────────────────────────┘
 *
 * El alto se mide en el momento en vez de adivinarlo en el CSS: así encaja
 * igual en un móvil pequeño, en uno grande y en una ventana de escritorio, y el
 * botón de seguir no se va nunca de la pantalla.
 */

import { el } from "./dom";

export interface Pasos {
  /** La caja entera, ya colgada del contenedor. */
  caja: HTMLElement;
  /** Donde va la pregunta. Se vacía en cada paso. */
  cuerpo: HTMLElement;
  /** Donde van los botones. Se vacía en cada paso. */
  pie: HTMLElement;
  /** Pinta la barra y el contador. */
  progreso(hecho: number, total: number, etiqueta?: string): void;
  /** Vacía cuerpo y pie para pintar el paso siguiente. */
  limpiar(): void;
  /** Vuelve a medir el alto disponible (tras cambiar de paso, por ejemplo). */
  medir(): void;
}

/**
 * Que la caja ocupe justo lo que queda de pantalla y ni un píxel más.
 *
 * Dos pasadas: la primera calcula desde dónde empieza la caja, la segunda
 * descuenta lo que aporten los rellenos de alrededor. Con eso el sobrante es
 * cero sin tener que conocer el CSS de los contenedores.
 */
export function ajustarAlto(caja: HTMLElement): void {
  const medir = () => {
    caja.style.minHeight = "0px";
    caja.style.maxHeight = "none";
    const arriba = caja.getBoundingClientRect().top;
    const libre = Math.max(320, window.innerHeight - arriba - 16);
    caja.style.minHeight = libre + "px";
    caja.style.maxHeight = libre + "px";
    const sobra = document.documentElement.scrollHeight - window.innerHeight;
    if (sobra > 0) {
      const alto = Math.max(320, libre - sobra);
      caja.style.minHeight = alto + "px";
      caja.style.maxHeight = alto + "px";
    }
  };
  medir();
  window.addEventListener("resize", medir, { once: true });
  return void 0 as unknown as void;
}

/** Monta el armazón dentro de `host` y devuelve las piezas para rellenarlo. */
export function crearPasos(host: HTMLElement, opciones: {
  alSalir: () => void;
  salir?: string;
  /** Algo más en la cabecera: el reloj del simulacro, por ejemplo. */
  extraCab?: HTMLElement | null;
}): Pasos {
  const contador = el("span", { class: "mono tiny" }, "");
  const barra = el("i", { style: "width:0%" });
  const cuerpo = el("div", { class: "ses-cuerpo" });
  const pie = el("div", { class: "ses-pie" });

  const cab = el("div", { class: "ses-cab" },
    el("button", { class: "btn ghost small", type: "button", onclick: opciones.alSalir }, opciones.salir || "‹ Salir"),
    el("div", { class: "ses-barra" }, barra),
    contador);
  if (opciones.extraCab) cab.append(opciones.extraCab);

  const caja = el("div", { class: "sesion" }, cab, cuerpo, pie);

  host.append(caja);
  const medir = () => ajustarAlto(caja);
  medir();

  return {
    caja, cuerpo, pie, medir,
    limpiar() { cuerpo.innerHTML = ""; pie.innerHTML = ""; },
    progreso(hecho, total, etiqueta) {
      barra.style.width = Math.round(Math.min(1, total ? hecho / total : 0) * 100) + "%";
      contador.textContent = etiqueta || hecho + " / " + total;
    },
  };
}

/**
 * Los dos botones de siempre.
 *
 * «Atrás» va a la izquierda y en gris; «Siguiente» a la derecha y ocupando lo
 * que sobre, porque es el que se pulsa noventa veces de cada cien.
 */
export function navPasos(opts: {
  atras?: (() => void) | null;
  siguiente?: (() => void) | null;
  textoSiguiente?: string;
  textoAtras?: string;
  extra?: HTMLElement | null;
}): HTMLElement {
  const fila = el("div", { class: "row" });
  if (opts.atras) fila.append(el("button", { class: "btn ghost", type: "button", onclick: opts.atras }, opts.textoAtras || "‹ Atrás"));
  if (opts.extra) fila.append(opts.extra);
  if (opts.siguiente) {
    fila.append(el("button", { class: "btn crece", type: "button", onclick: opts.siguiente }, opts.textoSiguiente || "Siguiente ›"));
  }
  return fila;
}

/** Marca el cuerpo de la app como «en pantalla completa» mientras dure la tanda. */
export function pantallaCompleta(activa: boolean, vista?: string): void {
  document.body.classList.toggle("sesion-activa", activa);
  if (vista) document.getElementById("v-" + vista)?.classList.toggle("en-sesion", activa);
}
