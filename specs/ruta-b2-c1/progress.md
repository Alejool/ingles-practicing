# Ruta B2 → C1 — Progreso

## Punto de control de contenido (fase 7) — 2026-10-10

Estado: **contenido del tramo 1 redactado entero; punto de control 7.16 abierto** por comprobaciones externas que este agente no pudo hacer (sin red, sin libros de referencia ni diccionario delante) y que quedan para la revisión humana de la fase 9.

Solo se han creado archivos nuevos en `src/data/b2c1/` y `specs/ruta-b2-c1/`. No se ha tocado nada de `src/data/a2b1`, `src/data/b1b2`, `types.ts`, `tracks.ts`, `build.ts`, `netlify/`, `scripts/`, `shared/` ni `tests/`. La ruta **no está registrada** en ningún sitio: no existe `src/data/b2c1/index.ts` (es la tarea 8.1).

### Tareas

| Tarea | Estado | Nota |
|---|---|---|
| 7.1 Programa del tramo | hecha | `programa-tramo-1.md` |
| 7.2 Diagnóstico | hecha | |
| 7.3–7.6 Gramática `g1`–`g4` | en curso | Redactadas y con claves verificadas. Falta contrastar las reglas con el libro delante (se hizo de memoria). |
| 7.7–7.8 Mazos | en curso | Redactados. Falta contrastar las 120 transcripciones con un diccionario (se escribieron de memoria). |
| 7.9 Use of English | hecha | |
| 7.10–7.11 Lecturas | hechas | |
| 7.12 Escucha | hecha | «Leer en voz alta» se hizo como lectura del texto buscando cifras, siglas y símbolos; no se ha probado con la voz del navegador. |
| 7.13 Writing y speaking | hecha | |
| 7.14 Piezas fijas | en curso | Redactadas. Sin red: formato del examen y títulos de recursos sin contrastar con las páginas oficiales. |
| 7.15 Semanas 1–4 | hecha | |
| 7.16 Punto de control | en curso | Ver «Comprobación de tipos» y «Para revisión humana prioritaria». |

### Recuento por tipo frente a AC-3 a AC-6

| Tipo | Pedido | Entregado | Archivo |
|---|---|---|---|
| Diagnóstico | 30 ítems | 30 (7 de nivel B2, 23 de nivel C1; 19 áreas) | `diagnostic.ts` |
| Unidades de gramática | ≥ 4, con ≥ 10 drills | 4 unidades, 40 drills (10 por unidad), todas `lvl: "C1"` | `grammar.ts` |
| Mazos | ≥ 2, con ≥ 60 tarjetas | 2 mazos, 120 tarjetas (60 + 60), con `cat` explícito | `decks.ts` |
| Transformaciones | 24 | 24 (6 por unidad) | `uoe.ts` |
| Open cloze | 2 de 12 huecos | 2 (24 huecos) | `uoe.ts` |
| Word formation | 10 | 10 | `uoe.ts` |
| Lecturas | ≥ 2 con preguntas | 2 (630 y 638 palabras), 6 preguntas cada una | `reading.ts`, `reading2.ts` |
| Audios | ≥ 1 con guion y 5 preguntas | 2 (entrevista a dos voces, 507 palabras; monólogo, 457 palabras), 5 preguntas de 3 opciones cada uno | `listening.ts` |
| Rúbrica | 4 criterios | 4 | `writing.ts` |
| Tareas de writing | ≥ 3 con modelo | 3 (essay, proposal, review), 220–260 palabras | `writing.ts` |
| Partes de speaking | ≥ 3 | 3 (partes 1, 2 y 3), 18 consignas | `speaking.ts` |
| Estrategias | 4 | 4 | `strategies.ts` |
| Grupos de recursos | 5 | 5 (20 entradas) | `resources.ts` |
| Textos del documento del plan | bloque A, examen, metas | bloque A, formato de C1 Advanced, 4 metas | `plan-doc.ts` |
| Semanas | 4 × 5 días | 4 semanas, 20 días | `weeks.ts` |

### Autocomprobación (AUTO): qué se comprobó y cómo

