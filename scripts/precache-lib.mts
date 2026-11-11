/**
 * Reparto del precache, sin tocar disco (lo usa scripts/precache.mts y lo
 * prueba tests/precache.test.mts).
 *
 *   esqueleto — se instala de golpe: las dos páginas (app y landing), manifest,
 *               iconos, css y todo el JS que no es contenido de una ruta.
 *   opcional  — el contenido de las rutas y las lecturas: se guarda al usarlo.
 */

/** Páginas que abren sin red: la app y la landing pública (landing-y-acceso AC-7). */
const PAGINAS = ["./", "./index.html", "./bienvenida/", "./bienvenida/index.html", "./manifest.webmanifest"];

/** El contenido de una ruta o sus lecturas: pesado y no todo el mundo lo usa. */
export function esContenido(r: string): boolean {
  return /\/(a2b1|b1b2|reading\d?)\.[A-Za-z0-9_-]+\.js$/.test(r);
}

/** `rutas`: archivos del build relativos a dist/, con forma "./…". */
export function clasificar(rutas: string[]): { esqueleto: string[]; opcional: string[] } {
  const esqueleto = new Set<string>(PAGINAS);
  const opcional = new Set<string>();
  for (const r of rutas) {
    if (r === "./sw.js") continue;
    if (r.startsWith("./icons/") || r.endsWith(".css")) { esqueleto.add(r); continue; }
    if (r.endsWith(".js")) (esContenido(r) ? opcional : esqueleto).add(r);
  }
  return { esqueleto: [...esqueleto].sort(), opcional: [...opcional].sort() };
}
