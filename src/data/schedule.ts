/**
 * Expande las 24 semanas en 120 días concretos.
 *
 * El reparto de los 45 minutos no se escribe día a día: sale del `focus`.
 * Así el plan se mantiene coherente y añadir contenido es tocar solo las semanas.
 */

import type { Day, DayBlock, DayFocus, Deck, StepGoto, WeekSpec } from "./types";

const PLANTILLA: Record<DayFocus, (ctx: Ctx) => DayBlock[]> = {
  leccion: c => [
    b("0–8", "Vocabulario", `${c.cards} tarjetas nuevas del mazo ${c.deckName}, en voz alta.`, { inline: "vocab" }),
    b("8–25", "Gramática", `Unidad ${c.unitN}: lee la regla y la trampa, y haz los cuatro drills de hoy hasta acertarlos todos.`, { inline: "leccion" }),
    b("25–36", "Use of English", "Cuatro ítems del bloque de hoy. Si fallas dos seguidos, vuelve a la regla.", { inline: "uoe" }),
    b("36–45", "Producción", c.task, { goto: c.taskGoto }),
  ],
  drills: c => [
    b("0–8", "Vocabulario", `${c.cards} tarjetas, incluidas las que fallaste ayer.`, { inline: "vocab" }),
    b("8–20", "Gramática", `Seis drills nuevos de la unidad ${c.unitN}, sin mirar la regla.`, { inline: "leccion" }),
    b("20–34", "Use of English", "Seis ítems. Aquí es donde se gana velocidad.", { inline: "uoe" }),
    b("34–45", "Producción", c.task, { goto: c.taskGoto }),
  ],
  lectura: c => [
    b("0–8", "Vocabulario", `${c.cards} tarjetas del mazo ${c.deckName}.`, { inline: "vocab" }),
    b("8–28", "Lectura", "Lee las preguntas, haz un barrido de 90 segundos y responde justificando cada opción con una línea del texto.",
      { goto: { module: "input", text: c.readIdx, label: "Abrir el texto de hoy" } }),
    b("28–36", "Gramática", `Repaso rápido de la unidad ${c.unitN}: la trampa y dos drills.`, { inline: "leccion" }),
    b("36–45", "Producción", c.task, { goto: c.taskGoto }),
  ],
  escucha: c => [
    b("0–8", "Vocabulario", `${c.cards} tarjetas del mazo ${c.deckName}.`, { inline: "vocab" }),
    b("8–30", "Escucha", "Tres pases: sin texto, con las preguntas, y con el transcript marcando lo que tu oído no reconoció.",
      { goto: c.listenIdx === null ? { module: "input", label: "Ver el protocolo" } : { module: "input", listen: c.listenIdx, label: "Abrir el audio de hoy" } }),
    b("30–38", "Use of English", "Cuatro ítems, para no perder el ritmo.", { inline: "uoe" }),
    b("38–45", "Shadowing", "Cinco minutos repitiendo medio segundo por detrás del audio."),
  ],
  writing: c => [
    b("0–5", "Vocabulario", `${c.cards} tarjetas, rápido.`, { inline: "vocab" }),
    b("5–12", "Preparación", "Lee el enunciado, haz el plan de cinco puntos y elige tres frases del banco.", { goto: c.taskGoto }),
    b("12–35", "Escribir", "Dentro del contador de palabras, sin diccionario y sin parar a corregir.", { goto: c.taskGoto }),
    b("35–45", "Corregir", "Pasa la lista de control, pide la corrección y reescribe las dos frases peores.", { goto: c.taskGoto }),
  ],
  speaking: c => [
    b("0–5", "Vocabulario", `${c.cards} tarjetas, rápido.`, { inline: "vocab" }),
    b("5–15", "Preparación", "Lee el lenguaje funcional de la parte de hoy y prepara dos opiniones.", { goto: c.taskGoto }),
    b("15–30", "Hablar", "Con cronómetro y en voz alta. Grábate; no pares aunque te trabes.", { goto: c.taskGoto }),
    b("30–45", "Evaluar", "Transcribe lo que dijiste, pide la evaluación y anota los tres errores que más se repiten.", { goto: c.taskGoto }),
  ],
  repaso: c => [
    b("0–12", "Vocabulario", "Vacía la caja 1: todas las tarjetas que llevas fallando.", { goto: { module: "vocab", deck: c.deckId, label: "Ir al mazo" } }),
    b("12–25", "Gramática", "Las unidades que el radar del panel tenga por debajo del 70%.", { goto: { module: "gram", label: "Abrir gramática" } }),
    b("25–38", "Use of English", "Ítems mezclados de los tres bloques.", { inline: "uoe" }),
    b("38–45", "Errores", "Relee el cuaderno y borra lo que ya no fallas.", { goto: { module: "errors", label: "Abrir el cuaderno" } }),
  ],
  simulacro: () => [
    b("0–40", "Simulacro", "Cronometrado y de una sentada. Sin diccionario ni pestañas abiertas.",
      { goto: { module: "mock", label: "Empezar el simulacro" } }),
    b("40–45", "Análisis", "Clasifica cada fallo: ¿nivel, formato, prisa o nervios? Trabaja solo la categoría mayor.",
      { goto: { module: "errors", label: "Anotar los fallos" } }),
  ],
};

