/**
 * Exporta el índice de contenido que necesita el backend (Laravel):
 *
 *   npm run content:export               → backend/resources/content/
 *   node … scripts/exportar-contenido.mts <carpeta>
 *
 * `tracks.json` lleva las rutas de TRACK_META (las rutas válidas del pulso y de
 * las lecturas compartidas). `<ruta>.json` es un índice compacto de cada ruta:
 * unidades, mazos, lecturas, escucha y días del plan con las referencias de cada
 * paso. Sale de los mismos datos que la app (src/data/), así que nunca se
 * desincroniza; no se versiona y se genera en el build.
 */

import fs from "node:fs";
import path from "node:path";
import { TRACK_META } from "../src/data/tracks.ts";
import { buildDays } from "../src/data/schedule.ts";
import type { StepGoto, Track } from "../src/data/types.ts";

const salida = process.argv[2] || "backend/resources/content";

function escribir(archivo: string, datos: unknown): void {
  fs.writeFileSync(path.join(salida, archivo), JSON.stringify(datos, null, 2) + "\n");
}

/** Referencias de un paso del día, en el orden en que aparecen: lo que el backend puede citar. */
function referencias(goto: StepGoto | undefined): Record<string, string | number> | null {
  if (!goto) return null;
  const { label: _etiqueta, ...ref } = goto;
  return ref;
}

async function indice(id: Track["id"]) {
  const mod = await import(`../src/data/${id}/index.ts`);
  const t: Track = { ...mod.TRACK, readings: await mod.cargarLecturas() };
  const unidad = (x: string) => {
    const g = t.grammar.find(g => g.id === x);
    return g ? `${g.n} · ${g.t}` : x;
  };
  const dias = buildDays(t.weeks, t.decks, unidad, {
    writingIds: t.writing.map(w => w.id),
    speakingIds: t.speaking.map(s => s.id),
    readings: t.readingCount,
    listening: t.listening.length,
  });

  return {
    id: t.id,
    units: t.grammar.map(g => ({ id: g.id, n: g.n, t: g.t, lvl: g.lvl })),
    decks: t.decks.map(d => ({ id: d.id, name: d.name, cat: d.cat ?? null, cards: d.cards.length })),
    readings: t.readings.map((r, i) => ({ i, title: r.title, questions: r.qs.length })),
    listening: t.listening.map((l, i) => ({ i, id: l.id, title: l.title, kind: l.kind })),
    days: dias.map(d => ({
      n: d.n, week: d.week, block: d.block, t: d.t, focus: d.focus,
      unit: d.unit, deck: d.deck, deckFrom: d.deckFrom, deckCount: d.deckCount, uoe: d.uoe ?? null, task: d.task,
      refs: d.blocks.map(b => referencias(b.goto)).filter(r => r !== null),
    })),
  };
}

fs.mkdirSync(salida, { recursive: true });
escribir("tracks.json", TRACK_META.map(t => ({ id: t.id, name: t.name, exam: t.exam })));
for (const { id } of TRACK_META) escribir(`${id}.json`, await indice(id));
console.log(`Contenido exportado en ${salida} (${TRACK_META.length} rutas).`);
