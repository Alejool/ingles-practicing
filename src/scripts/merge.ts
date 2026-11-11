/**
 * Fusión del progreso de dos dispositivos (o de este navegador y la cuenta).
 *
 * Se movió aquí desde `sync.ts` sin cambiar la lógica para poder probarla sin
 * navegador (tests/merge.test.mts). La fusión nunca borra progreso: ante la
 * duda gana el estado más avanzado.
 */

import { blankTrack } from "./state.ts";
import type { AppState, TrackProgress } from "./state.ts";

/** Funde el progreso de UNA ruta quedándose con lo más avanzado de cada parte. */
export function mergeTrack(local: TrackProgress, remote: Partial<TrackProgress>): TrackProgress {
  const out: TrackProgress = structuredClone(local);

  for (const [k, v] of Object.entries(remote.days || {})) if (v) out.days[k] = true;
  out.current = Math.max(out.current || 1, remote.current || 1);

  if (remote.diag?.done) {
    const rp = remote.diag.score?.pct ?? -1;
    const lp = out.diag.done ? out.diag.score?.pct ?? -1 : -2;
    if (rp > lp) out.diag = structuredClone(remote.diag);
  }

  for (const [k, r] of Object.entries(remote.srs || {})) {
    const l = out.srs[k];
    out.srs[k] = !l ? r : ((r.b || 0) * 1e13 + (r.due || 0)) > ((l.b || 0) * 1e13 + (l.due || 0)) ? r : l;
  }

  for (const [unit, r] of Object.entries(remote.gram || {})) {
    const l = out.gram[unit] || {};
    out.gram[unit] = Object.keys(l).length >= Object.keys(r || {}).length ? l : r;
  }

  for (const [k, r] of Object.entries(remote.uoe || {})) {
    const l = out.uoe[k];
    if (!l || (!l.ok && (r as any)?.ok)) out.uoe[k] = r;
  }

  if (remote.mock) {
    out.mock.best = Math.max(out.mock.best ?? -1, remote.mock.best ?? -1);
    if (out.mock.best < 0) out.mock.best = null;
    out.mock.current = Math.max(out.mock.current ?? 0, remote.mock.current ?? 0);
    const seen = new Set(out.mock.history.map(h => h.d + ":" + h.s + ":" + h.cs + ":" + (h.m ?? 0)));
    for (const h of remote.mock.history || []) {
      const key = h.d + ":" + h.s + ":" + h.cs + ":" + (h.m ?? 0);
      if (!seen.has(key)) { seen.add(key); out.mock.history.push(h); }
    }
    out.mock.history.sort((a, b) => a.d.localeCompare(b.d));
  }

  for (const [k, r] of Object.entries(remote.writing || {})) {
    const l = out.writing[k];
    if (!l) { out.writing[k] = r; continue; }
    if ((r.text || "").length > (l.text || "").length) l.text = r.text;
    l.chk = { ...(r.chk || {}), ...(l.chk || {}) };
  }

  for (const [k, r] of Object.entries(remote.stats || {})) {
    const l = out.stats[k];
    out.stats[k] = l ? { ok: Math.max(l.ok, r.ok), n: Math.max(l.n, r.n) } : r;
  }

  /* Pasos del plan: un paso marcado en cualquier dispositivo queda marcado. */
  for (const [dia, r] of Object.entries(remote.steps || {})) {
    const l = out.steps[dia] || [];
    const n = Math.max(l.length, (r || []).length);
    const fusion: boolean[] = [];
    for (let i = 0; i < n; i++) fusion[i] = !!(l[i] || (r || [])[i]);
    out.steps[dia] = fusion;
  }

  /* Contadores del día: gana el mayor de cada métrica, nunca se restan. */
  for (const [dia, r] of Object.entries(remote.counters || {})) {
    const l = out.counters[dia] || (out.counters[dia] = {});
    for (const [m, v] of Object.entries(r || {})) l[m] = Math.max(l[m] || 0, v as number);
  }

  /* Lecturas terminadas. */
  for (const [k, v] of Object.entries(remote.read || {})) {
    out.read[k] = Math.max(out.read[k] || 0, v as number);
  }

  /**
   * Cuaderno de palabras difíciles. Se fusiona por palabra, y ante la duda gana
   * lo más exigente: la caja más baja y los fallos más altos, porque olvidar que
   * algo se te resiste es peor que repetirlo de más.
   */
  for (const r of remote.mine || []) {
    const l = out.mine.find(w => w.en.toLowerCase() === r.en.toLowerCase());
    if (!l) { out.mine.push(r); continue; }
    l.box = Math.min(l.box, r.box);
    l.fails = Math.max(l.fails, r.fails);
    l.seen = Math.max(l.seen, r.seen);
    l.due = Math.min(l.due, r.due);
    l.again = l.again || r.again;
    if (!l.ex && r.ex) l.ex = r.ex;
  }

  /* Textos generados con IA: se suman los que falten, sin duplicar. */
  const gids = new Set(out.gen.map(g => g.id));
  for (const g of remote.gen || []) if (!gids.has(g.id)) { gids.add(g.id); out.gen.push(g); }
  out.gen.sort((a, b) => b.made - a.made);
  if (out.gen.length > 40) out.gen = out.gen.slice(0, 40);

  /* Pruebas rápidas. */
  if (remote.quiz) {
    out.quiz.best = Math.max(out.quiz.best ?? -1, remote.quiz.best ?? -1);
    if (out.quiz.best < 0) out.quiz.best = null;
    const vistas = new Set(out.quiz.history.map(h => h.at + ":" + h.right + ":" + h.total));
    for (const h of remote.quiz.history || []) {
      const key = h.at + ":" + h.right + ":" + h.total;
      if (!vistas.has(key)) { vistas.add(key); out.quiz.history.push(h); }
    }
    out.quiz.history.sort((a, b) => a.at - b.at);
    if (out.quiz.history.length > 40) out.quiz.history = out.quiz.history.slice(-40);
  }

  return out;
}

/** Funde dos estados completos, ruta por ruta. Nunca borra progreso. */
export function mergeState(local: AppState, remote: Partial<AppState> | null): AppState {
  if (!remote) return local;
  const out: AppState = structuredClone(local);

  /* Unión de rutas: una ruta que solo conoce el otro lado (p. ej. b2c1) no se pierde. */
  const tracks = out.tracks as Record<string, TrackProgress>;
  for (const [id, r] of Object.entries((remote.tracks || {}) as Record<string, Partial<TrackProgress>>)) {
    if (r) tracks[id] = mergeTrack(tracks[id] || blankTrack(), r);
  }

  const errIds = new Set(out.errors.map(e => e.id));
  for (const e of remote.errors || []) if (!errIds.has(e.id)) out.errors.push(e);
  out.errors.sort((a, b) => a.id - b.id);

  const dias = new Set([...(out.streak.days || []), ...(remote.streak?.days || [])]);
  out.streak.days = [...dias].sort().slice(-400);
  const rl = remote.streak?.last || "";
  if (rl > (out.streak.last || "")) out.streak.last = rl;

  if (!out.examDate && remote.examDate) out.examDate = remote.examDate;

  return out;
}
