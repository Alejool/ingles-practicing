/**
 * Exporta el plan de estudio de las dos rutas a una página HTML legible.
 *
 *   npm run plan:export                      → docs/plan-de-estudio.html
 *   node … scripts/exportar-plan.mts salida.html --fragmento
 *
 * Sale de los mismos datos que usa la app (semanas, unidades, mazos, lecturas,
 * audios y tareas), así que el documento no se desincroniza nunca: si cambias
 * el plan, vuelves a exportarlo. `--fragmento` omite <html>/<head>/<body>,
 * para publicarlo donde el envoltorio ya lo pone otro.
 */

import fs from "node:fs";
import path from "node:path";
import { buildDays, FOCUS_LABEL } from "../src/data/schedule.ts";
import type { Day, DayFocus, Track, TrackId } from "../src/data/types.ts";

const args = process.argv.slice(2);
const fragmento = args.includes("--fragmento");
const salida = args.find(a => !a.startsWith("--")) || "docs/plan-de-estudio.html";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ORDEN: DayFocus[] = ["leccion", "drills", "lectura", "escucha", "writing", "speaking", "repaso", "simulacro"];

/* ─────────────── lo que no está en los datos de la app ─────────────── */

const BLOQUES: Record<TrackId, Record<string, [string, string]>> = {
  a2b1: {
    A: ["Que la base deje de fallar", "Presente, pasado, preguntas y artículos hasta que salgan sin pensar."],
    B: ["Empezar a construir frases de verdad", "Comparar, hablar del futuro, preposiciones y cantidades."],
    C: ["Entrar en B1", "Present perfect, modales, condicionales y vocabulario preciso."],
    D: ["Formato de examen y confianza", "Cada parte del examen con reloj, y cerrar agujeros."],
  },
  b1b2: {
    A: ["Reconstruir la base", "Tiempos verbales y orden de la frase: donde más puntos se pierden."],
    B: ["Del B1 sólido al B2 inicial", "Modales, artículos, preposiciones, gerundio e infinitivo, condicionales."],
    C: ["Precisión y rango B2", "Especular, relativas, pasiva, estilo indirecto y estructuras irreales."],
    D: ["Formato, velocidad y nervios", "Cohesión, énfasis y las cuatro partes del examen contra el reloj."],
  },
};

/** Formato oficial del examen principal de cada ruta. */
const EXAMEN: Record<TrackId, { nombre: string; aprobar: string; partes: Array<[string, string, string]> }> = {
  a2b1: {
    nombre: "Cambridge B1 Preliminary",
    aprobar: "Se aprueba con 140 en la Cambridge English Scale, alrededor del 70 % de la puntuación total.",
    partes: [
      ["Reading", "45 min", "6 partes, 32 preguntas: avisos cortos, emparejar, textos largos y huecos."],
      ["Writing", "45 min", "Un correo de unas 100 palabras y a elegir un artículo o una historia."],
      ["Listening", "unos 30 min", "4 partes, 25 preguntas. Cada audio suena dos veces."],
      ["Speaking", "12–17 min", "En pareja: preguntas personales, describir una foto, tarea conjunta y conversación."],
    ],
  },
  b1b2: {
    nombre: "Cambridge B2 First",
    aprobar: "Se aprueba con 160 en la Cambridge English Scale, alrededor del 60 % de la puntuación total.",
    partes: [
      ["Reading & Use of English", "1 h 15 min", "7 partes, 52 preguntas: 4 de gramática y vocabulario, 3 de lectura."],
      ["Writing", "1 h 20 min", "Un essay obligatorio de 140–190 palabras y otra tarea a elegir: artículo, correo, informe o reseña."],
      ["Listening", "unos 40 min", "4 partes, 30 preguntas. Cada audio suena dos veces."],
      ["Speaking", "14 min", "En pareja: entrevista, comparar fotos, tarea conjunta y discusión."],
    ],
  },
};

