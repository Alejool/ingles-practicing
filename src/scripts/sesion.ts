/**
 * Registro de sesiones en curso.
 *
 * Cada vista guarda su tanda en variables propias; el selector de ruta necesita
 * saber si hay alguna en marcha sin importar las vistas. Aquí se apuntan al
 * pintarse y se borran al terminar. Vive en memoria: nunca se guarda.
 */

export type TipoSesion = "simulacro" | "tanda" | "ia" | "informativa";

export interface SesionActiva {
  tipo: TipoSesion;
  /** "Simulacro 2", "Gramática · unidad 3". */
  nombre: string;
  /** Qué se pierde al cambiar, en una frase. Vacío si nada. */
  pierde: string;
  /** Qué se conserva, en una frase. */
  conserva: string;
  /** Deja la vista en reposo: para relojes, audio y pantalla completa. Sin confirmaciones. */
  cerrar: () => void;
}

const registro = new Map<string, SesionActiva>();

/** Apunta la sesión de una vista, sustituye la que tuviera o, con `null`, la retira. */
export function declararSesion(id: string, s: SesionActiva | null): void {
  if (s) registro.set(id, s);
  else registro.delete(id);
}

export function sesionesActivas(): SesionActiva[] {
  return [...registro.values()];
}

/** Cierra todas. Un `cerrar()` que falla no impide cerrar las demás ni cambiar de ruta. */
export function cerrarSesiones(): void {
  for (const [id, s] of [...registro]) {
    try { s.cerrar(); } catch (e) { console.error("[sesion] falló al cerrar", id, e); }
  }
  registro.clear();
}