interface Ctx { cards: number; deckName: string; deckId: string; unitN: string; readIdx: number; listenIdx: number | null; task: string; taskGoto?: StepGoto }

function b(min: string, name: string, what: string, extra: Partial<DayBlock> = {}): DayBlock {
  return { min, name, what, ...extra };
}

/** Tarjetas nuevas por día según el tipo de sesión. */
function cardsFor(focus: DayFocus): number {
  if (focus === "writing" || focus === "speaking") return 8;
  if (focus === "simulacro") return 0;
  if (focus === "repaso") return 0;
  return 12;
}

export interface BuildOpts {
  /** Ids de las tareas de writing, para que los días de writing lleven a una concreta. */
  writingIds?: string[];
  /** Ids de las partes del speaking. */
  speakingIds?: string[];
  /** Cuántos textos de lectura hay, para repartirlos entre los días de lectura. */
  readings?: number;
  /** Cuántos audios de escucha hay. */
  listening?: number;
}

export function buildDays(weeks: WeekSpec[], decks: Deck[], unitTitle: (id: string) => string, opts: BuildOpts = {}): Day[] {
  const days: Day[] = [];
  // Cada mazo avanza por su cuenta: así ningún mazo se repite antes de agotarse.
  const cursor: Record<string, number> = {};
  // Los días de writing y speaking van rotando por las tareas, sin repetir seguidas.
  let wIdx = 0;
  let sIdx = 0;
  // Los días de lectura se reparten por todo el banco de textos, no solo los
  // primeros: si hay 20 textos y 10 días, toca uno de cada dos, del primero al
  // último, y el curso llega a los textos más largos del final.
  const totalLecturas = weeks.reduce((n, w) => n + w.days.filter(d => d.focus === "lectura").length, 0);
  const textos = Math.max(1, opts.readings || 1);
  let rIdx = 0;
  // Los audios, igual: repartidos del primero al último.
  const totalEscuchas = weeks.reduce((n, w) => n + w.days.filter(d => d.focus === "escucha").length, 0);
  const audios = opts.listening || 0;
  let lIdx = 0;
  const siguienteAudio = (): number | null => {
    if (!audios) return null;
    const k = lIdx++;
    return totalEscuchas <= audios ? Math.floor(k * audios / totalEscuchas) : k % audios;
  };
  const siguienteTexto = () => {
    const k = rIdx++;
    return totalLecturas <= textos ? Math.floor(k * textos / totalLecturas) : k % textos;
  };

  weeks.forEach(week => {
    week.days.forEach(spec => {
      const n = days.length + 1;
      const deckId = spec.deck || week.deck;
      const deck = decks.find(d => d.id === deckId);
      const count = cardsFor(spec.focus);
      const from = deck && count ? (cursor[deckId] || 0) % deck.cards.length : 0;
      if (deck && count) cursor[deckId] = from + count;

      const unit = spec.unit || week.unit;
      let taskGoto = spec.goto;
      if (!taskGoto && spec.focus === "writing" && opts.writingIds?.length) {
        taskGoto = { module: "writing", task: opts.writingIds[wIdx++ % opts.writingIds.length], label: "Abrir la tarea de hoy" };
      }
      if (!taskGoto && spec.focus === "speaking" && opts.speakingIds?.length) {
        taskGoto = { module: "speak", part: opts.speakingIds[sIdx++ % opts.speakingIds.length], label: "Abrir la parte de hoy" };
      }
      if (!taskGoto && (spec.focus === "leccion" || spec.focus === "drills")) {
        taskGoto = { module: "errors", label: "Anotar lo que falles" };
      }

      const ctx: Ctx = {
        cards: count,
        deckName: deck ? `«${deck.name}»` : "de la semana",
        deckId,
        unitN: unitTitle(unit),
        readIdx: spec.focus === "lectura" ? siguienteTexto() : 0,
        listenIdx: spec.focus === "escucha" ? siguienteAudio() : null,
        task: spec.task,
        taskGoto,
      };

      days.push({
        n,
        week: week.w,
        block: week.block,
        t: spec.t,
        focus: spec.focus,
        goal: week.goal,
        unit,
        deck: deckId,
        deckFrom: from,
        deckCount: count,
        uoe: spec.uoe,
        task: spec.task,
        blocks: PLANTILLA[spec.focus](ctx),
      });
    });
  });

  return days;
}

export const FOCUS_LABEL: Record<DayFocus, string> = {
  leccion: "Lección nueva",
  drills: "Consolidar",
  lectura: "Lectura",
  escucha: "Escucha",
  writing: "Writing",
  speaking: "Speaking",
  repaso: "Repaso",
  simulacro: "Simulacro",
};
