/**
 * Limpieza del poco HTML que se pinta tal cual.
 *
 * Las explicaciones de las preguntas (`e`) llevan `<b>` e `<i>` y por eso van a
 * `innerHTML`. Las del banco las escribimos nosotros; las de la biblioteca
 * compartida y las generadas con IA no, así que pasan por aquí en el servidor
 * al publicarse y en el cliente al leerse y al pintarse. Vive en `shared/` para
 * que los dos lados usen exactamente la misma regla.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Tres casos, en este orden: una etiqueta permitida escrita sin nada dentro
 * (ni atributos ni espacios), un carácter con significado en HTML, o un `&` que
 * no abre una entidad. Las entidades ya escritas se dejan como están, así que
 * limpiar dos veces da lo mismo que limpiar una.
 */
const PELIGRO = /(<\/?(?:b|i|strong|em)>)|[<>"']|&(?!(?:[a-z][a-z0-9]{1,31}|#[0-9]{1,7}|#x[0-9a-f]{1,6});)/gi;

/** Texto plano más `<b>`, `<i>`, `<strong>` y `<em>` sin atributos. Lo demás, escapado. */
export function htmlSeguro(texto: unknown): string {
  if (typeof texto !== "string") return "";
  return texto.replace(PELIGRO, (trozo, etiqueta?: string) => etiqueta ? etiqueta.toLowerCase() : ESCAPES[trozo]);
}

export interface PreguntaLectura {
  q: string;
  o: string[];
  a: number;
  e: string;
}

export interface Lectura {
  title: string;
  body: string[];
  qs: PreguntaLectura[];
}

/** Copia de una lectura con las explicaciones limpias. El original no se toca. */
export function lecturaSegura(texto: Lectura): Lectura {
  return { ...texto, qs: texto.qs.map(p => ({ ...p, e: htmlSeguro(p.e) })) };
}
