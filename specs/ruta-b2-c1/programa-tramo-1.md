# Ruta B2 → C1 — Programa del tramo 1 (semanas 1–4)

Referencia de las tareas de contenido 7.2 a 7.15. Describe qué enseña cada una de las 20 sesiones y qué material abre. El reparto de minutos de cada sesión no se escribe aquí: lo pone `src/data/schedule.ts` según el `focus` del día, igual que en las otras rutas.

## Reparto frente a las rutas actuales

Medido sobre `src/data/a2b1/weeks.ts` y `src/data/b1b2/weeks.ts`, semanas 1–4, y sobre lo que pide la tarea 7.1.

| Pieza | Rutas actuales (sem. 1–4) | Tramo 1 de B2 → C1 |
|---|---|---|
| Unidades de gramática | 4 | 4 (`g1`–`g4`) |
| Mazos | 2 | 2 (`c1col`, `c1phr`), 60 tarjetas cada uno |
| Pases de tarjeta | ~205–215 | 204 (108 en `c1col`, 96 en `c1phr`) |
| Días de gramática con transformaciones | 7 | 7 |
| Días de gramática con open cloze | 2–4 | 2 |
| Días con word formation | 0 | 2 (los dos días de escucha, en su bloque corto de Use of English) |
| Lecturas | 2 | 2 |
| Audios | 1–2 | 2 |
| Días de writing / tareas distintas | 3 / 3 | 3 / 3 (`wr1`, `wr2`, `wr3`) |
| Días de speaking / partes distintas | 3–4 / 3 | 3 / 3 (`sp1`, `sp2`, `sp3`) |
| Repaso | 1 | 1 |
| Simulacro | 0 | 0 |

Los pases de tarjeta salen de `cardsFor()` en `schedule.ts`: 12 en lección, consolidación, lectura y escucha; 8 en writing y speaking; 0 en repaso. Con 60 tarjetas por mazo, cada mazo da una vuelta completa y repite parte en la segunda semana, como en las otras rutas.

## Unidades y mazos

| Id | Título | Nivel | Qué cubre que B1 → B2 no cubre |
|---|---|---|---|
| `g1` | Inversión tras adverbiales negativos y restrictivos | C1 | El sistema completo: en qué oración va la inversión con `only` y `not until`, `hardly… when` frente a `no sooner… than`, `so/such… that`, `nowhere`, y los casos que **no** invierten. B1 → B2 (`g17`) solo presenta cuatro ejemplos en una unidad compartida con los clefts. |
| `g2` | Cleft sentences | C1 | It-clefts con adverbial y con cláusula (`It was only when… that`), wh-clefts de acción (`What they did was…`), `All… was`, `The reason why… is that`, concordancia. B1 → B2 solo tiene `What we need is…` como ejemplo. |
| `g3` | Condicionales mixtos y formales | C1 | Mixto en los dos sentidos, inversión con `should / were / had`, `were to`, `but for`, `on condition that`. B1 → B2 (`g5`) cubre los tipos 0–3 y un único mixto. |
| `g4` | Modales perfectos: especular, reprochar y valorar el pasado | C1 | `will have`, `may well have`, continuo y pasiva, `should have` como expectativa, `might/could have` como reproche o posibilidad no cumplida, `needn't have`. B1 → B2 (`g7`) cubre `must / might / can't have`. |

| Id | Mazo | Familia (`cat`) | Tarjetas |
|---|---|---|---|
| `c1col` | Colocaciones formales y académicas | `colocaciones` | 60 |
| `c1phr` | Phrasal verbs y expresiones de registro | `phrasal` | 60 |

## Las 20 sesiones

`UoE` es el bloque de Use of English del día (`trans`, `cloze`, `wform`). En los días de lectura, writing y speaking no hay bloque de Use of English.

### Semana 1 — unidad `g1`, mazo `c1col`
Objetivo: saber cuándo se invierte, en cuál de las dos oraciones y cuándo no.

| Día | Foco | Título | UoE | Material que abre |
|---|---|---|---|---|
| 1 | leccion | Inversión: never, seldom, under no circumstances | trans | `g1` (regla, trampa, 4 drills) · 12 tarjetas `c1col` · 4 transformaciones |
| 2 | drills | Hardly… when, no sooner… than, only y not until | trans | `g1` (6 drills) · 12 tarjetas · 6 transformaciones |
| 3 | lectura | Lectura C1: seguir un argumento, no cazar datos | — | Lectura 1 «The tyranny of the measurable» · 12 tarjetas · repaso de `g1` |
| 4 | writing | Essay de C1 Advanced: dos puntos y una postura | — | `wr1` (essay) · 8 tarjetas |
| 5 | speaking | Speaking parte 1: respuestas con matiz | — | `sp1` · 8 tarjetas |

### Semana 2 — unidad `g2`, mazo `c1col`
Objetivo: poner el foco donde se quiere con cleft sentences, sin calcar «fue entonces cuando».

| Día | Foco | Título | UoE | Material que abre |
|---|---|---|---|---|
| 6 | leccion | It-clefts: It was… that | trans | `g2` (4 drills) · 12 tarjetas `c1col` · 4 transformaciones |
| 7 | drills | What-clefts y All I did was… | cloze | `g2` (6 drills) · 12 tarjetas · 6 huecos del cloze 2 |
| 8 | drills | The reason why… y It wasn't until… that | trans | `g2` (6 drills) · 12 tarjetas · 6 transformaciones |
| 9 | writing | Proposal: recomendar con registro formal | — | `wr2` (proposal) · 8 tarjetas |
| 10 | escucha | Escucha: entrevista larga y actitud del hablante | wform | Audio 1 «What mountains teach about risk» · 12 tarjetas · 6 ítems de word formation |

