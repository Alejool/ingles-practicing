/**
 * Copia de seguridad de la base de datos.
 *
 * El progreso de todo el mundo vive en una tabla; si se pierde, se pierde el
 * trabajo de meses de gente que confió en la app. Esto lo salva en un archivo
 * comprimido que se puede volver a cargar en cualquier PostgreSQL.
 *
 *   node scripts/backup.mts                   copia a ./backups
 *
 * Sirve igual con Postgres, con Neon y con pglite, y esa es la vía para cambiar
 * de una a otra: copia con la de origen, restaura con la de destino.
 *   node scripts/backup.mts --out /ruta       a otra carpeta
 *   node scripts/backup.mts --keep 30         conserva 30 copias y borra las viejas
 *   node scripts/backup.mts --list            qué copias hay
 *   node scripts/backup.mts --restore <fich>  vuelve a cargar una copia
 *
 * Con Docker:  bash start.sh backup     ·     bash start.sh restore <fichero>
 *
 * Qué se guarda: cuentas, progreso, biblioteca compartida, latidos y consumo.
 * Qué NO: las sesiones abiertas ni los enlaces de acceso pendientes. Son
 * temporales y guardarlos solo sería un riesgo: al restaurar, cada quien vuelve
 * a entrar con su correo y se encuentra su progreso intacto.
 *
 * El formato es JSON por líneas dentro de un .gz, no un volcado de PostgreSQL:
 * así se puede leer, revisar y restaurar sin tener instalado pg_dump y sin
 * depender de la versión del servidor.
 */

