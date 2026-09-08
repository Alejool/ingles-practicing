/** Progreso, dominio por destreza y repetición espaciada (Leitner). */

import { S, P, save, touchDay, streakLen } from "./state";
import { pct } from "./dom";
import { T, days } from "./track";

export { streakLen };

/** El panel se vuelve a pintar cuando cambian las estadísticas. */
let onStatsChange: () => void = () => {};
export function setStatsListener(fn: () => void): void { onStatsChange = fn; }

export function bump(area: string, ok: boolean): void {
  const s = P().stats[area] || (P().stats[area] = { ok: 0, n: 0 });
  s.n++;
  if (ok) s.ok++;
  touchDay();
  // Los retos del día se cumplen solos: cada respuesta corregida suma aquí.
  if (area === "gram") tally("drills");
  else if (area === "uoe" || area === "read") tally("uoe");
  else if (area === "vocab" && ok) tally("cards");
  else if (area === "mine" && ok) tally("cards");
  marcarActividad();
  save();
  onStatsChange();
}

export const SKILLS: Array<[string, string]> = [
  ["gram", "Gramática"], ["vocab", "Vocabulario"], ["mine", "Mis palabras"],
  ["uoe", "Use of English"], ["read", "Reading"], ["diag", "Diagnóstico"], ["mock", "Simulacro"],
];

export function mastery(k: string): number | null {
  const s = P().stats[k];
  if (!s || !s.n) return null;
  return pct(s.ok, s.n);
}

/* ─────────────── plan diario ─────────────── */

export function isDayDone(n: number): boolean {
  return !!P().days[String(n)];
}

export function setDayDone(n: number, done: boolean): void {
  if (done) P().days[String(n)] = true;
  else delete P().days[String(n)];
  save();
  onStatsChange();
}

export function daysDone(): { d: number; t: number } {
  const all = days();
  let d = 0;
  all.forEach(x => { if (isDayDone(x.n)) d++; });
  return { d, t: all.length };
}

/** El día en el que estás: el primero sin hacer, o el último si ya están todos. */
export function currentDay(): number {
  const all = days();
  const next = all.find(x => !isDayDone(x.n));
  return next ? next.n : all.length;
}

/** El día que se está mirando ahora mismo en el módulo del plan. */
export function openDay(): number {
  const n = P().current || currentDay();
  return Math.min(days().length, Math.max(1, n));
}

export function setOpenDay(n: number): void {
  P().current = Math.min(days().length, Math.max(1, n));
  save();
}

export function weekProgress(w: number): { d: number; t: number; pct: number } {
  const list = days().filter(x => x.week === w);
  const d = list.filter(x => isDayDone(x.n)).length;
  return { d, t: list.length, pct: pct(d, list.length) };
}

/* ─────────────── vocabulario ─────────────── */

export const BOX_DAYS = [0, 0, 1, 3, 7, 21];

export function srsCounts(): { c: number[]; total: number; due: number } {
  const c = [0, 0, 0, 0, 0, 0];
  let total = 0;
  let due = 0;
  const now = Date.now();
  T().decks.forEach(dk => dk.cards.forEach((_card, i) => {
    total++;
    const r = P().srs[dk.id + ":" + i];
    const box = r ? r.b : 1;
    c[box] = (c[box] || 0) + 1;
    if (!r || r.due <= now) due++;
  }));
  return { c, total, due };
}

export function gradeCard(deck: string, i: number, ok: boolean): void {
  const k = deck + ":" + i;
  const r = P().srs[k] || { b: 1, due: 0 };
  r.b = ok ? Math.min(5, r.b + 1) : 1;
  r.due = Date.now() + BOX_DAYS[r.b] * 86400000;
  r.seen = (r.seen || 0) + 1;
  P().srs[k] = r;
  bump("vocab", ok);
}

