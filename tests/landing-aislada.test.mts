/**
 * La landing no guarda nada porque no puede: ningún archivo de
 * `src/scripts/landing/` importa, ni directa ni transitivamente dentro de
 * `src/scripts/`, los módulos que leen o escriben el estado de la app.
 * landing-y-acceso 3.1 (AC-4, AC-5).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../", import.meta.url));
const SCRIPTS = join(RAIZ, "src", "scripts");
const LANDING = join(SCRIPTS, "landing");

const PROHIBIDOS = ["state", "sync", "queue", "ai", "pulse", "library", "progress", "track", "nav"];

async function existe(p: string): Promise<boolean> {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

/** Resuelve un import relativo a un archivo .ts real (con o sin extensión, o index.ts). */
async function resolver(desde: string, spec: string): Promise<string | null> {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(desde), spec);
  for (const c of [base, base + ".ts", join(base, "index.ts")]) if (await existe(c)) return c;
  return null;
}

function imports(src: string): string[] {
  const out: string[] = [];
  const re = /(?:^|[\s;])(?:import|export)\s+(type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of src.matchAll(re)) {
    if (m[1]) continue; // `import type` se borra al compilar: no carga nada.
    out.push(m[2] ?? m[3]);
  }
  return out;
}

/** Cada archivo alcanzable desde `entrada`, con la cadena de imports que lleva a él. */
async function alcanzables(entrada: string): Promise<Map<string, string[]>> {
  const vistos = new Map<string, string[]>([[entrada, [entrada]]]);
  const cola = [entrada];
  while (cola.length) {
    const f = cola.shift()!;
    for (const spec of imports(await readFile(f, "utf8"))) {
      const r = await resolver(f, spec);
      if (!r || vistos.has(r)) continue;
      vistos.set(r, [...vistos.get(f)!, r]);
      // Solo se sigue dentro de src/scripts/: los datos de src/data/ no leen estado.
      if (r.startsWith(SCRIPTS + sep)) cola.push(r);
    }
  }
  return vistos;
}

function prohibido(f: string): string | null {
  const rel = relative(SCRIPTS, f).split(sep).join("/");
  if (rel.startsWith("..")) return null;
  if (rel.startsWith("views/")) return "views/";
  const nombre = rel.replace(/\.ts$/, "");
  return PROHIBIDOS.includes(nombre) ? nombre : null;
}

test("existe src/scripts/landing/main.ts", async () => {
  assert.ok(await existe(join(LANDING, "main.ts")), "falta la entrada de la landing");
});

test("ningún archivo de la landing alcanza estado, sync, cola, IA, pulso, biblioteca, progreso, ruta, nav ni vistas", async () => {
  const archivos = (await readdir(LANDING)).filter(n => n.endsWith(".ts")).map(n => join(LANDING, n));
  assert.ok(archivos.length > 0);
  const fallos: string[] = [];
  for (const a of archivos) {
    for (const [f, cadena] of await alcanzables(a)) {
      const p = prohibido(f);
      if (p) fallos.push(cadena.map(c => relative(RAIZ, c)).join(" → "));
    }
  }
  assert.deepEqual(fallos, []);
});

test("el detector ve un import prohibido (control)", async () => {
  // main.ts de la app importa state.ts: el mismo recorrido tiene que encontrarlo.
  const desdeApp = await alcanzables(join(SCRIPTS, "main.ts"));
  assert.ok([...desdeApp.keys()].some(f => prohibido(f) === "state"));
});
