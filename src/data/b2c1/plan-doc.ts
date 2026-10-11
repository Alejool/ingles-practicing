/**
 * Textos de B2 → C1 para el documento exportado del plan
 * (`scripts/exportar-plan.mts`: `BLOQUES`, `EXAMEN` y `METAS`).
 *
 * Las formas son las mismas que usa el exportador para las otras rutas. No hay
 * tipos con nombre para ellas en `src/data/types.ts`, así que aquí van escritas
 * en línea. Este archivo no forma parte de `Track` ni lo importa el `index.ts`
 * de la ruta: lo lee solo el exportador.
 */

/** Nombre y descripción de cada bloque. El tramo 1 solo publica el bloque A. */
export const BLOQUES_C1: Record<string, [string, string]> = {
  A: ["Énfasis y precisión", "Inversión, cleft sentences, condicionales formales y modales perfectos: las estructuras con las que un texto deja de sonar a B2."],
};

/** Formato oficial de C1 Advanced. */
export const EXAMEN_C1: { nombre: string; aprobar: string; partes: Array<[string, string, string]> } = {
  nombre: "Cambridge C1 Advanced",
  aprobar: "Se aprueba con 180 en la Cambridge English Scale, alrededor del 60 % de la puntuación total. Entre 160 y 179 no se obtiene el C1, pero Cambridge certifica un nivel B2.",
  partes: [
    ["Reading & Use of English", "1 h 30 min", "8 partes, 56 preguntas: 4 de gramática y vocabulario, 4 de lectura."],
    ["Writing", "1 h 30 min", "Un essay obligatorio de 220–260 palabras y otra tarea a elegir: carta o correo, propuesta, informe o reseña."],
    ["Listening", "unos 40 min", "4 partes, 30 preguntas. Cada audio suena dos veces."],
    ["Speaking", "15 min", "En pareja: entrevista, turno largo con imágenes, tarea conjunta y discusión."],
  ],
};

/**
 * Metas orientativas de cada control: semana, meta y qué hacer.
 * Los simulacros llegan con el tramo 2; las metas quedan escritas para que el
 * documento del plan pueda anunciarlas.
 */
export const METAS_C1: Array<[number, string, string]> = [
  [6, "Línea de partida", "Sin meta: anota la nota. Lo que importa es la diferencia con la semana 12."],
  [12, "40 % o más", "Repites el diagnóstico. Si una unidad sigue por debajo del 60 %, repite su semana antes de seguir."],
  [18, "50 % o más", "Si no llegas, dedica las semanas siguientes a las áreas que el radar tenga en rojo antes que al formato."],
  [23, "60 % o más", "Es la zona del aprobado. Por encima del 70 % vas con margen al examen real."],
];
