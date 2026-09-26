/** Tipos del contenido del curso. Añadir material es añadir objetos a src/data/*. */

export type Level = "A2" | "B1" | "B2" | "B2+";

export interface DiagItem {
  id: string;
  area: string;
  lvl: string;
  q: string;
  opts: string[];
  /** Índice de la opción correcta. */
  a: number;
  /** Explicación en HTML, orientada a hispanohablantes. */
  exp: string;
}

export interface PlanWeek {
  n: number;
  t: string;
  gram: string[];
  lex: string[];
  skill: string[];
  tasks: string[];
}

export interface PlanBlock {
  id: string;
  name: string;
  wk: string;
  goal: string;
  weeks: PlanWeek[];
}

export interface Drill {
  q: string;
  o: string[];
  a: number;
  e: string;
}

export interface GrammarUnit {
  id: string;
  n: number;
  t: string;
  lvl: string;
  rule: string;
  trap: string;
  dr: Drill[];
}

/** [término, transcripción, significado, ejemplo] */
export type Card = [string, string, string, string];

/** Familia a la que pertenece un mazo. Agrupa el selector de Vocabulario. */
export type DeckCat =
  | "comunes" | "verbos" | "adjetivos" | "phrasal" | "falsos"
  | "compuestas" | "colocaciones" | "conectores" | "formacion" | "preposiciones";

export const DECK_CATS: Array<[DeckCat, string]> = [
  ["comunes", "Palabras comunes"],
  ["verbos", "Verbos"],
  ["adjetivos", "Adjetivos"],
  ["phrasal", "Phrasal verbs"],
  ["falsos", "Falsos amigos"],
  ["compuestas", "Palabras compuestas"],
  ["colocaciones", "Colocaciones"],
  ["preposiciones", "Preposiciones"],
  ["formacion", "Formación de palabras"],
  ["conectores", "Conectores"],
];

export interface Deck {
  id: string;
  name: string;
  cards: Card[];
  cat?: DeckCat;
}

export interface Transformation {
  id: string;
  s1: string;
  key: string;
  s2: string;
  a: string[];
  e: string;
}

export interface ClozeGap {
  g: number;
  a: string[];
  e: string;
}

export type ClozePart = string | ClozeGap;

export interface Cloze {
  title: string;
  parts: ClozePart[];
}

export interface WordForm {
  id: string;
  s: string;
  root: string;
  a: string[];
  e: string;
}

export type RubricCriterion = [string, string];

export interface WritingTask {
  id: string;
  name: string;
  lvl: string;
  words: string;
  time: string;
  prompt: string;
  plan: string[];
  phr: string[];
  chk: string[];
  model: string;
}

export interface SpeakingPart {
  id: string;
  name: string;
  /** Segundos del cronómetro. */
  time: number;
  lvl: string;
  what: string;
  tips: string[];
  lang: string[];
  prompts: string[];
}

export interface ReadingQuestion {
  q: string;
  o: string[];
  a: number;
  e: string;
}

export interface ReadingText {
  title: string;
  body: string[];
  qs: ReadingQuestion[];
}

/** Una intervención del guion. A y B suenan con voces distintas. */
export interface ListeningLine {
  s: "A" | "B";
  t: string;
}

export interface ListeningTrack {
  id: string;
  title: string;
  /** Qué parte del examen imita, en una línea. */
  kind: string;
  /** La situación, para ponerse en contexto antes del primer pase. */
  context: string;
  /** Quién es cada voz. B falta en los monólogos. */
  speakers: { A: string; B?: string };
  lines: ListeningLine[];
  /** Tres opciones, como en B1 Preliminary y B2 First. */
  qs: ReadingQuestion[];
}

export interface Strategy {
  t: string;
  b: string[];
}

export type MockSlot = { n: number };
export type MockTextPart = string | MockSlot;

export interface MockMcqItem { n: number; o: string[]; a: number; e: string; part?: number }
export interface MockGapItem { n: number; a: string[]; e: string; part?: number }
export interface MockWordFormItem { n: number; s: string; root: string; a: string[]; e: string; part?: number }
export interface MockTransItem { n: number; s1: string; key: string; s2: string; a: string[]; e: string; part?: number }

export interface MockPaper {
  p1: { title: string; intro: string; text: MockTextPart[]; items: MockMcqItem[] };
  p2: { title: string; intro: string; text: MockTextPart[]; items: MockGapItem[] };
  p3: { title: string; intro: string; items: MockWordFormItem[] };
  p4: { title: string; intro: string; items: MockTransItem[] };
}

export type MockItem = MockMcqItem | MockGapItem | MockWordFormItem | MockTransItem;

export interface ResourceGroup {
  t: string;
  items: Array<[string, string]>;
}

/** Discrimina texto de hueco en las partes de un Cloze. */
export function isGap(part: ClozePart): part is ClozeGap {
  return typeof part !== "string";
}

/* ─────────────── Plan diario ─────────────── */

/** Qué clase de sesión es hoy. Determina el reparto de los 45 minutos. */
export type DayFocus =
  | "leccion"    // regla nueva + drills
  | "drills"     // consolidar la regla con volumen
  | "lectura"    // comprensión escrita con protocolo
  | "escucha"    // comprensión oral, tres pases
  | "writing"    // escribir y corregir
  | "speaking"   // hablar contra el reloj
  | "repaso"     // lo fallado, nada nuevo
  | "simulacro"; // examen cronometrado

