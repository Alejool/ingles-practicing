/**
 * Estado persistente de la app.
 *
 * Todo el progreso vive en localStorage bajo una única clave. `S` es un binding
 * vivo: los módulos que lo importan ven las reasignaciones de `resetState` y
 * `replaceState` sin necesidad de recargar.
 */

import type { GenText, MyWord, QuizRun } from "../data/types";

export const KEY = "ruta-b1b2-v1";

export interface DiagState { answers: Record<string, number>; done: boolean; score: { right: number; pct: number } | null }
export interface SrsCard { b: number; due: number; seen?: number }
export interface MockRun { d: string; s: number; cs: number }
export interface ErrorNote { id: number; text: string; cat: string; d: string; fix?: string }
export interface AiConfig { url?: string; key?: string; model?: string; temp?: number }

export type TrackId = "a2b1" | "b1b2";

/** Progreso de UNA ruta. Cada ruta lleva el suyo: cambiar de ruta no mezcla nada. */
export interface TrackProgress {
  /** Días del plan marcados como hechos, por número de día. */
  days: Record<string, boolean>;
  /** Último día abierto, para volver donde lo dejaste. */
  current: number;
  diag: DiagState;
  srs: Record<string, SrsCard>;
  gram: Record<string, Record<string, any>>;
  uoe: Record<string, any>;
  mock: { best: number | null; history: MockRun[] };
  writing: Record<string, { text: string; chk: Record<number, boolean> }>;
  stats: Record<string, { ok: number; n: number }>;
  /** Pasos marcados de cada día: steps["37"] = [true,false,…] */
  steps: Record<string, boolean[]>;
  /** Contadores por día: counters["2026-09-04"] = { cards: 12, drills: 4 … } */
  counters: Record<string, Record<string, number>>;
  /** Cuaderno de palabras difíciles: se escriben, no se reconocen. */
  mine: MyWord[];
  /** Lecturas generadas con IA, guardadas para releerlas cuando quieras. */
  gen: GenText[];
  /** Lecturas terminadas: read["b3"] = veces que la has hecho. */
  read: Record<string, number>;
  /** Pruebas rápidas. */
  quiz: { best: number | null; history: QuizRun[] };
}

export function blankTrack(): TrackProgress {
  return {
    days: {}, current: 1, diag: { answers: {}, done: false, score: null },
    srs: {}, gram: {}, uoe: {}, mock: { best: null, history: [] }, writing: {}, stats: {},
    steps: {}, counters: {},
    mine: [], gen: [], read: {}, quiz: { best: null, history: [] },
  };
}

export interface AppState {
  /** Ruta activa. */
  track: TrackId;
  tracks: Record<TrackId, TrackProgress>;
  /* Lo de abajo es común a las dos rutas. */
  errors: ErrorNote[];
  /** Logros ya vistos, para poder marcar los nuevos. */
  seen: string[];
  streak: { days: string[]; last: string | null };
  examDate: string | null;
  theme: "light" | "dark" | null;
  ai: AiConfig;
  /** Ya pasó por la pantalla de bienvenida: no volver a enseñarla. */
  onboarded?: boolean;
}

export const DEF: AppState = {
  track: "b1b2",
  tracks: { a2b1: blankTrack(), b1b2: blankTrack() },
  errors: [], seen: [], streak: { days: [], last: null }, examDate: null, theme: null, ai: {},
  onboarded: false,
};

/** El progreso de la ruta activa. Las vistas usan esto en vez de S. */
export function P(): TrackProgress {
  if (!S.tracks) S.tracks = { a2b1: blankTrack(), b1b2: blankTrack() };
  if (!S.tracks[S.track]) S.tracks[S.track] = blankTrack();
  return S.tracks[S.track];
}

/**
 * Migra el formato viejo (todo el progreso suelto en la raíz, una sola ruta)
 * al nuevo por rutas. Se ejecuta al cargar y no pierde nada.
 */
