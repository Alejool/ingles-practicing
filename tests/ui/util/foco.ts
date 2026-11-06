import { expect, type Page } from "@playwright/test";

/** Tras navegar, el foco está en un `h1` enfocable por programa (AC-17). */
export async function focoEnH1(page: Page): Promise<void> {
  const activo = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? { tag: el.tagName.toLowerCase(), tabindex: el.getAttribute("tabindex"), texto: el.textContent?.trim() ?? "" } : null;
  });
  expect(activo, "el foco no está en ningún elemento").not.toBeNull();
  expect(activo?.tag, `el foco está en <${activo?.tag}> "${activo?.texto}", no en el h1`).toBe("h1");
  expect(activo?.tabindex, "el h1 enfocado debe llevar tabindex=-1").toBe("-1");
}

/**
 * Pulsa Tab hasta `maximo` veces y devuelve una descripción de cada parada
 * (`etiqueta#id "nombre"`). Para antes si el foco vuelve a la primera parada
 * o sale del documento.
 */
export async function recorridoTab(page: Page, maximo = 60): Promise<string[]> {
  const paradas: string[] = [];
  for (let i = 0; i < maximo; i++) {
    await page.keyboard.press("Tab");
    const parada = await page.evaluate((primera) => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const marca = "data-recorrido-tab";
      if (!primera) document.querySelectorAll(`[${marca}]`).forEach((n) => n.removeAttribute(marca));
      if (el.hasAttribute(marca)) return null;
      if (!primera) el.setAttribute(marca, "");
      const nombre = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40) ?? "";
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} "${nombre}"`;
    }, paradas.length > 0);
    if (parada === null) break;
    paradas.push(parada);
  }
  return paradas;
}
