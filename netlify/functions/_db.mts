/**
 * Acceso a PostgreSQL.
 *
 * Tres drivers, elegidos solos:
 *   neon   → HTTP, sin conexiones persistentes. Es lo que funciona en Netlify.
 *   pg     → TCP con pool. Docker o cualquier servidor propio.
 *   pglite → Postgres compilado a WASM, guardado en una carpeta. Sin servicio
 *            que instalar ni cuenta que crear: `npm start` y ya hay base.
 *
 * Los tres hablan el MISMO SQL —pglite es Postgres de verdad, no una imitación—
 * así que cambiar de uno a otro no toca ni una consulta: se cambia la variable,
 * se restaura una copia y sigue todo igual.
 *
 * Se decide por DB_DRIVER, o mirando DATABASE_URL. Sin DATABASE_URL se usa
 * pglite, para que la app arranque en cualquier sitio sin configurar nada.
 * Los tests inyectan el suyo con `setDriver`.
 */

export type Row = Record<string, any>;
export type Driver = (text: string, params: any[]) => Promise<Row[]>;

let driver: Driver | null = null;

export function setDriver(d: Driver | null): void {
  driver = d;
}

function chosen(): "neon" | "pg" | "pglite" {
  const explicit = (process.env.DB_DRIVER || "").toLowerCase();
  if (explicit === "neon" || explicit === "pg" || explicit === "pglite") return explicit;
  const url = process.env.DATABASE_URL || "";
  // Sin cadena de conexión no hay nada a lo que conectarse: base en carpeta.
  if (!url || /^(file|pglite):/.test(url)) return "pglite";
  return /neon\.tech|neon\.build/.test(url) ? "neon" : "pg";
}

/** Dónde guarda pglite sus archivos. Una carpeta, como los datos de Postgres. */
export function pgliteDir(): string {
  const url = process.env.DATABASE_URL || "";
  return process.env.PGLITE_DIR
    || (/^(file|pglite):/.test(url) ? url.replace(/^(file|pglite):(\/\/)?/, "") : "")
    || "./data/pglite";
}

/**
 * Postgres dentro del propio proceso.
 *
 * Una sola conexión y un solo proceso: pglite no se comparte entre varios
 * servidores a la vez, así que sirve para tu máquina, para un VPS con un
 * proceso, y no para funciones sin servidor (ahí el disco se borra en cada
 * llamada y la base desaparecería). Para eso están `pg` y `neon`.
 */
let pglite: any = null;

/**
 * Un cerrojo, y no por manía: dos procesos sobre la misma carpeta no fallan
 * limpiamente, la dejan sin poder abrirse. Mejor negarse antes de tocarla.
 *
 * El archivo lleva el PID, así que un cerrojo de un proceso que ya no existe
 * (un corte de luz, un `kill -9`) no bloquea nada: se pisa y se sigue. Los
 * datos sí sobreviven a eso; lo que no sobrevive es abrirla dos veces.
 */
async function tomarCerrojo(dir: string): Promise<() => void> {
  const { mkdirSync, readFileSync, writeFileSync, unlinkSync } = await import("node:fs");
  const { join } = await import("node:path");
  const cerrojo = join(dir, "en-uso.json");

  mkdirSync(dir, { recursive: true });
  try {
    const previo = JSON.parse(readFileSync(cerrojo, "utf8"));
    // Señal 0: no mata, solo pregunta si el proceso sigue vivo.
    try { process.kill(previo.pid, 0); } catch { throw new Error("cerrojo huérfano"); }
    throw new Error(
      `La base de ${dir} ya la está usando otro proceso (PID ${previo.pid}, desde ${previo.desde}).\n` +
      `Con pglite solo puede abrirla uno a la vez: para la app, haz lo tuyo y vuelve a arrancarla.`
    );
  } catch (e: any) {
    // Ni archivo, ni cerrojo válido: seguimos. Cualquier otro error sí sube.
    if (e?.code !== "ENOENT" && e?.message !== "cerrojo huérfano" && !(e instanceof SyntaxError)) throw e;
  }

  writeFileSync(cerrojo, JSON.stringify({ pid: process.pid, desde: new Date().toISOString() }));
  let suelto = false;
  const soltar = () => {
    if (suelto) return;
    suelto = true;
    try { unlinkSync(cerrojo); } catch { /* ya no está */ }
  };
  process.once("exit", soltar);
  return soltar;
}

function pgliteDriver(): Driver {
  const dir = pgliteDir();
  let dbPromise: Promise<any> | null = null;
  return async (text, params) => {
    if (!dbPromise) {
      dbPromise = (async () => {
        const soltar = await tomarCerrojo(dir);
        try {
          const mod: any = await import("@electric-sql/pglite");
          pglite = await mod.PGlite.create(dir);
          return pglite;
        } catch (e) {
          soltar();
          throw e;
        }
      })();
    }
    const db = await dbPromise;
    const res = await db.query(text, params);
    return (res?.rows ?? []) as Row[];
  };
}

/**
 * Cierre ordenado. Con pg y neon no hace falta —el sistema operativo se encarga—
 * pero con pglite conviene: suelta el cerrojo y deja la carpeta a punto para el
 * siguiente arranque o para una copia de seguridad.
 */
export async function closeDb(): Promise<void> {
  if (pglite) {
    try { await pglite.close(); } catch { /* ya estaba cerrada */ }
    pglite = null;
  }
  driver = null;
}

function neonDriver(): Driver {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  let sqlPromise: Promise<any> | null = null;
  return async (text, params) => {
    if (!sqlPromise) {
      sqlPromise = import("@neondatabase/serverless").then(mod => mod.neon(url, { fullResults: true }));
    }
    const sql = await sqlPromise;
    const res = await sql.query(text, params);
    return (res.rows ?? res) as Row[];
  };
}

function pgDriver(): Driver {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  let poolPromise: Promise<any> | null = null;
  return async (text, params) => {
    if (!poolPromise) {
      poolPromise = import("pg").then(mod => {
        const Pool = (mod as any).default?.Pool ?? (mod as any).Pool;
        return new Pool({
          connectionString: url,
          max: Number(process.env.DB_POOL_MAX || 8),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
          ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
        });
      });
    }
    const pool = await poolPromise;
    const res = await pool.query(text, params);
    return res.rows as Row[];
  };
}

/** Ejecuta SQL con parámetros posicionales ($1, $2…). Nunca interpoles valores. */
export async function q<T = Row>(text: string, params: any[] = []): Promise<T[]> {
  if (!driver) {
    const cual = chosen();
    driver = cual === "neon" ? neonDriver() : cual === "pglite" ? pgliteDriver() : pgDriver();
  }
  return (await driver(text, params)) as T[];
}

export async function one<T = Row>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows.length ? rows[0] : null;
}

/** Devuelve el primer valor de la primera fila, útil para count(*). */
export async function scalar<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const row = await one(text, params);
  if (!row) return null;
  const k = Object.keys(row)[0];
  return row[k] as T;
}

/** Aplica db/schema.sql. Idempotente: se puede lanzar en cada arranque. */
export async function migrate(sql: string): Promise<number> {
  const withoutComments = sql
    .split("\n")
    .map(line => line.replace(/--.*$/, ""))
    .join("\n");
  const statements = withoutComments.split(";").map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) await q(stmt, []);
  return statements.length;
}
