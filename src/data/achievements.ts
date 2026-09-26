/** Logros. Se calculan a partir del progreso: no hay nada que guardar aparte. */

import type { Achievement } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  { id: "a-start", icon: "◔", t: "Primer día", d: "Completa el primer día del plan." },
  { id: "a-week", icon: "◑", t: "Una semana", d: "Cinco días del plan completados." },
  { id: "a-month", icon: "◕", t: "Un mes", d: "Veinte días del plan completados." },
  { id: "a-half", icon: "●", t: "Media ruta", d: "Sesenta días del plan completados." },
  { id: "a-all", icon: "★", t: "Ruta terminada", d: "Los 120 días." },
  { id: "s-3", icon: "▲", t: "Tres seguidos", d: "Estudia tres días seguidos." },
  { id: "s-7", icon: "▲▲", t: "Semana sin fallar", d: "Siete días seguidos." },
  { id: "s-30", icon: "▲▲▲", t: "Treinta seguidos", d: "Un mes sin saltarte un día." },
  { id: "v-100", icon: "▮", t: "Cien tarjetas", d: "Cien aciertos de vocabulario." },
  { id: "v-500", icon: "▮▮", t: "Quinientas", d: "Quinientos aciertos de vocabulario." },
  { id: "v-box5", icon: "◆", t: "Caja cinco", d: "Veinte tarjetas en la última caja del Leitner." },
  { id: "g-unit", icon: "✎", t: "Unidad limpia", d: "Una unidad de gramática con todos los drills acertados." },
  { id: "g-five", icon: "✎✎", t: "Cinco unidades", d: "Cinco unidades completadas." },
  { id: "u-50", icon: "⊞", t: "Cincuenta ítems", d: "Cincuenta ejercicios de Use of English corregidos." },
  { id: "m-first", icon: "⏱", t: "Primer simulacro", d: "Haz un simulacro cronometrado." },
  { id: "m-60", icon: "⏱✓", t: "Aprobado raspado", d: "Un simulacro por encima del 60%." },
  { id: "m-80", icon: "⏱★", t: "Simulacro sólido", d: "Un simulacro por encima del 80%." },
  { id: "w-ai", icon: "✍", t: "Primera corrección", d: "Pide que te corrijan un texto." },
  { id: "e-10", icon: "✱", t: "Cuaderno vivo", d: "Diez errores anotados." },
  { id: "d-both", icon: "⇄", t: "Las dos rutas", d: "Haz el diagnóstico de las dos rutas." },
  { id: "n-10", icon: "✐", t: "Cuaderno abierto", d: "Diez palabras en tu cuaderno de difíciles." },
  { id: "n-box5", icon: "✐✓", t: "Domadas", d: "Diez palabras difíciles llegan a la última caja." },
  { id: "q-first", icon: "◧", t: "Primera prueba", d: "Haz una prueba rápida." },
  { id: "q-90", icon: "◨", t: "Casi perfecto", d: "Una prueba rápida por encima del 90%." },
  { id: "r-10", icon: "▤", t: "Diez lecturas", d: "Termina diez textos de la biblioteca." },
  { id: "r-gen", icon: "▥", t: "Texto a medida", d: "Genera tu primer texto con IA." },
  { id: "sp-ai", icon: "🎙", t: "Primera evaluación oral", d: "Pide que evalúen una respuesta hablada." },
];
