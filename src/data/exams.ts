/** Contenido estático que Astro renderiza en el build (no necesita JS en el cliente). */

export interface ExamRow {
  name: string;
  sub?: string;
  level: string;
  levelNote?: string;
  format: string;
  validity: string;
  purpose: string;
}

export const EXAMS: ExamRow[] = [
  {
    name: "B1 Preliminary", sub: "Cambridge PET",
    level: "B1", levelNote: "140–159",
    format: "Reading (6 partes) · Writing (2 tareas) · Listening (4 partes) · Speaking (4 partes, en pareja)",
    validity: "No caduca",
    purpose: "Prueba de nivel intermedio. Buen ensayo antes del B2.",
  },
  {
    name: "B2 First", sub: "Cambridge FCE",
    level: "B2", levelNote: "160–179",
    format: "Reading & Use of English (7 partes, 75 min) · Writing (2 tareas, 80 min) · Listening (40 min) · Speaking (14 min, en pareja)",
    validity: "No caduca",
    purpose: "El estándar en Europa y LatAm para trabajo y universidad.",
  },
  {
    name: "IELTS Academic / General",
    level: "B1 ≈ 4.0–5.0 · B2 ≈ 5.5–6.5",
    format: "Listening 30 min · Reading 60 min · Writing 60 min · Speaking 11–14 min (entrevista 1 a 1)",
    validity: "2 años",
    purpose: "Migración y universidades. Banda, no aprobado/reprobado.",
  },
  {
    name: "TOEFL iBT",
    level: "B1 ≈ 42–71 · B2 ≈ 72–94",
    format: "Reading · Listening · Speaking (grabado) · Writing. Todo por computadora, ~2 h",
    validity: "2 años",
    purpose: "Universidades de EE. UU. Inglés académico y tareas integradas.",
  },
  {
    name: "Aptis ESOL", sub: "British Council",
    level: "A1–C",
    format: "Gramática y vocabulario + 4 destrezas, modular, por computadora",
    validity: "Sin caducidad oficial",
    purpose: "Empresas y procesos públicos. Resultado en 48–72 h.",
  },
  {
    name: "Linguaskill", sub: "Cambridge",
    level: "A1–C1+",
    format: "Adaptativo por computadora, módulos independientes",
    validity: "Recomendado 2 años",
    purpose: "Rápido y barato para acreditar nivel en empresa.",
  },
  {
    name: "TOEIC L&R",
    level: "B1 ≈ 550–780 · B2 ≈ 785–940",
    format: "Listening 45 min · Reading 75 min, 200 ítems de opción múltiple",
    validity: "2 años",
    purpose: "Inglés de oficina. No evalúa producción.",
  },
];

export interface Pick { title: string; body: string }

export const PICKS: Pick[] = [
  {
    title: "Trabajo remoto o empresa",
    body: "<b>B2 First</b> o <b>Linguaskill</b>. El First no caduca y es el que reconocen sin explicaciones. Si tu empresa pide un número rápido, Linguaskill sale en días.",
  },
  {
    title: "Universidad o posgrado fuera",
    body: "<b>IELTS Academic</b> o <b>TOEFL iBT</b>. Revisa primero la banda mínima que pide el programa: muchas piden 6.5 en IELTS, que es B2 alto, no B2 justo.",
  },
  {
    title: "Migración",
    body: "<b>IELTS General</b> suele ser el aceptado. Verifica en la web de inmigración del país qué versión y qué banda por destreza exigen.",
  },
  {
    title: "No estás seguro todavía",
    body: "Entrena para <b>B2 First</b>. Es el formato más exigente en producción escrita y oral: si llegas ahí, cualquier otro examen es un cambio de formato, no de nivel.",
  },
];

/** [minutos, bloque, qué haces] */
export const ROUTINE: Array<[string, string, string]> = [
  ["0–8", "Vocabulario", "Módulo 05: 20 tarjetas del mazo de hoy. Sin saltarte las falladas."],
  ["8–20", "Gramática", "Módulo 04: una unidad + sus drills hasta 80% de acierto."],
  ["20–32", "Use of English", "Módulo 06: 8 ítems (transformación, cloze o word formation)."],
  ["32–44", "Listening o Reading", "Módulo 08: alterna días. Siempre con transcript después."],
  ["44–50", "Producción", "Speaking Parte 1 en voz alta (2 min) + registrar 3 errores en el Módulo 11."],
];