Hecho con un script temporal (fuera del repositorio) que importa los módulos de `src/data/b2c1/` y con una segunda lectura a ciegas de las claves.

| Paso de AUTO | Qué se hizo | Resultado |
|---|---|---|
| 1. Clave, opción múltiple | Los 92 ítems de opción múltiple (30 de diagnóstico, 40 drills, 12 de lectura, 10 de escucha) se volvieron a resolver mirando solo enunciado y opciones, sin la clave, y el resultado se comparó con el archivo por script. | 92 de 92 coinciden. Durante la redacción se cambiaron varios distractores que admitían una segunda lectura defendible. Los que aún pueden discutirse están abajo. |
| 1. Clave, respuesta escrita | Las 24 transformaciones, los 24 huecos y los 10 ítems de word formation se releyeron insertando cada variante en la frase. Por script: cada variante de transformación tiene de 3 a 6 palabras (contracción = 2) y contiene la palabra clave. | Sin fallos. Se añadieron variantes en t1, t7 y w5 en la segunda pasada. |
| Reparto de la posición correcta | Por script. | Diagnóstico A 6 · B 8 · C 8 · D 8. Drills por unidad: entre 2 y 3 por posición. Lecturas: 1-2-1-2 cada una. Audios: 4-3-3 en total. |
| 2. Nivel CEFR | Juicio del redactor, ítem a ítem, contra el inventario C1 del spec (AC-16, AC-17). **No se ha consultado el English Vocabulary Profile ni ninguna lista externa.** | Ver dudas de nivel abajo. |
| 3. No reutilizado | Por script contra todos los archivos de `a2b1` y `b1b2`: los 120 términos de tarjeta contra los 959 términos de las otras rutas; las seis primeras palabras de 246 enunciados (diagnóstico, drills, transformaciones, word formation, ejemplos de tarjetas, preguntas de lectura y de escucha); títulos de lecturas, audios y clozes; raíces y respuestas de word formation. Dentro de la ruta: términos repetidos entre los dos mazos. | Primera pasada: 4 términos de tarjeta repetidos (`broadly speaking`, `bitterly disappointed`, `set a precedent`, `bring about`), 3 raíces de word formation (`COMMIT`, `CONSIST`, `LEAD`) y 3 arranques de pregunta de lectura. Todos sustituidos. Segunda pasada: sin coincidencias. Quedan 4 términos **parecidos** (no iguales), listados abajo. |
| 4. Sin datos inventados | Relectura de lecturas, audios, clozes y ejemplos. | Sin cifras estadísticas ni citas atribuidas a personas reales. Las lecturas son ensayos de opinión con ejemplos hipotéticos. Dos puntos a mirar, abajo (cloze 1 y título del documental). |
| 5. Idioma y compilación | Explicaciones en español; por script, las únicas etiquetas usadas son `<b>` e `<i>` y están balanceadas. `npm run check`. | Ver «Comprobación de tipos». |
| Recuento de palabras | Por script. | Lecturas 630 y 638. Modelos de writing 257, 259 y 257 contando título y epígrafes (rango 220–260). |
| Coherencia del plan | `buildDays` de `schedule.ts` sobre las 4 semanas. | 20 días: 4 lección, 5 consolidación, 2 lectura, 2 escucha, 3 writing, 3 speaking, 1 repaso, 0 simulacro. Use of English: 7 días de transformaciones, 2 de cloze, 2 de word formation. Lecturas 0 y 1, audios 0 y 1, tareas `wr1`–`wr3` y partes `sp1`–`sp3`, todo dentro de rango. Los días de gramática llevan todos bloque de Use of English. |

Gramática de referencia de las cuatro unidades (tarea 7.3–7.6): Hewings, *Advanced Grammar in Use* (unidades de inversión, de «it» y «what» como foco, de condicionales y de modales) y Swan, *Practical English Usage* (entradas de inversión, cleft sentences, `if`, `may/might`, `need`). **Citadas de memoria: no se tuvo el libro delante y no se dan números de unidad por eso.**

### Comprobación de tipos

