/**
 * Comprueba que el plan de 24 semanas de cada ruta se sostiene.
 *
 *   npm run test:plan
 *
 * Falla (exit 1) si una semana no tiene cinco días, si apunta a una unidad o a
 * un mazo que no existe, si un día de gramática no lleva bloque de Use of
 * English, si queda una unidad sin enseñar o un mazo sin programar, o si el
 * input (lectura + escucha) baja del mínimo. Al final imprime el reparto.
 */

import { TRACK_META } from "../src/data/tracks.ts";
import { buildDays } from "../src/data/schedule.ts";
import type { Track } from "../src/data/types.ts";

/** Por debajo de esto el plan no prepara la mitad receptiva del examen. */
const MIN_LECTURA = 10;
const MIN_ESCUCHA = 6;

let fallos = 0;
const mal = (ruta: string, msg: string) => { fallos++; console.error(`  ✗ ${ruta}: ${msg}`); };

for (const meta of TRACK_META) {
  const { TRACK: t } = await import(`../src/data/${meta.id}/index.ts`) as { TRACK: Track };
  const unidades = new Set(t.grammar.map(g => g.id));
  const mazos = new Set(t.decks.map(d => d.id));
  const ensenadas = new Set<string>();
  const programados = new Set<string>();
  const foco: Record<string, number> = {};

  if (t.weeks.length !== 24) mal(t.id, `${t.weeks.length} semanas, se esperaban 24`);

  t.weeks.forEach((w, i) => {
    if (w.w !== i + 1) mal(t.id, `la semana en la posición ${i + 1} dice ser la ${w.w}`);
    if (w.days.length !== 5) mal(t.id, `semana ${w.w}: ${w.days.length} días`);
    if (!unidades.has(w.unit)) mal(t.id, `semana ${w.w}: unidad ${w.unit} no existe`);
    if (!mazos.has(w.deck)) mal(t.id, `semana ${w.w}: mazo ${w.deck} no existe`);
    w.days.forEach((d, j) => {
      const u = d.unit || w.unit;
      const m = d.deck || w.deck;
      const donde = `semana ${w.w}, día ${j + 1}`;
      if (!unidades.has(u)) mal(t.id, `${donde}: unidad ${u} no existe`);
      if (!mazos.has(m)) mal(t.id, `${donde}: mazo ${m} no existe`);
      if ((d.focus === "leccion" || d.focus === "drills") && !d.uoe) mal(t.id, `${donde}: día de gramática sin bloque de Use of English`);
      if (d.focus === "leccion" || d.focus === "drills") ensenadas.add(u);
      programados.add(m);
      foco[d.focus] = (foco[d.focus] || 0) + 1;
    });
  });

  unidades.forEach(u => { if (!ensenadas.has(u)) mal(t.id, `la unidad ${u} no se enseña ningún día`); });
  mazos.forEach(m => { if (!programados.has(m)) mal(t.id, `el mazo ${m} no se programa ninguna semana`); });
  if ((foco.lectura || 0) < MIN_LECTURA) mal(t.id, `solo ${foco.lectura || 0} días de lectura (mínimo ${MIN_LECTURA})`);
  if ((foco.escucha || 0) < MIN_ESCUCHA) mal(t.id, `solo ${foco.escucha || 0} días de escucha (mínimo ${MIN_ESCUCHA})`);

  const dias = buildDays(t.weeks, t.decks, id => id, {
    writingIds: t.writing.map(w => w.id),
    speakingIds: t.speaking.map(s => s.id),
    readings: t.readingCount,
    listening: t.listening.length,
  });
  if (dias.length !== 120) mal(t.id, `${dias.length} días construidos, se esperaban 120`);
  const textos = dias.flatMap(d => d.blocks.map(b => b.goto?.text)).filter((x): x is number => x !== undefined);
  if (textos.some(x => x < 0 || x >= t.readingCount)) mal(t.id, "un día de lectura apunta a un texto fuera de rango");
  if (new Set(textos).size !== textos.length && textos.length <= t.readingCount) mal(t.id, "se repite un texto de lectura habiendo textos sin usar");

  const audios = dias.flatMap(d => d.blocks.map(b => b.goto?.listen)).filter((x): x is number => x !== undefined);
  if (audios.length !== (foco.escucha || 0)) mal(t.id, `${(foco.escucha || 0) - audios.length} días de escucha sin audio`);
  if (audios.some(x => x < 0 || x >= t.listening.length)) mal(t.id, "un día de escucha apunta a un audio fuera de rango");
  const ids = new Set<string>();
  t.listening.forEach(a => {
    if (ids.has(a.id)) mal(t.id, `audio ${a.id} repetido`);
    ids.add(a.id);
    if (!a.lines.length) mal(t.id, `audio ${a.id} sin guion`);
    if (a.lines.some(l => l.s === "B") && !a.speakers.B) mal(t.id, `audio ${a.id}: habla B pero no tiene nombre`);
    a.qs.forEach((q, j) => { if (q.a < 0 || q.a >= q.o.length) mal(t.id, `audio ${a.id}, pregunta ${j + 1}: respuesta fuera de rango`); });
  });

  console.log(`${t.name}: ${Object.entries(foco).map(([k, v]) => `${k} ${v}`).join(" · ")} · textos ${textos.join(",")} · audios ${audios.join(",")}`);
}

if (fallos) {
  console.error(`\n${fallos} problema(s) en el plan.`);
  process.exit(1);
}
console.log("\nPlan correcto en todas las rutas.");
