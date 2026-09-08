/**
 * Los prompts viven aquí, y aquí solo.
 *
 * Los usa el servidor (la función que habla con DeepSeek) y también el cliente
 * cuando alguien pone su propia clave. El cliente NUNCA manda instrucciones:
 * manda un `kind` y unos datos acotados, y quien compone los mensajes es este
 * módulo. Así nadie puede usar el endpoint compartido como un chatbot libre.
 */

export type AiKind = "writing" | "speaking" | "tutor" | "error" | "reading" | "test";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface WritingPayload {
  task: string;
  level: string;
  words: string;
  brief: string;
  answer: string;
}

export interface SpeakingPayload {
  part: string;
  level: string;
  transcript: string;
}

export interface ErrorPayload {
  category: string;
  text: string;
}

export interface ReadingPayload {
  /** "B1" o "B2": marca la dificultad del inglés. */
  level: string;
  /** Tema pedido. Puede ir vacío: entonces lo elige el modelo. */
  topic: string;
  /** Temas ya usados, para que no repita. */
  avoid?: string[];
}

export type TutorMode = "general" | "interview" | "exam" | "explain";

export interface TutorPayload {
  mode: TutorMode;
  turns: Array<{ role: "user" | "assistant"; content: string }>;
}

export type AiPayload = WritingPayload | SpeakingPayload | ErrorPayload | TutorPayload | ReadingPayload | Record<string, never>;

/** Topes de entrada. El servidor los aplica; el cliente los usa para avisar antes de enviar. */
export const LIMITS = {
  writingAnswer: 6000,
  speakingTranscript: 6000,
  errorText: 1200,
  tutorMessage: 2000,
  tutorTurns: 12,
  field: 200,
  readingTopic: 120,
  readingAvoid: 24,
} as const;

const BASE =
  "You are an experienced Cambridge and IELTS examiner and English teacher. " +
  "The learner is a Spanish-speaking adult working towards a B1/B2 certification. " +
  "Explanations go in Spanish; the English itself stays in English. " +
  "Be concise and concrete, never invent praise, and never write above the level of a strong B2 candidate: " +
  "the goal is a realistic target, not a native-speaker text. " +
  "You only help with English learning: if the request is about anything else, say so in one sentence and stop.";

const THREE_SECTIONS =
  "Structure every correction like this:\n" +
  "1. CORRECCIONES — each error: what they wrote → correct version → one-line reason in Spanish. If there are none, say so.\n" +
  "2. VERSIÓN B2 — rewrite their text at a solid B2 level, keeping their meaning and voice.\n" +
  "3. QUÉ PRACTICAR — the one grammar point or lexical area behind their most frequent error.";

const TUTOR_MODES: Record<TutorMode, string> = {
  general:
    "MODE: free conversation. Reply naturally to what they said in 2-3 English sentences, ask one follow-up question, " +
    "then give the three-section feedback.",
  interview:
    "MODE: you are running a job interview in English for a software developer role. Ask ONE question at a time, " +
    "react naturally to the answer, then give the three-section feedback and keep the interview going.",
  exam:
    "MODE: you are a Cambridge B2 First speaking examiner. Ask ONE exam question at a time (parts 1, 3 and 4). " +
    "After each answer give a 0-5 band for Grammatical Resource, Lexical Resource and Discourse Management, " +
    "then the three-section feedback, then the next question.",
  explain:
    "MODE: the learner asks grammar or vocabulary questions, usually in Spanish. Answer in Spanish with a clear rule, " +
    "three English examples, an explicit contrast with how Spanish does it, and one short exercise. " +
    "Skip the three-section structure for these answers.",
};

function clip(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max).trim();
}

export class PayloadError extends Error {}

function need(value: string, field: string): string {
  if (!value) throw new PayloadError(`Falta ${field}.`);
  return value;
}