`npm run check` (astro check, 163 archivos): **3 errores, 0 avisos, 10 pistas**. Los tres errores están en `tests/selector-ruta.test.mts` (`textoConfirmar`, `opciones` y `avisos` no exportados por `src/scripts/selector-ruta.ts`): son de la feature del selector, que otro agente está escribiendo, y no de este contenido. **Ningún diagnóstico en `src/data/b2c1/`.** `tsconfig.json` incluye `**/*`, así que los archivos nuevos se comprueban aunque nadie los importe.

`npm run test:plan` sigue en verde para las dos rutas actuales, pero **no cubre `b2c1`**: el validador recorre `TRACK_META` y la ruta no está registrada. La validación real de la ruta es la tarea 8.2.

### Para revisión humana prioritaria

Uso variable, donde la clave sigue la norma del examen y no todo hablante estaría de acuerdo:

| Archivo | Ítem | Duda |
|---|---|---|
| `grammar.ts` | `g1`, drill 4 | `Hardly… than` se da por incorrecto (clave: `when`). Se oye en la práctica; la explicación lo dice. |
| `grammar.ts` | `g2`, drill 8 y trampa de `g2`; `diagnostic.ts` `d12` | It-cleft con `where`, `when` o `how` tratado como no normativo. Existe en el habla. La regla ya dice `that`, `who` con personas y `which` posible con cosas. |
| `grammar.ts` | trampa de `g2` | `The reason… is because` descrito como corriente al hablar y no esperado en texto formal. |
| `grammar.ts` | trampa de `g4` | Afirma que `must not have` como deducción negativa es normal en inglés americano. Confirmar la redacción. |
| `diagnostic.ts` | `d2` | `It's high time` + presente se oye; la clave exige pasado. |
| `diagnostic.ts` | `d18` | Subjuntivo tras `recommend that`; la explicación menciona `should be published` como alternativa británica, que no está entre las opciones. |

Distractores que conviene mirar por si admiten otra lectura:

| Archivo | Ítem | Duda |
|---|---|---|
| `grammar.ts` | `g3`, drill 9 | Opción `is` (`If the committee is to vote today… would`): incoherente de tiempos, no agramatical del todo. |
| `grammar.ts` | `g4`, drill 5 | Opción `must have told`: se descarta por sentido, no por forma. |
| `grammar.ts` | `g4`, drill 9 | La clave `couldn't have written` frente a `may have written`: se descarta por sentido. |
| `reading.ts` | pregunta 3 | Opción B («too expensive to design») se apoya en una frase del texto sobre el coste de vigilar. Es el distractor más cercano a la clave. |
| `listening.ts` | `a1`, pregunta 4 | Opción A («the reason he changed career») no se afirma en el audio, pero un oyente puede inferirla. |

Respuestas escritas:

| Archivo | Ítem | Duda |
|---|---|---|
| `uoe.ts` | `t2`, `t3`, `t23` | Se aceptan variantes con contracción (`wasn't`, `needn't`, `can't`) en las que la palabra clave queda dentro de la contracción. Decidir si se admiten. |
| `uoe.ts` | `t3` | Se acepta también `did not need to print` (ver «Correcciones tras la verificación independiente»). |
| `uoe.ts` | `t6` | Cinco variantes de modal (`must`, `should`, `may`, `can`, `is… to`). |
| `uoe.ts` | `t20` | Variante `reason for the talks failing was`: correcta pero poco natural. |
| `uoe.ts` | cloze 1, hueco 1 | Cuatro respuestas aceptadas (`yet`, `but`, `though`, `although`): hueco poco discriminante. |
| `uoe.ts` | cloze 2, hueco 8 | `free from` y `free of`. |
| `uoe.ts` | `w5` | Se acepta singular y plural. |
| `uoe.ts` | `w3`, `w4`, `w6` | `prohibitively`, `irreconcilable`, `baseless`: pueden ser C2 más que C1. |

Nivel y parecido de las tarjetas (`decks.ts`):

