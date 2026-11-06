import type { Locator } from "@playwright/test";

/**
 * Contraste WCAG 2.x. `ratio` es pura (la usa también `node:test`);
 * `contrasteDeNodo` mide un nodo real contra su fondo opaco efectivo.
 */

type Rgb = { r: number; g: number; b: number };

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;

function alfa(valor: string | undefined): number {
  if (valor === undefined) return 1;
  return valor.endsWith("%") ? Number(valor.slice(0, -1)) / 100 : Number(valor);
}

function translucido(color: string): Error {
  return new Error(`Color translúcido, no se puede medir sin componerlo sobre su fondo: ${color}`);
}

export function parsearColor(color: string): Rgb {
  const limpio = color.trim();
  const hex = HEX.exec(limpio);
  if (hex) {
    let d = hex[1];
    if (d.length <= 4) d = [...d].map((c) => c + c).join("");
    if (d.length === 8 && d.slice(6) !== "ff") throw translucido(color);
    return { r: parseInt(d.slice(0, 2), 16), g: parseInt(d.slice(2, 4), 16), b: parseInt(d.slice(4, 6), 16) };
  }
  const rgb = RGB.exec(limpio);
  if (rgb) {
    if (alfa(rgb[4]) < 1) throw translucido(color);
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }
  throw new Error(`Color no reconocido: ${color}`);
}

function canal(valor: number): number {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminancia(color: string): number {
  const { r, g, b } = parsearColor(color);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function ratio(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type Medida = { texto: string; fondo: string; ratio: number };

/**
 * Color de texto calculado del nodo y primer fondo opaco subiendo por sus
 * antecesores. Falla (con el motivo) si por el camino hay un fondo
 * translúcido o una imagen de fondo: esos casos se revisan a mano.
 */
export async function contrasteDeNodo(locator: Locator): Promise<Medida> {
  const { texto, fondo } = await locator.evaluate((nodo) => {
    const texto = getComputedStyle(nodo).color;
    for (let el: Element | null = nodo; el; el = el.parentElement) {
      const estilo = getComputedStyle(el);
      if (estilo.backgroundImage !== "none") {
        throw new Error(`Fondo con imagen en <${el.tagName.toLowerCase()}>: ${estilo.backgroundImage}`);
      }
      const bg = estilo.backgroundColor;
      if (bg === "transparent" || /^rgba\(.*,\s*0\)$/.test(bg)) continue;
      return { texto, fondo: bg };
    }
    throw new Error("Ningún antecesor tiene fondo opaco");
  });
  return { texto, fondo, ratio: ratio(texto, fondo) };
}