import { createGzip, createGunzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { q } from "../netlify/functions/_db.mts";

/** Orden importante: las claves ajenas mandan (users antes que progress). */
const TABLAS = [
  { nombre: "users", clave: "id" },
  { nombre: "progress", clave: "user_id" },
  { nombre: "shared_readings", clave: "id" },
  { nombre: "pulse", clave: "anon" },
  { nombre: "ai_usage", clave: "id" },
] as const;

const C = process.stdout.isTTY
  ? { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", n: "\x1b[0m" }
  : { g: "", r: "", y: "", d: "", b: "", n: "" };

function arg(nombre: string, pordefecto = ""): string {
  const i = process.argv.indexOf("--" + nombre);
  return i >= 0 ? (process.argv[i + 1] || "") : pordefecto;
}
function flag(nombre: string): boolean {
  return process.argv.includes("--" + nombre);
}

function sello(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function tam(bytes: number): string {
  return bytes > 1e6 ? (bytes / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

async function copiasDe(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter(f => /^ruta-.*\.jsonl\.gz$/.test(f)).sort();
  } catch { return []; }
}

/* ── copiar ─────────────────────────────────────────────────────────── */

async function copiar(dir: string, keep: number): Promise<void> {
  await mkdir(dir, { recursive: true });
  const fichero = join(dir, `ruta-${sello()}.jsonl.gz`);

  const gz = createGzip({ level: 9 });
  const escritura = pipeline(gz, createWriteStream(fichero));

  const escribir = (o: unknown) => new Promise<void>((res, rej) => {
    gz.write(JSON.stringify(o) + "\n", e => (e ? rej(e) : res()));
  });

  await escribir({ tipo: "cabecera", version: 1, fecha: new Date().toISOString(), tablas: TABLAS.map(t => t.nombre) });

  const cuenta: Record<string, number> = {};
  for (const t of TABLAS) {
    let desde: any = null;
    let n = 0;
    // Por páginas, para que una tabla grande no se cargue entera en memoria.
    for (;;) {
      const filas = desde === null
        ? await q(`select * from ${t.nombre} order by ${t.clave} limit 500`, [])
        : await q(`select * from ${t.nombre} where ${t.clave} > $1 order by ${t.clave} limit 500`, [desde]);
      if (!filas.length) break;
      for (const f of filas) await escribir({ tipo: "fila", tabla: t.nombre, datos: f });
      desde = filas[filas.length - 1][t.clave];
      n += filas.length;
      if (filas.length < 500) break;
    }
    cuenta[t.nombre] = n;
    console.log(`  ${C.g}✓${C.n} ${t.nombre} ${C.d}${n} filas${C.n}`);
  }

  await escribir({ tipo: "fin", filas: cuenta });
  gz.end();
  await escritura;

  const bytes = (await stat(fichero)).size;
  console.log(`\n${C.g}Copia guardada${C.n} ${fichero} ${C.d}(${tam(bytes)})${C.n}`);

  if (keep > 0) {
    const todas = await copiasDe(dir);
    const sobran = todas.slice(0, Math.max(0, todas.length - keep));
    for (const f of sobran) await unlink(join(dir, f));
    if (sobran.length) console.log(`${C.d}Borradas ${sobran.length} copias antiguas (se conservan ${keep}).${C.n}`);
  }
}

/* ── restaurar ──────────────────────────────────────────────────────── */

async function restaurar(fichero: string): Promise<void> {
  const ruta = resolve(fichero);
  console.log(`${C.b}Restaurando${C.n} ${ruta}`);
  console.log(`${C.y}Las filas con la misma clave se sobrescriben con las de la copia.${C.n}\n`);

  const lineas = createInterface({
    input: createReadStream(ruta).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  const cuenta: Record<string, number> = {};
  for await (const linea of lineas) {
    if (!linea.trim()) continue;
    const reg = JSON.parse(linea);
    if (reg.tipo === "cabecera") {
      console.log(`${C.d}Copia del ${reg.fecha} · formato ${reg.version}${C.n}`);
      continue;
    }
    if (reg.tipo !== "fila") continue;

    const t = TABLAS.find(x => x.nombre === reg.tabla);
    if (!t) continue;

    const cols = Object.keys(reg.datos);
    const vals = cols.map(c => reg.datos[c]);
    const huecos = cols.map((_, i) => "$" + (i + 1)).join(", ");
    const set = cols.filter(c => c !== t.clave).map(c => `${c} = excluded.${c}`).join(", ");
    const clave = t.nombre === "pulse" ? "(anon, day)" : `(${t.clave})`;

    await q(
      `insert into ${t.nombre} (${cols.join(", ")}) values (${huecos})
       on conflict ${clave} do update set ${set || `${t.clave} = excluded.${t.clave}`}`,
      vals
    );
    cuenta[reg.tabla] = (cuenta[reg.tabla] || 0) + 1;
  }

  // ai_usage numera con una secuencia: hay que adelantarla o el siguiente
  // insert choca con una clave que ya existe. Las demás tablas usan uuid o texto.
  for (const t of ["ai_usage"]) {
    try {
      await q(`select setval(pg_get_serial_sequence('${t}', 'id'),
                 greatest((select coalesce(max(id), 1) from ${t}), 1))`, []);
    } catch { /* esa tabla no usa secuencia */ }
  }

  for (const [tabla, n] of Object.entries(cuenta)) console.log(`  ${C.g}✓${C.n} ${tabla} ${C.d}${n} filas${C.n}`);
  console.log(`\n${C.g}Restaurado.${C.n}`);
}

/* ── entrada ────────────────────────────────────────────────────────── */

const dir = resolve(arg("out", process.env.BACKUP_DIR || "backups"));

try {
  // Con pglite la base es una carpeta y no hay cadena de conexión que exigir.
  const enCarpeta = (process.env.DB_DRIVER || "").toLowerCase() === "pglite"
    || /^(file|pglite):/.test(process.env.DATABASE_URL || "");
  if (!process.env.DATABASE_URL && !enCarpeta) {
    throw new Error("Falta DATABASE_URL: exporta la variable, o usa DB_DRIVER=pglite, o lánzalo con 'bash start.sh backup'.");
  }

  if (flag("list")) {
    const todas = await copiasDe(dir);
    if (!todas.length) console.log(`No hay copias en ${dir}.`);
    for (const f of todas) console.log(`  ${f}  ${C.d}${tam((await stat(join(dir, f))).size)}${C.n}`);
  } else if (arg("restore")) {
    await restaurar(arg("restore"));
  } else {
    console.log(`${C.b}Copia de seguridad${C.n} ${C.d}→ ${dir}${C.n}`);
    await copiar(dir, Number(arg("keep", process.env.BACKUP_KEEP || "14")) || 0);
  }
  process.exit(0);
} catch (e: any) {
  const msg = String(e?.message || e);
  console.error(`${C.r}✗${C.n} ${msg}`);
  // pglite es una base dentro del proceso: dos a la vez sobre la misma carpeta
  // no pueden. El mensaje que suelta es críptico, así que se traduce.
  if (/Aborted|EBUSY|locked|lock/i.test(msg) && (process.env.DB_DRIVER || "").toLowerCase() === "pglite") {
    console.error(`
${C.y}La app está usando esa carpeta.${C.n} Con pglite la base vive dentro del propio
proceso, así que solo puede abrirla uno a la vez. Para la app, haz la copia y
vuelve a arrancarla — son unos segundos:

  bash start.sh stop  &&  node scripts/backup.mts  &&  bash start.sh

Si necesitas copias sin parar nada, ese es el momento de pasarte a Postgres.`);
  }
  process.exit(1);
}