| Punto | Detalle |
|---|---|
| Transcripciones | Las 120, sin contrastar con diccionario. Mirar sobre todo los términos de varias palabras (acento principal) e `inextricably`, que admite dos acentuaciones. |
| Posible nivel B2 | A juicio del redactor: `raise concerns`, `pose a threat`, `bridge the gap`, `at the expense of`, `on the verge of`. A juicio del verificador independiente: `point to`, `set out`, `account for`, `the tip of the iceberg`, `a blessing in disguise`, `step down`, `live up to`. Se dejan como están hasta que decida el revisor. |
| Posible nivel C2 | `tease out`, `whittle down`, `a moot point`, `toe the line`, `scant regard`. |
| Parecidos a tarjetas de B1 → B2 | `painfully aware` (allí `fully aware`), `breach an agreement` (allí `reach an agreement`), `come across as` (allí `come across`), `come in for` (allí `come in`). No son el mismo término; decidir si se mantienen. |

Alcance de las unidades frente a B1 → B2 (AC-16): las tareas 7.3 a 7.6 fijan temas que B1 → B2 ya toca (`g17` inversión y clefts, `g5` condicionales, `g7` modales de deducción). Aquí se tratan con más alcance (ver la tabla de `programa-tramo-1.md`) y sin repetir ninguna frase, pero el revisor debe confirmar que no se considera «repetir el alcance».

Datos del mundo, escritos de memoria y sin red:

| Archivo | Punto |
|---|---|
| `plan-doc.ts` | Formato de C1 Advanced (duraciones, número de partes y preguntas, 220–260 palabras, aprobado en 180, certificado B2 entre 160 y 179) y el «alrededor del 60 %». **Sin fecha de consulta: no se consultó la página oficial.** |
| `plan-doc.ts` | Metas de los controles (40 %, 50 %, 60 %): propuestas a partir del supuesto S-11 del plan (180 ≈ 56 % en la escala de la app). Es una decisión del dueño. |
| `resources.ts` | Títulos y descripciones de libros y programas (C1 Advanced Trainer «seis exámenes, los dos primeros guiados»; The Official Cambridge Guide to IELTS; In Our Time). Sin enlaces, como en las otras rutas, así que no hubo enlaces que comprobar. |
| `strategies.ts` | Nombres de pódcast y publicaciones recomendados; el reparto de tiempo sugerido (30–35 minutos para las cuatro primeras partes) es un consejo, no un dato oficial. |
| `writing.ts` | `wr1`: las instrucciones siguen el formato estándar del essay del examen («discussing TWO of the ways… you may, if you wish…»); el tema, las notas y las opiniones son propios. Confirmar que ese marco no cuenta como texto copiado (AC-27). |
| `writing.ts` | `wr3`: el modelo reseña un documental inventado, «The Night Shift». Puede existir una obra real con ese título; si molesta, cambiarlo. |
| `uoe.ts` | Cloze 1: «shops selling fountain pens are reported to be doing well» es una afirmación vaga sin fuente. |
| `speaking.ts` | La parte 2 no tiene imágenes: cada consigna describe tres situaciones con palabras. |

Decisión de diseño que el dueño debería conocer: seis ítems del diagnóstico (`d22`–`d26`, `d28`) preguntan expresiones que luego enseñan los mazos (`shed light on`, `fierce`, `fly in the face of`, `phase out`, `boil down to`, `at odds with`). Las frases son distintas, pero quien repita el diagnóstico tras estudiar los mazos partirá con ventaja en esos ítems.

Sigue sin verificarse contra una fuente externa (lo confirma también el verificador independiente):

| Qué | Contra qué |
|---|---|
| Las 120 transcripciones de `decks.ts` | Un diccionario de pronunciación |
| Las reglas y trampas de `g1`–`g4` | Una gramática de referencia, con el libro delante |
| El formato del examen de `plan-doc.ts` y lo que dicen de él `strategies.ts`, `writing.ts` y `speaking.ts` | La página oficial de Cambridge |
| El nivel CEFR de tarjetas, ítems y raíces de word formation | El English Vocabulary Profile |

### Huecos para quien ensamble la ruta (fase 8)