/** Metas orientativas de cada control: el porcentaje del simulacro de la app. */
const METAS: Record<TrackId, Array<[number, string, string]>> = {
  a2b1: [
    [6, "Línea de partida", "Sin meta: anota la nota. Lo que importa es la diferencia con la semana 12."],
    [12, "50 % o más", "Repites el diagnóstico. Si una unidad sigue por debajo del 60 %, repite su semana antes de seguir."],
    [18, "60 % o más", "Si no llegas, las semanas 19 y 22 se dedican enteras a lo que el radar tenga en rojo."],
    [23, "70 % o más", "Es la nota de aprobado. Por encima del 75 % vas con margen al examen real."],
  ],
  b1b2: [
    [6, "Línea de partida", "Sin meta: anota la nota. Lo que importa es la diferencia con la semana 12."],
    [12, "45 % o más", "Repites el diagnóstico. Si una unidad sigue por debajo del 60 %, repite su semana antes de seguir."],
    [18, "55 % o más", "Si no llegas, usa las semanas 19 y 23 para las áreas en rojo antes que el formato."],
    [23, "65 % o más", "El aprobado ronda el 60 %. Por encima del 70 % puedes plantearte la nota B."],
  ],
};

/* ─────────────── construir cada ruta ─────────────── */

function material(d: Day, t: Track): string[] {
  const out: string[] = [];
  d.blocks.forEach(b => {
    const g = b.goto;
    if (!g) return;
    if (g.listen !== undefined) out.push(`Audio ${g.listen + 1}: ${t.listening[g.listen]?.title}`);
    if (g.text !== undefined) out.push(`Lectura ${g.text + 1}: ${t.readings[g.text]?.title || ""}`);
    if (g.task) { const w = t.writing.find(x => x.id === g.task); if (w) out.push(`Writing: ${w.name}`); }
    if (g.part) { const s = t.speaking.find(x => x.id === g.part); if (s) out.push(`Speaking: ${s.name}`); }
  });
  if (d.deckCount) out.push(`${d.deckCount} tarjetas de ${t.decks.find(k => k.id === d.deck)?.name}`);
  return [...new Set(out)];
}