/** Índices de las tarjetas de un mazo que tocan hoy. */
export function dueCards(id: string): number[] {
  const deck = T().decks.find(d => d.id === id);
  if (!deck) return [];
  const now = Date.now();
  const out: number[] = [];
  deck.cards.forEach((_c, i) => {
    const r = P().srs[id + ":" + i];
    if (!r || r.due <= now) out.push(i);
  });
  return out;
}

/* ─────────────── nivel ─────────────── */

export function levelLabelData(): { v: string; l: string; s: string } {
  const d = P().diag;
  if (!d.done || !d.score) return { v: "—", l: "Nivel estimado", s: "Haz el diagnóstico" };
  const p = d.score.pct;
  const escala = S.track === "a2b1"
    ? [[40, "A1+"], [55, "A2.1"], [70, "A2.2"], [82, "B1.1"], [101, "B1.2"]]
    : [[40, "A2+"], [55, "B1.1"], [70, "B1.2"], [82, "B2.1"], [101, "B2.2"]];
  const lev = (escala.find(([lim]) => p < (lim as number)) || escala[escala.length - 1])[1] as string;
  return { v: lev, l: "Nivel estimado", s: `${d.score.right}/${T().diag.length} en el diagnóstico` };
}

/* ─────────────── contadores del día ─────────────── */

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function bucket(): Record<string, number> {
  const d = hoyISO();
  const c = P().counters || (P().counters = {});
  if (!c[d]) c[d] = {};
  // Solo se guardan los últimos 60 días: esto no es un histórico, es un contador.
  const claves = Object.keys(c).sort();
  if (claves.length > 60) claves.slice(0, claves.length - 60).forEach(k => delete c[k]);
  return c[d];
}

/** Suma al contador de hoy. */
export function tally(metric: string, n = 1): void {
  const b = bucket();
  b[metric] = (b[metric] || 0) + n;
  save();
}

/** Deja el contador de hoy en el máximo entre lo que había y `v`. */
export function tallyMax(metric: string, v: number): void {
  const b = bucket();
  if (v > (b[metric] || 0)) { b[metric] = v; save(); }
}

export function counterToday(metric: string): number {
  return (P().counters?.[hoyISO()] || {})[metric] || 0;
}

/** Minutos de estudio: se suma uno por cada minuto con actividad real. */
let ultimaActividad = 0;
export function marcarActividad(): void {
  ultimaActividad = Date.now();
}
export function tickMinuto(): void {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - ultimaActividad > 90_000) return;
  tally("minutes", 1);
  onStatsChange();
}

/* ─────────────── pasos del día ─────────────── */

export function stepsOf(n: number): boolean[] {
  const s = P().steps || (P().steps = {});
  return s[String(n)] || [];
}

export function setStep(n: number, i: number, done: boolean): void {
  const s = P().steps || (P().steps = {});
  const arr = (s[String(n)] || []).slice();
  arr[i] = done;
  s[String(n)] = arr;
  save();
  onStatsChange();
}

export function stepsDone(n: number, total: number): number {
  const arr = stepsOf(n);
  let d = 0;
  for (let i = 0; i < total; i++) if (arr[i]) d++;
  return d;
}

/* ─────────────── retos ─────────────── */

export interface ChallengeState { done: boolean; have: number; goal: number }

export function challengeState(c: { metric: string; goal: number }): ChallengeState {
  const have = counterToday(c.metric);
  return { done: have >= c.goal, have, goal: c.goal };
}

/* ─────────────── logros ─────────────── */

function unidadesLimpias(): number {
  let n = 0;
  T().grammar.forEach(u => {
    const rec = P().gram[u.id];
    if (!rec) return;
    const todas = u.dr.every((_d, i) => rec[i] === true);
    if (todas) n++;
  });
  return n;
}

function tarjetasEnCaja5(): number {
  return Object.values(P().srs).filter(r => r.b >= 5).length;
}

function aciertosVocab(): number {
  return P().stats.vocab?.ok || 0;
}

function itemsUoe(): number {
  return Object.keys(P().uoe).length;
}