export interface DaySpec {
  /** Título concreto del día. */
  t: string;
  focus: DayFocus;
  /** La tarea de producción del día, en español. */
  task: string;
  /** Unidad de gramática de hoy, si no es la de la semana. */
  unit?: string;
  /** Mazo de hoy, si no es el de la semana. */
  deck?: string;
  /** Bloque de Use of English de hoy. */
  uoe?: "trans" | "cloze" | "wform";
  /** A dónde lleva el paso de producción. */
  goto?: StepGoto;
}

export interface WeekSpec {
  w: number;
  /** A, B, C o D. */
  block: string;
  /** Unidad de gramática dominante de la semana (id de GRAM). */
  unit: string;
  /** Mazo dominante de la semana (id de DECKS). */
  deck: string;
  /** Qué se consigue esta semana, en una línea. */
  goal: string;
  /** Exactamente cinco días. */
  days: DaySpec[];
}

/** A dónde lleva el botón de un paso. */
export interface StepGoto {
  module: string;
  task?: string;
  unit?: string;
  deck?: string;
  set?: string;
  part?: string;
  text?: number;
  /** Índice del audio de escucha de la ruta. */
  listen?: number;
  label?: string;
}

export interface DayBlock {
  min: string;
  name: string;
  what: string;
  /** Lo que se resuelve dentro del propio paso. */
  inline?: "leccion" | "vocab" | "uoe";
  /** Botón que lleva exactamente al sitio, no solo al módulo. */
  goto?: StepGoto;
}

/** Un día ya expandido, listo para pintar. */
export interface Day {
  n: number;
  week: number;
  block: string;
  t: string;
  focus: DayFocus;
  goal: string;
  unit: string;
  deck: string;
  /** Índice de la primera tarjeta del día dentro del mazo, y cuántas. */
  deckFrom: number;
  deckCount: number;
  uoe?: "trans" | "cloze" | "wform";
  task: string;
  blocks: DayBlock[];
}

/* ─────────────── Rutas ─────────────── */

export type TrackId = "a2b1" | "b1b2";

export interface Track {
  id: TrackId;
  /** "A2 → B1" */
  name: string;
  /** Una línea: para quién es. */
  who: string;
  /** Examen al que apunta. */
  exam: string;
  diag: DiagItem[];
  grammar: GrammarUnit[];
  decks: Deck[];
  trans: Transformation[];
  clozes: Cloze[];
  wform: WordForm[];
  rubric: RubricCriterion[];
  writing: WritingTask[];
  speaking: SpeakingPart[];
  /** Se llena al cargar el bundle de lecturas; empieza vacío. */
  readings: ReadingText[];
  /** Cuántas lecturas tiene la ruta. Se sabe sin descargarlas. */
  readingCount: number;
  /** Audios de escucha: guiones que lee la voz del navegador, con sus preguntas. */
  listening: ListeningTrack[];
  strategies: Strategy[];
  /** Varios simulacros: uno solo deja de medir en cuanto lo repites. */
  mocks: MockPaper[];
  resources: ResourceGroup[];
  weeks: WeekSpec[];
}


/* ─────────────── Retos y logros ─────────────── */

export type Metric = "cards" | "drills" | "uoe" | "words" | "minutes";

export interface Challenge {
  id: string;
  t: string;
  /** Qué hay que hacer, en una línea. */
  d: string;
  metric: Metric;
  goal: number;
  /** A dónde se va a cumplirlo. */
  goto?: StepGoto;
}

export interface Achievement {
  id: string;
  t: string;
  d: string;
  /** Emoji o símbolo corto para la insignia. */
  icon: string;
}

/* ─────────────── refuerzo ─────────────── */

/**
 * Una palabra del cuaderno personal. A diferencia de una tarjeta de mazo, esta
 * se escribe: hay que producirla, no reconocerla. Fallarla la manda a la caja 1
 * y vuelve el mismo día.
 */
export interface MyWord {
  id: string;
  /** La palabra o expresión en inglés. */
  en: string;
  /** Qué significa, en español. */
  es: string;
  /** Frase de ejemplo con la palabra; el hueco se genera a partir de ella. */
  ex: string;
  /** Caja Leitner, 1 a 5. */
  box: number;
  /** Cuándo vuelve a tocar, en milisegundos. */
  due: number;
  /** Veces que se ha fallado en total. Marca las que se atragantan. */
  fails: number;
  seen: number;
  added: number;
  /** De dónde vino: un mazo, un ejercicio, o a mano. */
  from?: string;
  /** Vuelve hoy mismo aunque la caja diga otra cosa (se acaba de fallar). */
  again?: boolean;
}

/** Un texto de lectura generado con IA y guardado para releerlo cuando sea. */
export interface GenText {
  id: string;
  made: number;
  level: string;
  topic: string;
  text: ReadingText;
}

/** Resultado de una prueba rápida. */
export interface QuizRun {
  at: number;
  right: number;
  total: number;
  secs: number;
  areas: string[];
}
