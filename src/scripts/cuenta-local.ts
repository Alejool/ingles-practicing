/**
 * De quién es el progreso de este navegador.
 *
 * `ruta-b1b2-v1` sigue siendo el progreso activo, con su nombre y su forma de
 * siempre (principio 6). Un marcador nuevo, `ruta-b1b2-cuenta`, dice de qué
 * cuenta es y si salió. Al entrar:
 * - sin marcador → ADOPTAR: el progreso sin dueño (de antes de las cuentas)
 *   pasa a esta cuenta; se deja una copia literal hasta que el servidor
 *   confirme la primera subida;
 * - misma cuenta → IGUAL;
 * - otra cuenta → CAMBIAR: lo de la anterior se archiva en `<clave>@<id>` y se
 *   restaura lo archivado de la nueva, si lo hay. Nada se mezcla ni se borra
 *   sin haber escrito y releído antes su copia.
 *
 * Trabaja sobre un `Storage` inyectado y no importa nada de la app: lo usa el
 * arranque antes de cargar `state.ts`.
 */

export const CLAVE_CUENTA = "ruta-b1b2-cuenta";
export const CLAVE_COPIA = "ruta-b1b2-v1-copia";
const CLAVE_PROGRESO = "ruta-b1b2-v1";

/** Claves que son de una cuenta y viajan con ella al cambiar. */
export const CLAVES_POR_CUENTA = [CLAVE_PROGRESO, "ruta-b1b2-sync-version"] as const;

export interface Marcador {
  v: 1;
  /** 16 hex de SHA-256 del correo normalizado. */
  id: string;
  /** Fecha ISO de "Cerrar sesión"; null mientras está dentro. */
  salida: string | null;
}

export interface Almacen {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export type Alineado = { ok: true; accion: "adoptar" | "igual" | "cambiar" } | { ok: false; motivo: string };

export async function idDeCuenta(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...hash.slice(0, 8)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function leerMarcador(s: Almacen): Marcador | null {
  try {
    const m = JSON.parse(s.getItem(CLAVE_CUENTA) || "null");
    if (m && m.v === 1 && typeof m.id === "string" && /^[0-9a-f]{16}$/.test(m.id)
      && (m.salida === null || typeof m.salida === "string")) {
      return { v: 1, id: m.id, salida: m.salida };
    }
  } catch { /* marcador ilegible = sin marcador */ }
  return null;
}

/** Con token, o con un marcador de alguien que no ha salido (sesión caducada sin red, AC-18). */
export function puedeEntrar(token: string | null, marcador: Marcador | null): boolean {
  return !!token || (!!marcador && marcador.salida === null);
}

/** "Cerrar sesión" en este dispositivo: el progreso se queda (AC-20). */
export function salir(s: Almacen, ahora = new Date()): void {
  const m = leerMarcador(s);
  if (m) s.setItem(CLAVE_CUENTA, JSON.stringify({ ...m, salida: ahora.toISOString() }));
}

/**
 * Escrituras con vuelta atrás: si una falla, se deshacen las anteriores y el
 * almacén queda como estaba.
 */
class Transaccion {
  private previos = new Map<string, string | null>();
  private s: Almacen;
  constructor(s: Almacen) { this.s = s; }

  private recordar(k: string): void {
    if (!this.previos.has(k)) this.previos.set(k, this.s.getItem(k));
  }

  escribir(k: string, v: string, verificar = false): void {
    this.recordar(k);
    this.s.setItem(k, v);
    if (verificar && this.s.getItem(k) !== v) throw new Error("La copia de " + k + " no coincide al releerla.");
  }

  quitar(k: string): void {
    this.recordar(k);
    this.s.removeItem(k);
  }

  deshacer(): void {
    for (const [k, v] of [...this.previos].reverse()) {
      try { v === null ? this.s.removeItem(k) : this.s.setItem(k, v); } catch { /* lo que no se pudo escribir no cambió */ }
    }
  }
}

/** El progreso parseado, o null si no hay o no es JSON de objeto. */
function parsear(progreso: string | null): Record<string, unknown> | null {
  try {
    const p = progreso ? JSON.parse(progreso) : null;
    return p && typeof p === "object" && !Array.isArray(p) ? p : null;
  } catch { return null; }
}

export function alinear(s: Almacen, id: string): Alineado {
  const marcador = leerMarcador(s);
  const t = new Transaccion(s);
  const nuevo = JSON.stringify({ v: 1, id, salida: null } satisfies Marcador);
  try {
    if (!marcador) {
      const v1 = s.getItem(CLAVE_PROGRESO);
      if (v1 !== null) t.escribir(CLAVE_COPIA, v1, true);
      t.escribir(CLAVE_CUENTA, nuevo);
      return { ok: true, accion: "adoptar" };
    }

    if (marcador.id === id) {
      t.escribir(CLAVE_CUENTA, nuevo);
      return { ok: true, accion: "igual" };
    }

    // 1. Archivar lo de la cuenta anterior, comprobando cada copia.
    for (const k of CLAVES_POR_CUENTA) {
      const v = s.getItem(k);
      // Sin valor: el archivo viejo de esa cuenta tampoco vale (p. ej. una versión caducada → 409).
      if (v !== null) t.escribir(k + "@" + marcador.id, v, true);
      else t.quitar(k + "@" + marcador.id);
    }
    // 2. El tema es del aparato: S.theme no viaja al servidor.
    const tema = parsear(s.getItem(CLAVE_PROGRESO))?.theme ?? null;
    // 3. Restaurar lo de la cuenta nueva (o dejarlo vacío: su copia ya está archivada).
    for (const k of CLAVES_POR_CUENTA) {
      const archivo = s.getItem(k + "@" + id);
      if (archivo !== null) t.escribir(k, archivo);
      else t.quitar(k);
    }
    // 4. Reponer el tema solo si cambia y el progreso se puede leer: si no, sus bytes no se tocan.
    const p = parsear(s.getItem(CLAVE_PROGRESO));
    if (p && tema !== null && (p.theme ?? null) !== tema) {
      p.theme = tema;
      t.escribir(CLAVE_PROGRESO, JSON.stringify(p));
    }
    t.escribir(CLAVE_CUENTA, nuevo);
    return { ok: true, accion: "cambiar" };
  } catch (e) {
    t.deshacer();
    return { ok: false, motivo: (e as Error)?.message || String(e) };
  }
}