- **Tipos.** Todo usa los tipos que ya existen en `src/data/types.ts`. `lvl` es `string`, así que `"C1"` compila sin tocar `Level`. No se ha inventado ningún tipo. `plan-doc.ts` declara en línea las mismas formas que `BLOQUES`, `EXAMEN` y `METAS` tienen en `scripts/exportar-plan.mts`, porque esos tipos no están en `types.ts`.
- **Exportaciones.** `DIAG` · `GRAM` · `DECKS` · `TRANS`, `CLOZE`, `CLOZE2`, `WFORM` · `READTEXT` (`reading.ts`) y `READ2` (`reading2.ts`) · `LISTENING` · `RUBRIC`, `WRITING` · `SPEAK` · `STRATS` · `RES` · `WEEKS` · `BLOQUES_C1`, `EXAMEN_C1`, `METAS_C1` (`plan-doc.ts`, solo para el exportador).
- **Ensamblado.** No hay `drills2`, `decks2` ni `decks3`: `grammar: GRAM` y `decks: DECKS` directamente. Los mazos ya traen `cat`, así que `armarMazos` no hace falta (si se usa, `armarMazos(DECKS, {}, [])` respeta el `cat`). `clozes: [CLOZE, CLOZE2]`, `mocks: []`, `readingCount: 2`, y `cargarLecturas()` devuelve `[READTEXT, READ2]`. `lecturasNumeradas` no aplica.
- **Ids.** Unidades `g1`–`g4`; mazos `c1col` y `c1phr`; tareas `wr1`–`wr3`; partes `sp1`–`sp3`; audios `a1` y `a2`; transformaciones `t1`–`t24`; word formation `w1`–`w10`; diagnóstico `d1`–`d30`.
- **Orden de las transformaciones.** No es temático a propósito: la vista del plan elige con `(día × 3 + k) % total` y el orden actual hace que las lecciones de los días 1, 6 y 11 reciban solo ítems de su unidad. **Si se añaden o reordenan transformaciones, ese reparto cambia.** El detalle día a día está en `programa-tramo-1.md`. El día 16 (lección de modales) recibe sobre todo repaso; alinearlo exige cambiar la vista, no los datos.
- **Clozes.** Con dos clozes, `día % 2` hace que los días 7 y 17 abran el cloze 2 (huecos 10–12 y 1–3, y huecos 4–9). El cloze 1 solo se ve en el módulo de Use of English. `CLOZE2.parts` empieza con una cadena vacía porque el texto arranca con un hueco.
- **Word formation.** Ningún día de gramática lo usa; va en el bloque corto de Use of English de los dos días de escucha (`uoe: "wform"` en un día `escucha`, que el tipo `DaySpec` permite).
- **Simulacro.** Ningún día tiene `focus: "simulacro"` y la ruta no tiene simulacros.
- **Validador (6.x).** Reglas que la ruta incumplirá por ser incompleta y que el plan ya prevé omitir: 24 semanas, 120 días, mínimos de 10 lecturas y 6 escuchas. «Toda unidad se enseña» y «todo mazo se programa» sí se cumplen con lo publicado.
- **Diagnóstico y drills.** `d16` tiene como clave `didn't need to finish` (el contraste con `needn't have`, visto desde el otro lado). `t3` acepta cuatro variantes y `t14` una sola.
- **Test 8.3.** Debe contar una contracción como dos palabras al medir las transformaciones; si no, `needn't have printed` daría 3 y seguiría pasando, pero conviene que mida igual que el examen.
- **Exportador (6.5).** `BLOQUES_C1` solo tiene el bloque A; los bloques B, C y D llegan con el tramo 2.
- **`revision.json` (8.4).** Archivos de contenido que necesitan entrada: `diagnostic.ts`, `grammar.ts`, `decks.ts`, `uoe.ts`, `reading.ts`, `reading2.ts`, `listening.ts`, `writing.ts`, `speaking.ts`, `strategies.ts`, `resources.ts`, `plan-doc.ts`, `weeks.ts`.

### Lo que queda

1. Comprobaciones externas de 7.3–7.8 y 7.14 (gramática de referencia, diccionario de pronunciación, página oficial de Cambridge). Las puede hacer el revisor de la fase 9 con esta lista.
2. Cerrar 7.16 cuando `npm run check` esté en verde (depende de la feature del selector) y lo anterior esté hecho.
3. Fases 8 a 10, que son de otro agente o del revisor humano.