### Semana 3 — unidad `g3`, mazo `c1phr`
Objetivo: condicionales mixtos e invertidos (Had we known, Were it not for, Should you need).

| Día | Foco | Título | UoE | Material que abre |
|---|---|---|---|---|
| 11 | leccion | Condicionales mixtos en los dos sentidos | trans | `g3` (4 drills) · 12 tarjetas `c1phr` · 4 transformaciones |
| 12 | drills | Should, were y had en lugar de if | trans | `g3` (6 drills) · 12 tarjetas · 6 transformaciones |
| 13 | lectura | Lectura C1: actitud del autor y vocabulario en contexto | — | Lectura 2 «The translator's invisible hand» · 12 tarjetas · repaso de `g3` |
| 14 | writing | Review: describir, valorar y recomendar | — | `wr3` (review) · 8 tarjetas |
| 15 | speaking | Speaking parte 2: comparar y especular un minuto | — | `sp2` · 8 tarjetas |

### Semana 4 — unidad `g4`, mazo `c1phr`
Objetivo: especular sobre el pasado con toda la escala (will have, may well have, can't have, needn't have).

| Día | Foco | Título | UoE | Material que abre |
|---|---|---|---|---|
| 16 | leccion | Grados de certeza sobre el pasado | trans | `g4` (4 drills) · 12 tarjetas `c1phr` · 4 transformaciones |
| 17 | drills | Reproche, expectativa y posibilidad no cumplida | cloze | `g4` (6 drills) · 12 tarjetas · 6 huecos del cloze 2 |
| 18 | escucha | Escucha: monólogo informativo y propósito | wform | Audio 2 «How a word earns its place» · 12 tarjetas · 6 ítems de word formation |
| 19 | repaso | Repaso de las unidades 1 a 4 | (trans) | Mazo `c1phr`, gramática, ítems mezclados, cuaderno de errores |
| 20 | speaking | Speaking parte 3: negociar sin monologar | — | `sp3` · 8 tarjetas |

## Qué ítems de Use of English salen cada día

La vista del plan (`src/scripts/views/plan.ts`, función `ejercicios`) no elige los ítems por unidad: toma `pool[(día × 3 + k) % total]`. Con 24 transformaciones, 2 clozes de 12 huecos y 10 ítems de word formation, el reparto real es este (posiciones contadas desde 1):

| Día | Bloque | Ítems | Tema de esos ítems |
|---|---|---|---|
| 1 | trans | t4–t7 | inversión (4 de 4) |
| 2 | trans | t7–t12 | inversión (3) y condicionales (3, aún no vistos) |
| 6 | trans | t19–t22 | clefts (4 de 4) |
| 7 | cloze | cloze 2, huecos 10–12 y 1–3 | inversión y clefts |
| 8 | trans | t1–t6 | clefts (2), modal (1), inversión (3, repaso) |
| 10 | wform | w1–w6 | — |
| 11 | trans | t10–t13 | condicionales (4 de 4) |
| 12 | trans | t13–t18 | condicionales (3) y modales (3, aún no vistos) |
| 16 | trans | t1–t4 | clefts (2), modal (1), inversión (1): repaso |
| 17 | cloze | cloze 2, huecos 4–9 | condicionales invertidos y modales perfectos |
| 18 | wform | w5–w10 | — |
| 19 | trans (repaso) | t10–t15 | condicionales |

El orden de `TRANS` en `src/data/b2c1/uoe.ts` está elegido para que los tres primeros días de lección (1, 6 y 11) reciban solo ítems de su unidad. No se puede alinear todos los días con esa fórmula: el día 16 (lección de modales) recibe sobre todo repaso. Si se quiere alineación exacta, hace falta un cambio de código en la vista (fuera de esta fase). El cloze 1 no lo abre ningún día del tramo: queda disponible en el módulo de Use of English.

## Material que el tramo necesita completo

| Archivo | Contenido |
|---|---|
| `src/data/b2c1/diagnostic.ts` | 30 ítems (7 de nivel B2, 23 de nivel C1) |
| `src/data/b2c1/grammar.ts` | `g1`–`g4`, 10 drills cada una |
| `src/data/b2c1/decks.ts` | `c1col` y `c1phr`, 60 tarjetas cada uno |
| `src/data/b2c1/uoe.ts` | 24 transformaciones, 2 open cloze de 12 huecos, 10 word formation |
| `src/data/b2c1/reading.ts`, `reading2.ts` | 2 lecturas de 600–700 palabras, 6 preguntas cada una |
| `src/data/b2c1/listening.ts` | 2 audios (entrevista con dos voces, monólogo), 5 preguntas cada uno |
| `src/data/b2c1/writing.ts` | rúbrica de 4 criterios, `wr1` essay, `wr2` proposal, `wr3` review |
| `src/data/b2c1/speaking.ts` | `sp1`, `sp2`, `sp3` (partes 1, 2 y 3 del examen) |
| `src/data/b2c1/strategies.ts`, `resources.ts`, `plan-doc.ts` | 4 estrategias, 5 grupos de recursos, textos C1 del documento del plan |
| `src/data/b2c1/weeks.ts` | semanas 1–4 |

Lo que no entra en el tramo 1: simulacros (`mocks: []`), unidades `g5`–`g18`, el resto de mazos, las partes 4 del speaking y los géneros de writing que faltan (report, carta o correo formal).
