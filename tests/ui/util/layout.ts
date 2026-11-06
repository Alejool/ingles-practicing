import { expect, type Page } from "@playwright/test";

/** El documento no se puede desplazar en horizontal (AC-13). */
export async function sinScrollHorizontal(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `scroll horizontal: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`).toBe(clientWidth);
}

/** Cada elemento visible que casa con `selector` mide al menos 44×44 (AC-16). */
export async function dianas44(page: Page, selector: string): Promise<void> {
  const pequenas = await page.locator(selector).evaluateAll((nodos) =>
    nodos
      .map((n) => ({ n, r: n.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0)
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ n, r }) => `${n.tagName.toLowerCase()} "${(n.textContent ?? "").trim().slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(pequenas, `dianas menores de 44×44 en "${selector}"`).toEqual([]);
}