async function ruta(id: TrackId): Promise<string> {
  const mod = await import(`../src/data/${id}/index.ts`);
  const t: Track = { ...mod.TRACK, readings: await mod.cargarLecturas() };
  const unidad = (x: string) => { const g = t.grammar.find(g => g.id === x); return g ? `${g.n} · ${g.t}` : x; };
  const dias = buildDays(t.weeks, t.decks, unidad, {
    writingIds: t.writing.map(w => w.id),
    speakingIds: t.speaking.map(s => s.id),
    readings: t.readingCount,
    listening: t.listening.length,
  });

  const cuenta: Partial<Record<DayFocus, number>> = {};
  dias.forEach(d => { cuenta[d.focus] = (cuenta[d.focus] || 0) + 1; });
  const tarjetas = t.decks.reduce((n, k) => n + k.cards.length, 0);
  const barra = ORDEN.filter(f => cuenta[f]).map(f => `<span class="seg f-${f}" style="flex:${cuenta[f]}" title="${FOCUS_LABEL[f]}: ${cuenta[f]}"></span>`).join("");
  const leyenda = ORDEN.filter(f => cuenta[f]).map(f => `<li><i class="dot f-${f}"></i>${FOCUS_LABEL[f]} <b>${cuenta[f]}</b></li>`).join("");
  const ex = EXAMEN[id];

  let bloques = "";
  for (const B of ["A", "B", "C", "D"]) {
    const ws = t.weeks.filter(w => w.block === B);
    const [nombre, idea] = BLOQUES[id][B];
    bloques += `<section class="bloque"><header class="bh"><span class="bl">Bloque ${B} · semanas ${ws[0].w}–${ws[ws.length - 1].w}</span><h3>${esc(nombre)}</h3><p>${esc(idea)}</p></header>`;
    for (const w of ws) {
      const suyos = dias.filter(d => d.week === w.w);
      const mazos = [...new Set(suyos.filter(d => d.deckCount).map(d => t.decks.find(k => k.id === d.deck)?.name || d.deck))].join(", ");
      const filas = suyos.map((d, i) => {
        const mat = material(d, t);
        return `<li><span class="chip f-${d.focus}">${FOCUS_LABEL[d.focus]}</span><div><p class="dt">Día ${d.n} <span class="dd">· ${["Lun", "Mar", "Mié", "Jue", "Vie"][i]}</span> · ${esc(d.t)}</p><p class="dk">${esc(d.task)}</p>${mat.length ? `<p class="mat">${mat.map(esc).join(" · ")}</p>` : ""}</div></li>`;
      }).join("");
      const control = METAS[id].find(m => m[0] === w.w);
      bloques += `<details class="sem" id="${id}-s${w.w}"${w.w === 1 ? " open" : ""}><summary><span class="wn">S${String(w.w).padStart(2, "0")}</span><span class="wg">${esc(w.goal)}${control ? ` <span class="ctl">Control</span>` : ""}</span><span class="strip">${suyos.map(d => `<i class="dot f-${d.focus}" title="${FOCUS_LABEL[d.focus]}"></i>`).join("")}</span></summary><div class="meta"><span><b>Gramática</b>${esc(unidad(w.unit))}</span><span><b>Vocabulario</b>${esc(mazos || "repaso")}</span></div><ol class="dias">${filas}</ol><label class="hecho"><input type="checkbox" data-sem="${id}-${w.w}"> Semana hecha</label></details>`;
    }
    bloques += `</section>`;
  }

  return `<div class="pane" id="p-${id}" data-id="${id}"${id === "a2b1" ? " hidden" : ""}>
  <div class="resumen">
    <div><p class="eyebrow">Para quién</p><p class="big">${esc(t.who)}</p><p class="who">Apunta a: ${esc(t.exam)}.</p></div>
    <dl class="nums"><div><dt>Sesiones</dt><dd>120 × 45 min</dd></div><div><dt>Gramática</dt><dd>${t.grammar.length} unidades</dd></div><div><dt>Tarjetas</dt><dd>${tarjetas}</dd></div><div><dt>Lecturas · audios</dt><dd>${t.readingCount} · ${t.listening.length}</dd></div></dl>
  </div>
  <div class="dist"><p class="eyebrow">Reparto de las 120 sesiones</p><div class="bar">${barra}</div><ul class="leg">${leyenda}</ul></div>
  <div class="dos">
    <section><p class="eyebrow">El examen · ${esc(ex.nombre)}</p><div class="tabla"><table><thead><tr><th>Parte</th><th>Tiempo</th><th>Qué hay</th></tr></thead><tbody>${ex.partes.map(p => `<tr><td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td></tr>`).join("")}</tbody></table></div><p class="tiny">${esc(ex.aprobar)}</p></section>
    <section><p class="eyebrow">Metas de cada control</p><div class="tabla"><table><thead><tr><th>Semana</th><th>Simulacro</th><th>Si no llegas</th></tr></thead><tbody>${METAS[id].map(m => `<tr><td>S${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td></tr>`).join("")}</tbody></table></div><p class="tiny">Orientativas: el simulacro de la app no es el examen oficial, pero mide lo mismo.</p></section>
  </div>
  ${bloques}
  <p class="progreso" aria-live="polite"></p>
</div>`;
}

/* ─────────────── la página ─────────────── */

const CSS = `
:root{
  --paper:#ECEFF5;--surface:#F9FAFD;--ink:#131A29;--ink-2:#3C4759;--ink-3:#5C6780;--line:#CBD3E2;
  --accent:#1B4C93;--accent-soft:#DCE7F8;--chip-ink:#FFFFFF;--mark:#EBD65A;--mark-ink:#3A3208;
  --c-leccion:#1B4C93;--c-drills:#5B7DB8;--c-lectura:#186B41;--c-escucha:#3E8F63;--c-writing:#855A08;--c-speaking:#B07418;--c-repaso:#6B778F;--c-simulacro:#A6392E;
  --f-d:"Newsreader",Georgia,serif;--f-b:"Instrument Sans","Helvetica Neue",Arial,sans-serif;--f-m:"Azeret Mono",Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;
  --paper:#0A101E;--surface:#111A2B;--ink:#E8ECF5;--ink-2:#AEB9CE;--ink-3:#7B87A0;--line:#222D45;
  --accent:#7FAEF9;--accent-soft:#132445;--chip-ink:#06152B;--mark:#C9B23A;--mark-ink:#120F00;
  --c-leccion:#7FAEF9;--c-drills:#9DB6E0;--c-lectura:#5CC489;--c-escucha:#8FD8AE;--c-writing:#DCA845;--c-speaking:#F0C27A;--c-repaso:#A3AEC4;--c-simulacro:#E8806E;}}
:root[data-theme="dark"]{color-scheme:dark;
  --paper:#0A101E;--surface:#111A2B;--ink:#E8ECF5;--ink-2:#AEB9CE;--ink-3:#7B87A0;--line:#222D45;
  --accent:#7FAEF9;--accent-soft:#132445;--chip-ink:#06152B;--mark:#C9B23A;--mark-ink:#120F00;
  --c-leccion:#7FAEF9;--c-drills:#9DB6E0;--c-lectura:#5CC489;--c-escucha:#8FD8AE;--c-writing:#DCA845;--c-speaking:#F0C27A;--c-repaso:#A3AEC4;--c-simulacro:#E8806E;}
body{background:var(--paper);color:var(--ink);font:15px/1.55 var(--f-b);margin:0}
.wrap{max-width:940px;margin:0 auto;padding:40px 18px 64px}
h1,h2,h3{font-family:var(--f-d);font-weight:500;text-wrap:balance;margin:0;line-height:1.15}
h1{font-size:clamp(30px,5vw,44px)}
h2{font-size:26px}
.lede{color:var(--ink-2);max-width:64ch;margin:12px 0 0;font-size:16px}
.eyebrow{font:500 11px/1.3 var(--f-m);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:0 0 8px}
.tiny{font-size:12.5px;color:var(--ink-3);margin:8px 0 0}
.inicio{margin:32px 0 0;padding:20px 0 0;border-top:1px solid var(--line)}
.inicio ol{list-style:none;counter-reset:p;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.inicio li{counter-increment:p;display:grid;gap:4px;align-content:start}
.inicio li::before{content:counter(p);font:600 13px var(--f-m);color:var(--accent)}
.inicio li b{font-weight:600}
.inicio li span{color:var(--ink-2);font-size:14px}
.reglas{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px 28px;margin:18px 0 0;padding:0;list-style:none;font-size:14px;color:var(--ink-2)}
.reglas b{color:var(--ink);font-weight:600}
.camino{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;margin:36px 0 8px}
.camino button{flex:1 1 240px;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;cursor:pointer;color:var(--ink);font:inherit;display:grid;gap:4px}
.camino button .eyebrow{margin:0}
.camino button[aria-pressed="true"]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:var(--accent-soft)}
.camino button:focus-visible,.sem summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.camino .n{font:600 22px/1.1 var(--f-d)}
.camino .s{color:var(--ink-3);font-size:13px}
.flecha{align-self:center;font-family:var(--f-m);color:var(--ink-3)}
@media (max-width:540px){.flecha{display:none}}
.resumen{display:grid;grid-template-columns:1.3fr 1fr;gap:20px;padding:20px 0;border-top:1px solid var(--line);margin-top:18px}
.dos{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:8px 0 4px}
@media (max-width:760px){.resumen,.dos{grid-template-columns:1fr}}
.big{font:500 20px/1.35 var(--f-d);margin:0}
.who{color:var(--ink-2);margin:8px 0 0}
.nums{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin:0}
.nums dt{font:500 11px var(--f-m);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3)}
.nums dd{margin:2px 0 0;font:500 18px var(--f-d);font-variant-numeric:tabular-nums}
.dist{padding:0 0 18px}
.bar{display:flex;height:14px;border-radius:4px;overflow:hidden;gap:2px}
.seg{display:block}
.leg{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--ink-2)}
.leg b{font-variant-numeric:tabular-nums;color:var(--ink)}
.dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px}
.f-leccion{background:var(--c-leccion)}.f-drills{background:var(--c-drills)}.f-lectura{background:var(--c-lectura)}.f-escucha{background:var(--c-escucha)}
.f-writing{background:var(--c-writing)}.f-speaking{background:var(--c-speaking)}.f-repaso{background:var(--c-repaso)}.f-simulacro{background:var(--c-simulacro)}
.tabla{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13.5px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{font:500 10.5px var(--f-m);text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3)}
td:first-child{font-weight:500;white-space:nowrap}
td:nth-child(2){font-family:var(--f-m);font-size:12px;white-space:nowrap;color:var(--ink-2)}
.bloque{margin-top:36px}
.bh{display:grid;gap:4px;padding-bottom:10px;border-bottom:2px solid var(--ink)}
.bl{font:600 12px var(--f-m);letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.bh h3{font-size:24px}
.bh p{margin:0;color:var(--ink-2);font-size:14px}
.sem{border-bottom:1px solid var(--line)}
.sem summary{display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:baseline;padding:12px 2px;cursor:pointer;list-style:none}
.sem summary::-webkit-details-marker{display:none}
.sem summary:hover .wg{color:var(--accent)}
.wn{font:500 13px var(--f-m);color:var(--ink-3)}
.sem[open] .wn{color:var(--accent)}
.sem.ok .wn::after{content:" ✓";color:var(--c-lectura)}
.wg{font-weight:500}
.ctl{font:500 10px var(--f-m);text-transform:uppercase;letter-spacing:.06em;background:var(--mark);color:var(--mark-ink);padding:2px 6px;border-radius:3px;margin-left:6px;vertical-align:2px}
.strip{white-space:nowrap}.strip .dot{margin:0 0 0 3px}
@media (max-width:520px){.sem summary{grid-template-columns:40px 1fr}.strip{grid-column:2}}
.meta{display:flex;flex-wrap:wrap;gap:4px 22px;font-size:13px;color:var(--ink-2);padding:0 0 12px 62px}
.meta b{font:500 11px var(--f-m);text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin-right:8px}
.dias{list-style:none;margin:0;padding:0 0 12px 62px;display:grid;gap:14px}
.dias li{display:grid;grid-template-columns:108px 1fr;gap:12px;align-items:start}
@media (max-width:520px){.meta,.dias,.hecho{padding-left:0!important}.dias li{grid-template-columns:1fr;gap:4px}.chip{justify-self:start}}
.chip{font:500 11px/1 var(--f-m);color:var(--chip-ink);padding:5px 7px;border-radius:4px;text-align:center;margin-top:2px}
.dt{margin:0;font-weight:500}
.dd{font:12px var(--f-m);color:var(--ink-3)}
.dk{margin:2px 0 0;color:var(--ink-2);font-size:14px;max-width:70ch}
.mat{margin:4px 0 0;font:12px/1.5 var(--f-m);color:var(--ink-3)}
.hecho{display:flex;gap:8px;align-items:center;padding:0 0 16px 62px;font-size:13px;color:var(--ink-2);cursor:pointer}
.hecho input{accent-color:var(--accent);width:16px;height:16px}
.progreso{font:13px var(--f-m);color:var(--ink-3);margin:18px 0 0}
.sesion{margin:52px 0 0;padding-top:20px;border-top:1px solid var(--line)}
.sesion table{min-width:560px}
@media (prefers-reduced-motion:no-preference){.camino button{transition:background .15s,border-color .15s}}
`;

const JS = `
(function(){
  var btns=document.querySelectorAll('.camino button');
  function show(id){
    document.querySelectorAll('.pane').forEach(function(p){p.hidden=p.dataset.id!==id});
    btns.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.id===id))});
    try{localStorage.setItem('ruta',id)}catch(e){}
  }
  btns.forEach(function(b){b.addEventListener('click',function(){show(b.dataset.id)})});
  var hechas={};
  try{hechas=JSON.parse(localStorage.getItem('semanas')||'{}')||{}}catch(e){}
  function contar(){
    document.querySelectorAll('.pane').forEach(function(p){
      var n=p.querySelectorAll('input[data-sem]:checked').length;
      p.querySelector('.progreso').textContent=n+' de 24 semanas hechas en esta ruta.';
    });
  }
  document.querySelectorAll('input[data-sem]').forEach(function(c){
    var k=c.dataset.sem;
    c.checked=!!hechas[k];
    c.closest('.sem').classList.toggle('ok',c.checked);
    c.addEventListener('change',function(){
      hechas[k]=c.checked;
      c.closest('.sem').classList.toggle('ok',c.checked);
      try{localStorage.setItem('semanas',JSON.stringify(hechas))}catch(e){}
      contar();
    });
  });
  contar();
  var h=location.hash.slice(1),saved=null;
  try{saved=localStorage.getItem('ruta')}catch(e){}
  if(h==='a2b1'||h==='b1b2')show(h);else if(saved==='a2b1'||saved==='b1b2')show(saved);
})();
`;

const SESION: Array<[DayFocus, string, string]> = [
  ["leccion", "0–8 · 8–25 · 25–36 · 36–45", "Tarjetas nuevas, regla con su trampa y drills, cuatro ítems de Use of English, producción corta."],
  ["drills", "0–8 · 8–20 · 20–34 · 34–45", "Tarjetas falladas, seis drills sin mirar la regla, seis ítems de Use of English, producción."],
  ["lectura", "0–8 · 8–28 · 28–36 · 36–45", "Tarjetas, el texto del día con barrido de 90 s y cada respuesta justificada con una línea, repaso de gramática, producción."],
  ["escucha", "0–8 · 8–30 · 30–38 · 38–45", "Tarjetas, el audio del día en tres pases (sin texto, con preguntas, con transcript), Use of English y shadowing."],
  ["writing", "0–5 · 5–12 · 12–35 · 35–45", "Plan de cinco puntos, escribir dentro del límite de palabras, corrección con IA y reescribir las dos frases peores."],
  ["speaking", "0–5 · 5–15 · 15–30 · 30–45", "Lenguaje funcional, hablar grabado con cronómetro, transcribir y evaluar."],
  ["repaso", "0–12 · 12–25 · 25–38 · 38–45", "Caja 1 de las tarjetas, unidades por debajo del 70 %, Use of English mezclado, cuaderno de errores."],
  ["simulacro", "0–40 · 40–45", "Examen cronometrado de una sentada, y clasificar cada fallo: nivel, formato, prisa o nervios."],
];

const panes = (await ruta("a2b1")) + (await ruta("b1b2"));

const cuerpo = `<div class="wrap">
<p class="eyebrow">Plan de estudio · 24 + 24 semanas</p>
<h1>De A2 a B2 en dos rutas de 24 semanas</h1>
<p class="lede">Cinco sesiones de 45 minutos por semana, de lunes a viernes, en cuatro bloques por ruta: base, construcción, precisión y formato de examen. Todo lo que pide cada día está dentro de la app: la lección, las tarjetas, el texto, el audio y la tarea.</p>

<section class="inicio">
<p class="eyebrow">Cómo empezar</p>
<h2>Cuatro pasos antes del día 1</h2>
<ol>
<li><b>Haz el diagnóstico</b><span>Módulo 02, unos 15 minutos. Te dice si entras por A2 → B1 o por B1 → B2.</span></li>
<li><b>Elige la ruta</b><span>Si partes de A2 y quieres B2, haz las dos seguidas: 48 semanas, unos 11 meses.</span></li>
<li><b>Pon fecha al examen</b><span>Resérvala para la semana 24 o la 25. Sin fecha el plan se alarga solo.</span></li>
<li><b>Fija tu hora</b><span>Siempre la misma, 45 minutos seguidos, con el móvil en silencio. El día lo abre la app en «Plan diario».</span></li>
</ol>
<ul class="reglas">
<li><b>Si pierdes un día,</b> no lo saltes: haz el siguiente de la lista. El plan cuenta sesiones, no fechas.</li>
<li><b>Si pierdes más de una semana,</b> vuelve al último día de repaso antes de seguir.</li>
<li><b>No te saltes los repasos ni los simulacros.</b> Son lo que convierte lo estudiado en nota.</li>
<li><b>Fines de semana, opcional:</b> 15 minutos de tarjetas vencidas y algo en inglés que te guste, sin ejercicios.</li>
</ul>
</section>

<div class="camino" role="group" aria-label="Elegir ruta">
  <button type="button" id="btn-a2b1" data-id="a2b1" aria-pressed="false"><span class="eyebrow">Ruta 1 · hasta B1</span><span class="n">A2 → B1</span><span class="s">Cambridge A2 Key y B1 Preliminary</span></button>
  <span class="flecha" aria-hidden="true">→</span>
  <button type="button" id="btn-b1b2" data-id="b1b2" aria-pressed="true"><span class="eyebrow">Ruta 2 · hasta B2</span><span class="n">B1 → B2</span><span class="s">B2 First, IELTS 5.5–6.5, TOEFL 72–94</span></button>
</div>
${panes}
<section class="sesion">
<p class="eyebrow">Cómo se reparten los 45 minutos</p>
<h2>Una sesión por dentro</h2>
<div class="tabla"><table>
<thead><tr><th>Tipo de día</th><th>Minutos</th><th>Qué se hace</th></tr></thead>
<tbody>${SESION.map(([f, m, q]) => `<tr><td><i class="dot f-${f}"></i>${FOCUS_LABEL[f]}</td><td>${m}</td><td>${q}</td></tr>`).join("")}</tbody>
</table></div>
<p class="tiny">Exportado de los datos de la app con <code>npm run plan:export</code>. Las casillas de «Semana hecha» se guardan solo en este navegador.</p>
</section>
</div>`;

const cabeza = `<title>Ruta A2 → B1 → B2</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Instrument+Sans:wght@400;500;600&family=Azeret+Mono:wght@400;500&display=swap">
<style>${CSS}</style>`;

const html = fragmento
  ? `${cabeza}\n${cuerpo}\n<script>${JS}</script>\n`
  : `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${cabeza}\n</head>\n<body>\n${cuerpo}\n<script>${JS}</script>\n</body>\n</html>\n`;

fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
fs.writeFileSync(salida, html);
console.log(`Plan exportado a ${salida} (${Math.round(html.length / 1024)} KB).`);