## Correcciones tras la verificación independiente — 2026-10-10

El verificador no encontró ninguna clave errónea ni regla falsa; pidió las correcciones siguientes, todas aplicadas en `src/data/b2c1/`.

| Archivo | Ítem | Cambio |
|---|---|---|
| `uoe.ts` | `CLOZE2` hueco 5 | Acepta `since` y `ago`. |
| `uoe.ts` | `CLOZE` hueco 5, `t21` | La explicación dice por qué cabe `which` (foco = sustantivo de cosa). |
| `uoe.ts` | `w9` | Frase nueva: «To describe the losses as 'modest' was an ___». Respuesta única `understatement`: el artículo `an` excluye `misstatement` y el sentido excluye `overstatement`. Cambia la forma pedida (sustantivo en vez de gerundio). |
| `uoe.ts` | `t3` | Primera frase: «You printed the documents, but it wasn't necessary: I had copies.» Se añaden `did not need to print` y `didn't need to print`. |
| `uoe.ts` | `t22`, `t20`, `t7`, `t1` | Variantes añadidas: `all that is needed is`; `reason for the talks' failure was`; `little did we expect`; `what angered (the) residents the most` (5 y 6 palabras). |
| `uoe.ts` | `t14` | Queda una sola variante, `were the council to decide to`. Se quitan las dos que perdían «decide»; la forma con `if` que lo conserva tendría 7 palabras. |
| `diagnostic.ts` | `d12` | Ítem nuevo (foco adverbial de modo: «It was by sheer chance ___») y explicación coherente con `g2`: `that`, `who` con personas, `which` posible con cosas, nunca `when`, `where` ni `how`. |
| `diagnostic.ts` | `d14`, `d15`, `d16`, `d17` | Frases y distractores nuevos para que no se respondan recordando el drill: `d14` pregunta la forma tras «Were the trustees…»; `d15` la preposición de «If it hadn't been ___»; `d16` el contraste `didn't need to` / `needn't have` en un contexto donde la acción no se hizo; `d17` `could well have been` frente a `must have been`. |
| `diagnostic.ts` | `d30` | Explicación separada por grupos de verbos. La clave no cambia. |
| `grammar.ts` | `g2` regla, trampa y drill 8 | Sin «siempre that»: mismo criterio que `d12`. El drill 8 explica por qué `which` no cabe con foco adverbial. |
| `grammar.ts` | `g3` trampa | «unless no equivale a if… not en la mayoría de las condiciones irreales». |
| `decks.ts` | `a moot point` | Nota de uso sobre el sentido americano en el campo de significado. |
| `listening.ts`, `strategies.ts` | `a1` (`kind`), comentario de cabecera, estrategia de listening | Dicen que el formato de práctica es de 5 preguntas de 3 opciones y que la Part 3 real tiene 6 de 4. |
| `writing.ts`, `speaking.ts` | `RUBRIC` Content; `sp1` consejo 5; `sp3` consejo 1 | «suele penalizarse» en lugar de afirmaciones absolutas sobre la puntuación oficial. |
| `reading.ts`, `resources.ts` | pregunta 5; In Our Time | Opciones con punto final; «unos 45 minutos». |

Razonamiento de `t3`: con la primera frase nueva queda dicho que los documentos se imprimieron. `needn't have printed` es la forma que lo expresa sin ambigüedad, pero `didn't need to print` no afirma lo contrario: solo deja abierto si la acción ocurrió, y el contexto lo resuelve. Es gramatical, conserva el sentido y un estudiante la dará, así que se acepta. Es coherente con `g4`, que dice que `didn't need to` «normalmente» indica que no se hizo, y con `d16`, donde el contexto (`instead`) sí excluye `needn't have`.

Reverificación: los cinco ítems nuevos del diagnóstico se resolvieron otra vez a ciegas y coinciden con la clave; las posiciones correctas no cambian (A 6 · B 8 · C 8 · D 8). Las variantes nuevas de transformación tienen de 3 a 6 palabras y contienen la palabra clave. La búsqueda de duplicados contra `a2b1` y `b1b2` sigue sin coincidencias. `npm run check`: 0 errores, 0 avisos, 0 pistas.