/** Convierte (kind, payload) en los mensajes que se mandan al modelo. */
export function buildMessages(kind: AiKind, payload: any): ChatMessage[] {
  switch (kind) {
    case "test":
      return [
        { role: "system", content: "Reply with exactly: OK" },
        { role: "user", content: "ping" },
      ];

    case "writing": {
      const p = payload as WritingPayload;
      const answer = need(clip(p.answer, LIMITS.writingAnswer), "el texto");
      return [
        {
          role: "system",
          content:
            `${BASE}\n\n${THREE_SECTIONS}\n\n` +
            "Before those three sections, add a section 0 titled NOTA POR CRITERIO with the four Cambridge writing " +
            "criteria (Content, Communicative Achievement, Organisation, Language), each scored 0-5 with one line of " +
            "justification in Spanish, and check the word count against what the task requires.",
        },
        {
          role: "user",
          content:
            `EXAM TASK: ${clip(p.task, LIMITS.field)} · target ${clip(p.level, LIMITS.field)} · ` +
            `${clip(p.words, LIMITS.field)} words\n\n` +
            `BRIEF:\n${clip(p.brief, 2000)}\n\nLEARNER'S ANSWER:\n${answer}`,
        },
      ];
    }

    case "speaking": {
      const p = payload as SpeakingPayload;
      const transcript = need(clip(p.transcript, LIMITS.speakingTranscript), "la transcripción");
      return [
        {
          role: "system",
          content:
            `${BASE}\n\n` +
            "You are marking a Cambridge B2 First speaking answer from a transcription. Evaluate in Spanish with the " +
            "four official criteria (Grammatical Resource, Lexical Resource, Discourse Management, Interactive " +
            "Communication; add Pronunciation only if the transcription shows evidence), a 0-5 band each with one " +
            "line of justification. Then: (1) list the errors with corrections and a one-line reason each; " +
            "(2) rewrite three of their sentences the way a strong B2 candidate would say them; " +
            "(3) name the single change that would raise their band fastest.",
        },
        {
          role: "user",
          content: `PART: ${clip(p.part, LIMITS.field)} (${clip(p.level, LIMITS.field)})\n\nTRANSCRIPTION:\n${transcript}`,
        },
      ];
    }

    case "error": {
      const p = payload as ErrorPayload;
      const text = need(clip(p.text, LIMITS.errorText), "la frase");
      return [
        {
          role: "system",
          content:
            `${BASE}\n\n${THREE_SECTIONS}\n\n` +
            "If the input is a sentence, correct it. If it is a question about English, answer it. " +
            "Then give two more correct examples with the same structure and one short exercise to try.",
        },
        { role: "user", content: `CATEGORY: ${clip(p.category, LIMITS.field)}\n\n${text}` },
      ];
    }

    case "reading": {
      const p = payload as ReadingPayload;
      const level = clip(p.level, 8).toUpperCase() === "B1" ? "B1" : "B2";
      const topic = clip(p.topic, LIMITS.readingTopic);
      const avoid = (Array.isArray(p.avoid) ? p.avoid : [])
        .slice(0, LIMITS.readingAvoid)
        .map(t => clip(t, LIMITS.field))
        .filter(Boolean);
      const largo = level === "B1" ? "60 to 85" : "95 to 125";
      return [
        {
          role: "system",
          content:
            `${BASE}\n\n` +
            "You write Cambridge-style reading practice. Output ONE JSON object and nothing else: no markdown, no " +
            "code fence, no commentary before or after.\n\n" +
            "SHAPE:\n" +
            '{"title":"...","topic":"...","body":["p1","p2","p3","p4"],' +
            '"qs":[{"q":"...","o":["a","b","c","d"],"a":0,"e":"..."}]}\n\n' +
            `RULES:\n` +
            `- Exactly 4 paragraphs of ${largo} words each, in ${level} English. Informative non-fiction about the ` +
            "real world, the register of a good newspaper feature. Never fiction, never a dialogue, never a list.\n" +
            "- Do not invent precise statistics. If you give a number, keep it round and hedge it (roughly, around).\n" +
            "- Exactly 5 questions, 4 options each, mixing: main idea or the writer's purpose, a detail whose wrong " +
            "options also appear in the text, cause and effect, vocabulary in context, and inference.\n" +
            '- "a" is the 0-based index of the correct option. Spread the correct answers across the four positions.\n' +
            '- "e" is written IN SPANISH: say where the clue is in the text, why the correct option paraphrases it, ' +
            "and what the most tempting wrong option gets wrong. Three or four lines. You may use <b> and <i>.\n" +
            '- "title" is in English; "topic" is three or four words in Spanish naming the subject.\n' +
            "- Plain double-quoted JSON strings: escape any quote inside, and no line breaks inside a string.",
        },
        {
          role: "user",
          content:
            `LEVEL: ${level}\n` +
            (topic ? `TOPIC: ${topic}\n` : "TOPIC: choose an interesting one yourself.\n") +
            (avoid.length ? `ALREADY USED, PICK SOMETHING ELSE: ${avoid.join("; ")}\n` : "") +
            "Return only the JSON object.",
        },
      ];
    }

    case "tutor": {
      const p = payload as TutorPayload;
      const mode = (TUTOR_MODES[p.mode] ? p.mode : "general") as TutorMode;
      const turns = Array.isArray(p.turns) ? p.turns.slice(-LIMITS.tutorTurns) : [];
      const clean: ChatMessage[] = [];
      for (const t of turns) {
        const role = t?.role === "assistant" ? "assistant" : "user";
        const content = clip(t?.content, LIMITS.tutorMessage);
        if (content) clean.push({ role, content });
      }
      while (clean.length && clean[0].role !== "user") clean.shift();
      if (!clean.length || clean[clean.length - 1].role !== "user") {
        throw new PayloadError("La conversación tiene que terminar en un mensaje tuyo.");
      }
      return [{ role: "system", content: `${BASE}\n\n${THREE_SECTIONS}\n\n${TUTOR_MODES[mode]}` }, ...clean];
    }

    default:
      throw new PayloadError("Tipo de petición no reconocido.");
  }
}

export const KINDS: AiKind[] = ["writing", "speaking", "tutor", "error", "reading", "test"];

export function isKind(v: unknown): v is AiKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}
