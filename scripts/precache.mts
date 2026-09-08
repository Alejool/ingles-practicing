/**
 * Deja el service worker listo para funcionar sin conexión.
 *
 * Astro pone un hash en el nombre de cada bundle, así que la lista de archivos
 * a precachear no se puede escribir a mano: hay que leerla del build. Este
 * script corre después de `astro build` y reescribe dos cosas dentro de
 * `dist/sw.js`:
 *
 *   PRECACHE  — el esqueleto imprescindible (html, css, el JS de arranque,
 *               iconos y manifest). Es lo que se descarga al instalar.
 *   OPCIONAL  — el contenido de las rutas y las lecturas. No se descarga al
 *               instalar, para no cargar a quien solo estudia una ruta; la app
 *               lo pide al arrancar y el propio SW lo va guardando.
 *
 * También sube la versión de la caché con el hash del build, así cada despliegue
 * invalida lo viejo sin tener que acordarse de tocar nada a mano.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, posix, relative, sep } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;

async function archivos(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await archivos(p));
    else out.push(p);
  }
  return out;
}

/** Ruta relativa a dist/, siempre con barras normales aunque sea Windows. */
function rel(p: string): string {
  return "./" + relative(DIST, p).split(sep).join(posix.sep);
}

/** El contenido de una ruta o sus lecturas: pesado y no todo el mundo lo usa. */
function esContenido(r: string): boolean {
  return /\/(a2b1|b1b2|reading\d?)\.[A-Za-z0-9_-]+\.js$/.test(r);
}

const todos = await archivos(DIST);

const esqueleto = new Set<string>(["./", "./index.html", "./manifest.webmanifest"]);
const opcional = new Set<string>();

for (const p of todos) {
  const r = rel(p);
  if (r === "./sw.js") continue;
  if (r.startsWith("./icons/")) { esqueleto.add(r); continue; }
  if (r.endsWith(".css")) { esqueleto.add(r); continue; }
  if (r.endsWith(".js")) {
    if (esContenido(r)) opcional.add(r);
    else esqueleto.add(r);
  }
}

const lista = (s: Set<string>) => [...s].sort();

// La versión sale del contenido: mismo build, misma versión; build nuevo, caché nueva.
const huella = createHash("sha256");
for (const p of todos.sort()) huella.update(rel(p)).update(String((await stat(p)).size));
const version = "ruta-" + huella.digest("hex").slice(0, 10);

const sw = join(DIST, "sw.js");
let src = await readFile(sw, "utf8");

function sustituir(nombre: string, valor: string): void {
  const re = new RegExp("(const " + nombre + "\\s*=\\s*)[\\s\\S]*?;\\n", "m");
  if (!re.test(src)) throw new Error("no encuentro " + nombre + " en sw.js");
  src = src.replace(re, "$1" + valor + ";\n");
}

sustituir("CACHE_VERSION", JSON.stringify(version));
sustituir("SHELL_FILES", JSON.stringify(lista(esqueleto), null, 2));
sustituir("CONTENT_FILES", JSON.stringify(lista(opcional), null, 2));

await writeFile(sw, src);

const kb = async (rs: string[]) => {
  let n = 0;
  for (const r of rs) n += (await stat(join(DIST, r.replace("./", "")).replace(/\/$/, ""))).size;
  return Math.round(n / 1024);
};
const esq = lista(esqueleto).filter(r => r !== "./");
console.log(`[precache] ${version}`);
console.log(`[precache] esqueleto: ${esq.length} archivos · ${await kb(esq)} KB (se instalan de golpe)`);
console.log(`[precache] contenido: ${opcional.size} archivos · ${await kb(lista(opcional))} KB (se guardan al usarlos)`);