function migrate(raw: any): AppState {
  const out: AppState = Object.assign(structuredClone(DEF), {});
  out.errors = raw.errors ?? [];
  out.seen = raw.seen ?? [];
  out.streak = raw.streak ?? { days: [], last: null };
  out.examDate = raw.examDate ?? null;
  out.theme = raw.theme ?? null;
  out.ai = raw.ai ?? {};
  out.track = raw.track ?? "b1b2";
  // Quien ya venía usando la app no tiene que pasar por la bienvenida.
  out.onboarded = raw.onboarded ?? !!(raw.tasks || raw.diag?.done || raw.tracks);

  if (raw.tracks) {
    out.tracks = {
      a2b1: Object.assign(blankTrack(), raw.tracks.a2b1 || {}),
      b1b2: Object.assign(blankTrack(), raw.tracks.b1b2 || {}),
    };
    return out;
  }

  // Formato viejo: todo lo que había era de la ruta B1 → B2.
  const old = Object.assign(blankTrack(), {
    diag: raw.diag ?? blankTrack().diag,
    srs: raw.srs ?? {},
    gram: raw.gram ?? {},
    uoe: raw.uoe ?? {},
    mock: raw.mock ?? { best: null, history: [] },
    writing: raw.writing ?? {},
    stats: raw.stats ?? {},
  });
  // Las tareas semanales viejas ("12-3") no tienen equivalente en el plan diario:
  // se convierten en días hechos, cinco tareas por semana.
  if (raw.tasks) {
    const hechas = new Set<number>();
    for (const [k, v] of Object.entries(raw.tasks)) {
      if (!v) continue;
      const [w, i] = k.split("-").map(Number);
      if (Number.isFinite(w) && Number.isFinite(i)) hechas.add((w - 1) * 5 + Math.min(i, 4) + 1);
    }
    hechas.forEach(n => { old.days[String(n)] = true; });
    old.current = Math.min(120, Math.max(1, hechas.size ? Math.max(...hechas) + 1 : 1));
  }
  out.tracks.b1b2 = old;
  return out;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEF);
    return migrate(JSON.parse(raw));
  } catch (e) {
    return structuredClone(DEF);
  }
}

export let S: AppState = load();

let saveT: ReturnType<typeof setTimeout> | null = null;

/** La sincronización se engancha aquí para saber que hay algo que subir. */
let onSaved: () => void = () => {};
export function setSaveListener(fn: () => void): void { onSaved = fn; }

/** Escritura diferida: muchas interacciones seguidas hacen una sola escritura. */
export function save(): void {
  if (saveT) clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* cuota llena o modo privado */ }
    try { onSaved(); } catch (e) { /* la sincronización nunca rompe el guardado local */ }
  }, 120);
}

export function resetState(): void {
  try { localStorage.removeItem(KEY); } catch (e) { /* nada que borrar */ }
  S = structuredClone(DEF);
}

export function replaceState(data: Partial<AppState>): void {
  S = migrate(data as any);
  save();
}

/** Marca el día de hoy como día de estudio. */
export function touchDay(): void {
  const d = new Date().toISOString().slice(0, 10);
  if (S.streak.last === d) return;
  S.streak.last = d;
  S.streak.days.push(d);
  if (S.streak.days.length > 400) S.streak.days = S.streak.days.slice(-400);
  save();
}

/** Racha de días consecutivos, tolerando que hoy aún no se haya estudiado. */
export function streakLen(): number {
  const set = new Set(S.streak.days);
  let n = 0;
  const d = new Date();
  for (;;) {
    const k = d.toISOString().slice(0, 10);
    if (set.has(k)) { n++; d.setDate(d.getDate() - 1); continue; }
    if (n === 0) {
      d.setDate(d.getDate() - 1);
      if (set.has(d.toISOString().slice(0, 10))) { n++; continue; }
    }
    break;
  }
  return n;
}