/** Ids de los logros conseguidos ahora mismo. */
export function earned(): string[] {
  const out: string[] = [];
  const dias = daysDone().d;
  const racha = streakLen();
  const mejor = P().mock.best;
  const total = T().mock ? 32 : 32;

  if (dias >= 1) out.push("a-start");
  if (dias >= 5) out.push("a-week");
  if (dias >= 20) out.push("a-month");
  if (dias >= 60) out.push("a-half");
  if (dias >= 120) out.push("a-all");

  if (racha >= 3) out.push("s-3");
  if (racha >= 7) out.push("s-7");
  if (racha >= 30) out.push("s-30");

  if (aciertosVocab() >= 100) out.push("v-100");
  if (aciertosVocab() >= 500) out.push("v-500");
  if (tarjetasEnCaja5() >= 20) out.push("v-box5");

  if (unidadesLimpias() >= 1) out.push("g-unit");
  if (unidadesLimpias() >= 5) out.push("g-five");

  if (itemsUoe() >= 50) out.push("u-50");

  if (P().mock.history.length >= 1) out.push("m-first");
  if (mejor !== null && mejor / total >= 0.6) out.push("m-60");
  if (mejor !== null && mejor / total >= 0.8) out.push("m-80");

  if (counterToday("corrections") > 0 || (P().stats.writing?.n || 0) > 0) out.push("w-ai");
  if (S.errors.length >= 10) out.push("e-10");
  if (S.tracks.a2b1?.diag.done && S.tracks.b1b2?.diag.done) out.push("d-both");

  const mias = P().mine || [];
  if (mias.length >= 10) out.push("n-10");
  if (mias.filter(w => w.box >= 5).length >= 10) out.push("n-box5");

  const pruebas = P().quiz?.history || [];
  if (pruebas.length >= 1) out.push("q-first");
  if ((P().quiz?.best ?? 0) >= 90) out.push("q-90");

  const leidos = Object.values(P().read || {}).filter(n => n > 0).length;
  if (leidos >= 10) out.push("r-10");
  if ((P().gen || []).length >= 1) out.push("r-gen");
  if ((P().stats.speaking?.n || 0) > 0 || counterToday("speaking") > 0) out.push("sp-ai");

  return out;
}

/** Logros nuevos desde la última vez que se miraron. */
export function freshAchievements(): string[] {
  const now = earned();
  const seen = new Set(S.seen || []);
  return now.filter(id => !seen.has(id));
}

export function markAchievementsSeen(): void {
  S.seen = earned();
  save();
}

/* ─────────────── línea diaria de estudio ─────────────── */

export interface StreakCell { iso: string; on: boolean; today: boolean; label: string }

const DIA_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Los últimos `n` días, del más antiguo al de hoy, para pintar la tira de la racha. */
export function streakStrip(n = 35): StreakCell[] {
  const set = new Set(S.streak.days);
  const hoy = hoyISO();
  const out: StreakCell[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const iso = d.toISOString().slice(0, 10);
    out.push({
      iso,
      on: set.has(iso),
      today: iso === hoy,
      label: DIA_CORTO[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1) + (set.has(iso) ? " · estudiado" : ""),
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Días estudiados dentro de la tira, para el subtítulo. */
export function streakBest(): number {
  const dias = [...new Set(S.streak.days)].sort();
  let mejor = 0;
  let run = 0;
  let prev: number | null = null;
  dias.forEach(iso => {
    const t = Date.parse(iso + "T00:00:00Z") / 86400000;
    run = prev !== null && t - prev === 1 ? run + 1 : 1;
    prev = t;
    if (run > mejor) mejor = run;
  });
  return mejor;
}

/** Lo que llevas hecho hoy, para la tarjeta de resumen del panel. */
export function resumenHoy(): Array<[string, number]> {
  return [
    ["tarjetas", counterToday("cards")],
    ["drills", counterToday("drills")],
    ["use of english", counterToday("uoe")],
    ["mis palabras", counterToday("mine")],
    ["lecturas", counterToday("lecturas")],
    ["palabras", counterToday("words")],
    ["minutos", counterToday("minutes")],
  ];
}
