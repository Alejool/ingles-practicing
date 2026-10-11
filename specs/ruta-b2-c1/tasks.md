# Ruta B2 → C1 — Tareas (tramo 1)

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[P]` se puede hacer en paralelo con las otras `[P]` de su fase (archivos disjuntos) · `[C]` punto de control.

Reglas:
- Código: cada pieza de lógica es un par "Test (falla primero)" → "Implementar". Tests en `tests/*.test.mts`, solo sobre módulos puros (sin DOM, sin `import.meta.env`, imports de valor con `.ts`) o sobre funciones de servidor.
- Contenido: las tareas de redacción (fase 7) están separadas de las de código, una por tipo de contenido, y cada una termina con su **autocomprobación**. Ninguna edita `src/data/a2b1` ni `src/data/b1b2`.
- La ruta se ensambla como **borrador** y no se publica hasta el punto de control de revisión humana (fase 9).

Comandos de cada punto de control: `npm test`, `npm run check`, `npm run test:plan`, `npm run build:fast`.

Autocomprobación común de toda tarea de contenido (se cita como "AUTO"):
1. Clave verificada ítem a ítem: en opción múltiple, exactamente una opción correcta y cada distractor es incorrecto por una razón que se puede decir; en respuesta escrita, están todas las variantes aceptables; la explicación no contradice la clave.
2. Nivel CEFR: cada ítem es B2+ o C1 (ni B1, ni C2); la estructura o el léxico está en el inventario C1.
3. No reutilizado: ningún término, enunciado o título aparece en `src/data/a2b1` ni `src/data/b1b2` (búsqueda con `grep` de cada término de tarjeta y de las seis primeras palabras de cada enunciado), ni se repite dentro de la propia ruta.
4. Sin estadísticas precisas inventadas, sin citas atribuidas a personas reales, sin texto copiado de material de examen.
5. Explicaciones en español; inglés natural para un hablante nativo culto; el archivo compila (`npm run check`).
6. Anotar en `specs/ruta-b2-c1/progress.md`: archivo, número de ítems y dudas que el revisor debe mirar primero.

## Fase 1 — Lista única de rutas

- [ ] 1.1 Verificar la suite: `npm test` y `npm run test:plan` en verde sobre el árbol actual; medir y anotar la línea base de peso (`npm run build:fast`, tamaños gzip del esqueleto) para AC-41.
  - Archivos: `specs/ruta-b2-c1/progress.md`.
- [ ] 1.2 Test: lista de rutas (falla primero). `TRACK_IDS` contiene `a2b1`, `b1b2`, `b2c1`; `esTrackId` acepta esas y rechaza `""`, `"B1B2"`, `null`, `"zz99"`; `NIVEL_OBJETIVO` da B1, B2, C1.
  - Archivos: `tests/tracks.test.mts`.
- [ ] 1.3 Implementar: `shared/tracks.ts`; `src/data/types.ts` reexporta `TrackId` desde ahí y añade `"C1"` a `Level`; `src/scripts/state.ts` importa el tipo en vez de redefinirlo. Todavía sin ruta nueva en `TRACK_META`. (AC-1, AC-2)
  - Verificación: `npm run check` (los `Record<TrackId, …>` que queden incompletos se arreglan en las tareas que los poseen: 3.x, 6.x). Archivos: `shared/tracks.ts`, `src/data/types.ts`, `src/scripts/state.ts`.
- [ ] 1.4 [P] Implementar: `pulse.mts` usa `TRACK_IDS` en vez de `PISTAS`. (AC-38) — Archivos: `netlify/functions/pulse.mts`.
- [ ] 1.5 [P] Test: biblioteca por ruta (falla primero). Se extrae `rutaValida(v, porDefecto)` y el test comprueba que `b2c1` se conserva y que un valor desconocido cae al valor por defecto. Implementar en `readings.mts` usando `TRACK_IDS`. **Después** de que los arreglos de seguridad de ese archivo estén confirmados. (AC-38) — Archivos: `tests/readings-ruta.test.mts`, `netlify/functions/readings.mts`.
- [ ] 1.6 [C] Punto de control: los cuatro comandos; anotar en `progress.md`.

## Fase 2 — Datos guardados compatibles hacia delante

- [ ] 2.1 Test de caracterización: `migrate` hoy (se escribe y pasa **antes** de cambiar nada, exportando `migrate` sin modificar su cuerpo). Tres muestras en `tests/fixtures/`: formato antiguo de una ruta con `tasks`, dos rutas con progreso real, y vacío; se guarda la salida esperada. (AC-35)
  - Archivos: `tests/estado.test.mts`, `tests/fixtures/estado-antiguo.json`, `tests/fixtures/estado-dos-rutas.json`, `src/scripts/state.ts` (solo `export`).
- [ ] 2.2 Test: `migrate` conserva rutas que no conoce (falla primero). Con `tracks.b2c1` y con `tracks.zz99`: ambas sobreviven con su contenido; `track: "zz99"` cae a `b1b2`; `track: "b2c1"` se respeta; un valor de ruta que no es objeto se descarta; las muestras de 2.1 siguen dando lo mismo; un estado de dos rutas cargado y serializado no contiene `b2c1`. (AC-34, AC-35, AC-36)
  - Archivos: `tests/estado.test.mts`.
- [ ] 2.3 Implementar: `migrate()` nuevo en `state.ts`; el tipo de `AppState.tracks` admite más claves. `DEF` y `P()` no cambian de comportamiento.
  - Archivos: `src/scripts/state.ts`.
- [ ] 2.4 Test de caracterización: fusión hoy. Se mueve `mergeTrack`/`mergeState` a `src/scripts/merge.ts` sin cambiar una línea de lógica (`sync.ts` lo importa y lo reexporta) y se fija su resultado con dos estados de dos rutas. (AC-35)
  - Archivos: `tests/merge.test.mts`, `src/scripts/merge.ts`, `src/scripts/sync.ts`.
- [ ] 2.5 Test: fusión con rutas nuevas (falla primero). `b2c1` solo en remoto → aparece en el resultado; solo en local → se conserva; en ambos → se funde con las mismas reglas; `zz99` igual; el resultado de 2.4 no cambia; la ruta activa local no la pisa el remoto. (AC-36)
  - Archivos: `tests/merge.test.mts`.
- [ ] 2.6 Implementar: `mergeState` recorre la unión de claves.
  - Archivos: `src/scripts/merge.ts`.
- [ ] 2.7 Test: el servidor conserva rutas que no llegan (falla primero). `conservarRutas`: `previo` con `b2c1` y `entrante` sin ella → se conserva; `entrante` con `b2c1` → gana la entrante; `entrante` sin `tracks` (formato antiguo) → sin cambios; `previo` nulo → sin cambios; no muta sus argumentos. Y de extremo a extremo con pglite: PUT de tres rutas, PUT de dos con la versión correcta, GET devuelve las tres. (AC-37)
  - Archivos: `tests/progress.test.mts`.
- [ ] 2.8 Implementar: `conservarRutas` en `progress.mts` y su uso en el PUT (lee `data->'tracks'` junto a la versión; el `update` sigue condicionado a la versión).
  - Archivos: `netlify/functions/progress.mts`.
- [ ] 2.9 Revisión de seguridad del diff de `progress.mts` (`/security-review`): aislamiento por usuario y tamaño máximo intactos.
- [ ] 2.10 [C] Punto de control: los cuatro comandos; anotar en `progress.md` la tabla "qué se garantiza" del plan con el resultado de cada test.

## Fase 3 — Carga perezosa real

- [ ] 3.1 Implementar: eliminar `precargarOtras` (`src/data/tracks.ts:81-86`) y su llamada y comentario (`src/scripts/track.ts:29-35`). (AC-39, AC-40)
  - Verificación: `npm run check`; `grep precargarOtras` sin resultados. Archivos: `src/data/tracks.ts`, `src/scripts/track.ts`.
- [ ] 3.2 Test: reparto de bundles por ruta (falla primero). Con nombres y fragmentos reales de `dist/_assets` (`a2b1.HASH.js` que importa `./reading.HASH.js`, etc.): cada bundle de lecturas va a la ruta que lo importa; el bundle de la ruta va a su ruta; un bundle compartido no es contenido; un bundle de contenido sin ruta lanza error.
  - Archivos: `tests/precache.test.mts`.
- [ ] 3.3 Implementar: `scripts/precache-lib.mts` (`repartirContenido`, con los ids de `shared/tracks.ts`); `precache.mts` lo usa, escribe `CONTENT_BY_TRACK` además de `CONTENT_FILES` y falla si algo queda sin repartir.
  - Archivos: `scripts/precache-lib.mts`, `scripts/precache.mts`.
- [ ] 3.4 Implementar: `public/sw.js` — constante `CONTENT_BY_TRACK`; `WARM` con `tracks` opcional; mensaje `HAS`; en `activate`, copiar lo que conserva URL y volver a pedir el contenido de las rutas que estaban guardadas antes de borrar las cachés viejas. Se mantiene la exclusión de `/api/`. (AC-40, AC-42, AC-44)
  - Verificación: `npm run build:fast` y lectura de `dist/sw.js`; pruebas en navegador en 3.6. Archivos: `public/sw.js`.
- [ ] 3.5 Implementar: al cambiar de ruta con éxito y al arrancar, la app envía `WARM` con la ruta activa; "Descargar todo para sin conexión" sigue enviando `WARM` sin filtro. (AC-40, AC-42)
  - Archivos: `src/scripts/main.ts`, `src/scripts/views/settings.ts`.
- [ ] 3.6 Verificación en navegador (build de producción servido en local): tras 60 s en A2 → B1 no hay peticiones a bundles de otras rutas (pestaña Red) (AC-39); al cambiar de ruta se descarga solo esa; sin conexión, una ruta ya abierta funciona entera y una nunca abierta da el error en texto y deja la anterior (AC-42, AC-43); tras un build nuevo y "Actualizar", la ruta guardada abre sin conexión (AC-44). Anotar tamaños frente a la línea base (AC-41).
- [ ] 3.7 [C] Punto de control: los cuatro comandos; anotar en `progress.md`.

## Fase 4 — Nivel por ruta

- [ ] 4.1 Test de caracterización y de C1: `nivel.ts` (falla primero). Para `a2b1` y `b1b2`, `escalaDiagnostico`, `escalaSimulacro`, `nivelLecturaGenerada`, `palabrasTransformacion`, `semanaDeInicio` y `rutaRecomendada` devuelven exactamente lo que hoy calculan `progress.ts:131-133`, `mock.ts:308,325`, `reading.ts:256`, `uoe.ts:66`, `diagnostic.ts:159,224-243` y `onboarding.ts:165-171`. Para `b2c1`: supuestos S-11, S-12, S-13; `semanaDeInicio` nunca pasa de las semanas disponibles; `rutaRecomendada` no propone una ruta que no esté en `visibles`. (AC-21, AC-33)
  - Archivos: `tests/nivel.test.mts`.
- [ ] 4.2 Implementar: `src/scripts/nivel.ts`.
  - Archivos: `src/scripts/nivel.ts`.
- [ ] 4.3 [P] Implementar: `progress.ts` usa `escalaDiagnostico`. — Archivos: `src/scripts/progress.ts`.
- [ ] 4.4 [P] Implementar: `mock.ts` usa `escalaSimulacro` (y el título de la columna deja de decir solo "Cambridge" si la ruta es C1). — Archivos: `src/scripts/views/mock.ts`.
- [ ] 4.5 [P] Implementar: `reading.ts` usa `nivelLecturaGenerada`; `uoe.ts` usa `palabrasTransformacion`. — Archivos: `src/scripts/views/reading.ts`, `src/scripts/views/uoe.ts`.
- [ ] 4.6 Test: prompts con `target` (falla primero). Sin `target`, cada tipo existente devuelve exactamente los mensajes de hoy (salida actual guardada en el test); con `target: "C1"`: el texto base habla de C1, la versión modelo es "VERSIÓN C1", el speaking se evalúa como C1 Advanced; `target` fuera de lista → como ausente; `reading` con `level: "C1"` pide 4 párrafos de 130–160 palabras; ningún texto del cliente entra en el mensaje de sistema. **Después** del `kind: "explain"` de `specs/tutor-contextual` (mismo archivo). (AC-22)
  - Archivos: `tests/prompts-target.test.mts`.
- [ ] 4.7 Implementar: `target` en `shared/prompts.ts`; writing, speaking, tutor y cuaderno de errores lo envían con `NIVEL_OBJETIVO[S.track]`.
  - Archivos: `shared/prompts.ts`, `src/scripts/views/writing.ts`, `src/scripts/views/speaking.ts`, `src/scripts/views/tutor.ts`, `src/scripts/views/errors.ts`.
- [ ] 4.8 [C] Punto de control: los cuatro comandos; en navegador, las dos rutas actuales muestran los mismos textos de nivel que antes; anotar en `progress.md`.

## Fase 5 — Ruta incompleta en la app

- [ ] 5.1 Test: metadatos y avance (falla primero). `rutasVisibles(false)` no incluye borradores y `rutasVisibles(true)` sí; `metaDe` de una ruta borrador funciona; `avance` da "semana 3 de 4 disponibles" con `disponibles` y "semana 3 de 24" sin él; `finDeLoPublicado` es verdadero solo en una ruta incompleta con todos sus días hechos. (AC-29, AC-30, AC-32)
  - Archivos: `tests/tracks.test.mts`, `tests/nivel.test.mts`.
- [ ] 5.2 Implementar: `TrackMeta.disponibles` y `borrador`, `rutasVisibles` en `src/data/tracks.ts`; `avance` y `finDeLoPublicado` en `nivel.ts`; lectura de `ruta-b1b2-borradores` y del parámetro `?borradores=1` en `src/scripts/track.ts` (`verBorradores()`).
  - Archivos: `src/data/tracks.ts`, `src/scripts/nivel.ts`, `src/scripts/track.ts`.
- [ ] 5.3 [P] Implementar: plan. El calendario recorre `T().weeks.length` en vez de 24 y su rótulo lo dice (`plan.ts:385-388`); tarjeta "Hasta aquí llega lo publicado" con las tres salidas cuando `finDeLoPublicado`; el contador usa `avance`. `Plan.astro` y `Panel.astro` dejan de afirmar "120" y "24" en texto fijo (lo pinta el script). (AC-30, AC-32)
  - Archivos: `src/scripts/views/plan.ts`, `src/components/views/Plan.astro`, `src/components/views/Panel.astro`, `src/scripts/views/panel.ts`.
- [ ] 5.4 [P] Implementar: estados vacíos. Simulacro sin `mocks` → tarjeta que explica qué habrá y cuándo, sin botón de empezar (`mock.ts:33-37` deja de lanzar); series de Use of English con 0 ítems no se ofrecen. (AC-31)
  - Archivos: `src/scripts/views/mock.ts`, `src/scripts/views/uoe.ts` (coordinar con 4.4 y 4.5: mismas vistas, hacer después de ellas).
- [ ] 5.5 [P] Implementar: bienvenida y diagnóstico usan `rutasVisibles`, `rutaRecomendada` y `semanaDeInicio`; la tarjeta y la recomendación de una ruta incompleta llevan la marca "En construcción · N de 24 semanas"; "Día X de N" usa el total real. **Después** de la fase 5 de `specs/selector-de-ruta` (mismos archivos). (AC-1, AC-29, AC-33, AC-48)
  - Archivos: `src/scripts/views/onboarding.ts`, `src/scripts/views/diagnostic.ts`.
- [ ] 5.6 Implementar: el selector de ruta lista `rutasVisibles` (si `specs/selector-de-ruta` aún no está hecho, el selector actual de `nav.ts` muestra la tercera ruta con su marca en texto). (AC-1, AC-8)
  - Archivos: `src/scripts/views/selector.ts` o `src/scripts/nav.ts`.
- [ ] 5.7 [C] Punto de control: los cuatro comandos; anotar en `progress.md`.

## Fase 6 — Validador y exportador

- [ ] 6.1 Test: validador (falla primero), con rutas de juguete. Una ruta completa correcta no da fallos; cada regla actual sigue fallando con su caso (semana sin cinco días, unidad o mazo inexistente, día de gramática sin Use of English, audio sin guion, respuesta fuera de rango…); una ruta con `disponibles: 4` y 4 semanas correctas pasa y lista en `omitidas` las cuatro reglas que no se aplican; `disponibles` distinto de `weeks.length` falla; día que lleva a un bloque sin ítems, a una tarea o parte inexistente o a un simulacro sin `mocks` → fallo en la incompleta y aviso en la completa. (AC-7, AC-10)
  - Archivos: `tests/validar.test.mts`.
- [ ] 6.2 Implementar: `scripts/validar-lib.mts` con `validarRuta`; `validar-plan.mts` queda como CLI que recorre todas las rutas de `TRACK_META` (también borradores), imprime las reglas omitidas y sale con 1 si hay fallos.
  - Verificación: `npm run test:plan` da el mismo resultado que antes para las dos rutas actuales. Archivos: `scripts/validar-lib.mts`, `scripts/validar-plan.mts`.
- [ ] 6.3 Test: duplicados (falla primero). `duplicados` detecta un término de tarjeta repetido con otra ruta (sin distinguir mayúsculas ni espacios), un enunciado de drill, transformación o word formation repetido, un título de lectura o de audio repetido, y un término repetido entre dos mazos de la propia ruta; no marca coincidencias entre las dos rutas existentes. (AC-25, AC-26)
  - Archivos: `tests/validar.test.mts`.
- [ ] 6.4 Implementar: `duplicados` en `validar-lib.mts`; el CLI lo ejecuta para `b2c1` contra las otras.
  - Archivos: `scripts/validar-lib.mts`, `scripts/validar-plan.mts`.
- [ ] 6.5 Implementar: `exportar-plan.mts` recorre las rutas visibles; bloques sin semanas no se pintan; una ruta incompleta muestra sus semanas y "Semanas 5–24 · en preparación"; pestañas y memoria de la última vista para cualquier id de `TRACK_IDS`; títulos sin "dos rutas". Las entradas C1 de `BLOQUES`, `EXAMEN` y `METAS` las aporta la tarea de contenido 7.14. (AC-45, AC-46, AC-47)
  - Verificación: `npm run plan:export` genera el HTML; abrirlo y cambiar de pestaña con teclado. Archivos: `scripts/exportar-plan.mts`.
- [ ] 6.6 [C] Punto de control: los cuatro comandos; anotar en `progress.md`.

## Fase 7 — Contenido C1 (redacción)

Tareas de contenido, no de código. Todas son `[P]` entre sí (un archivo cada una) y pueden avanzar a la vez que las fases 2 a 6. Cada una termina con AUTO.

- [x] 7.1 [P] Programa del tramo: tabla de las semanas 1–4 (unidad, mazo, foco y bloque de Use of English de cada uno de los 20 días) y lista de qué material abre cada día. Es la referencia de las demás tareas; se revisa contra las semanas 1–4 de las rutas actuales para mantener el mismo reparto (4 unidades, 2 mazos, 7 días con transformaciones, 2–4 con cloze, 2 lecturas, 1–2 audios, 3 tareas de writing, 3 partes de speaking, ningún simulacro).
  - Archivos: `specs/ruta-b2-c1/programa-tramo-1.md`.
- [x] 7.2 [P] Diagnóstico: 30 ítems que discriminan entre B2 y C1, repartidos por área, con `lvl` y explicación en español. AUTO + comprobar el reparto de la posición correcta entre A–D. (AC-3)
  - Archivos: `src/data/b2c1/diagnostic.ts`.
- [~] 7.3 [P] Gramática, unidad 1 (inversión tras adverbiales negativos): regla, trampa del hispanohablante, 10 drills con explicación, `lvl` C1. AUTO + contrastar la regla con una gramática de referencia y anotar cuál. (AC-6, AC-16)
  - Estado: redactado y con la autocomprobación interna hecha. Falta una comprobación externa: la regla se contrastó de memoria con Hewings y Swan, sin el libro delante. Ver `progress.md`.
  - Archivos: `src/data/b2c1/grammar.ts` (unidad `g1`; el archivo lo crea esta tarea).
- [~] 7.4 Gramática, unidad 2 (cleft sentences): ídem. — Archivos: `src/data/b2c1/grammar.ts` (unidad `g2`; después de 7.3).
  - Estado: redactado y con la autocomprobación interna hecha. Falta una comprobación externa: ídem 7.3. Ver `progress.md`.
- [~] 7.5 Gramática, unidad 3 (condicionales mixtos y formales): ídem. — Archivos: `src/data/b2c1/grammar.ts` (unidad `g3`).
  - Estado: redactado y con la autocomprobación interna hecha. Falta una comprobación externa: ídem 7.3. Ver `progress.md`.
- [~] 7.6 Gramática, unidad 4 (modales de especulación en pasado): ídem. Comprobar que ninguna de las cuatro repite el alcance de una unidad de `b1b2/grammar.ts`. — Archivos: `src/data/b2c1/grammar.ts` (unidad `g4`).
  - Estado: redactado y con la autocomprobación interna hecha. Falta una comprobación externa: ídem 7.3. Ver `progress.md`.
- [~] 7.7 [P] Mazo 1 (colocaciones de registro formal y académico): 60 tarjetas `[término, transcripción, significado, ejemplo]`, `cat` explícito. AUTO + comprobar la transcripción de cada término contra un diccionario. (AC-6, AC-17)
  - Estado: redactado y con la autocomprobación interna hecha. Falta una comprobación externa: las transcripciones están escritas de memoria, sin contrastar con un diccionario. Ver `progress.md`.
  - Archivos: `src/data/b2c1/decks.ts` (el archivo lo crea esta tarea).
- [~] 7.8 Mazo 2 (phrasal verbs y expresiones idiomáticas de registro): 60 tarjetas. AUTO + ningún término repetido con el mazo 1. — Archivos: `src/data/b2c1/decks.ts` (después de 7.7).
  - Estado: redactado y con la autocomprobación interna hecha. Falta una comprobación externa: ídem 7.7. Ver `progress.md`.
- [x] 7.9 [P] Use of English: 24 transformaciones con palabra clave (respuesta de 3 a 6 palabras, todas las variantes aceptables), 2 open cloze de 12 huecos y 10 ítems de word formation, alineados con las cuatro unidades. AUTO + contar las palabras de cada respuesta. (AC-6)
  - Archivos: `src/data/b2c1/uoe.ts`.
- [x] 7.10 [P] Lectura 1: texto de 600–700 palabras, registro de prensa de calidad, 5–6 preguntas (inferencia, actitud del autor, vocabulario en contexto) con explicación. AUTO + contar palabras + cada respuesta se justifica con una línea del texto. (AC-6, AC-18, AC-27)
  - Archivos: `src/data/b2c1/reading.ts`.
- [x] 7.11 [P] Lectura 2: ídem, otro tema. — Archivos: `src/data/b2c1/reading2.ts`.
- [x] 7.12 [P] Escucha: 2 guiones (una entrevista larga con dos voces y un monólogo informativo), cada uno con contexto, hablantes y 5 preguntas de 3 opciones que piden opinión, actitud o propósito. AUTO + leer el guion en voz alta: frases que una voz sintética pueda decir sin ambigüedad. (AC-6, AC-19, AC-27)
  - Archivos: `src/data/b2c1/listening.ts`.
- [x] 7.13 [P] Writing y speaking: rúbrica con los cuatro criterios de C1 Advanced; 3 tareas de writing (essay obligatorio, proposal, review) con rango de palabras del examen, plan, banco de frases, lista de control y modelo; 3 partes de speaking (partes 1, 2 y 3 del examen) con tiempo, consejos, lenguaje y consignas. AUTO + contar las palabras de cada modelo contra su rango. (AC-4, AC-6, AC-20)
  - Archivos: `src/data/b2c1/writing.ts`, `src/data/b2c1/speaking.ts`.
- [~] 7.14 [P] Piezas fijas: 4 estrategias de examen, 5 grupos de recursos (enlaces comprobados uno a uno), y los textos C1 del documento del plan (bloque A, formato de C1 Advanced, metas de control). AUTO + verificar el formato del examen contra la página oficial de Cambridge y anotar la fecha de consulta. (AC-4, AC-45)
  - Estado: redactado y con la autocomprobación interna hecha. Falta una comprobación externa: sin red: el formato del examen y los títulos de los recursos no se han contrastado con las páginas oficiales; los recursos no llevan enlaces, como en las otras rutas. Ver `progress.md`.
  - Archivos: `src/data/b2c1/strategies.ts`, `src/data/b2c1/resources.ts`, `src/data/b2c1/plan-doc.ts`.
- [x] 7.15 Semanas 1–4: `WEEKS` con objetivo, unidad y mazo dominantes y cinco días por semana (título, foco, tarea de producción, bloque de Use of English en los días de gramática), según el programa de 7.1 y con el material ya escrito. Autocomprobación: cada día apunta a material que existe; ningún día de simulacro. (AC-5, AC-7)
  - Archivos: `src/data/b2c1/weeks.ts` (después de 7.2 a 7.14).
- [~] 7.16 [C] Punto de control de contenido: `npm run check`; todas las AUTO anotadas en `progress.md`; recuento por tipo frente a AC-3 a AC-6.
  - Estado: redactado y con la autocomprobación interna hecha. `npm run check` en verde (0 errores) tras las correcciones de la verificación independiente; faltan las comprobaciones externas de 7.3–7.8 y 7.14. Ver `progress.md`.

## Fase 8 — Ensamblado como borrador

- [ ] 8.1 Implementar: `src/data/b2c1/index.ts` (exporta `TRACK` con `mocks: []`, `readingCount: 2` y `cargarLecturas()`), entrada en `TRACK_META` con `disponibles: 4` y `borrador: true`, y sus cargadores en `CARGADORES` y `LECTURAS`. (AC-1, AC-2)
  - Archivos: `src/data/b2c1/index.ts`, `src/data/tracks.ts`.
- [ ] 8.2 `npm run test:plan`: la ruta incompleta pasa con sus reglas omitidas listadas y `duplicados` sin resultados. Cada fallo vuelve a la tarea de contenido que lo originó (no se corrige a mano aquí). (AC-7, AC-10, AC-25, AC-26)
- [ ] 8.3 Test: claves del contenido C1 (falla primero si hay errores). Recorre la ruta ensamblada: índice correcto dentro de rango en diagnóstico, drills, lecturas y audios; ninguna lista de respuestas vacía; cada transformación tiene de 3 a 6 palabras en todas sus variantes; cada mazo ≥ 60 tarjetas con sus cuatro campos; 30 ítems de diagnóstico; ≥ 10 drills por unidad; cada unidad con `lvl` C1. (AC-3, AC-6, AC-16, AC-24)
  - Archivos: `tests/contenido-c1.test.mts`.
- [ ] 8.4 Test: puerta de publicación (falla primero). Si la ruta `b2c1` no es borrador, `src/data/b2c1/revision.json` tiene una entrada por cada archivo de contenido (y por las entradas C1 del exportador) con `estado: "aprobado"`, revisor, fecha y la huella SHA-256 actual del archivo; mientras es borrador, el test pasa. Implementar el archivo `revision.json` con todas las entradas en `pendiente`. (AC-9, AC-23)
  - Archivos: `tests/revision-c1.test.mts`, `src/data/b2c1/revision.json`.
- [ ] 8.5 Verificación en navegador con `?borradores=1`: recorrer las 20 sesiones; cada paso abre material C1 real (AC-7); simulacro con su estado vacío (AC-31); al completar el día 20, la tarjeta de fin de lo publicado (AC-30); avance "de 4 disponibles" (AC-32); sin el interruptor, la ruta no aparece en ningún sitio. 320 px, teclado y ambos temas (AC-48).
- [ ] 8.6 Verificación de datos: estudiar en C1 no cambia el progreso de las otras rutas (AC-34); recargar, exportar e importar la copia y sincronizar entre dos navegadores con cuenta conservan C1 (AC-36); un build anterior a esta feature sincronizando con la misma cuenta no borra C1 del servidor (AC-37); lectura generada en C1 no aparece en otra ruta (AC-38).
- [ ] 8.7 Revisiones sobre el diff de código: `code-review`, `/simplify`, `design:accessibility-review`. Los hallazgos altos vuelven a la tarea de origen.
- [ ] 8.8 [C] Punto de control: los cuatro comandos; anotar en `progress.md`.

## Fase 9 — Revisión humana (bloquea la publicación)

- [ ] 9.1 Preparar el paquete de revisión: lista de archivos de `src/data/b2c1/` con su número de ítems, las dudas anotadas en cada AUTO, cómo ver la ruta en la app (`?borradores=1`) y la lista de control (clave única, variantes, nivel, naturalidad, explicación correcta según gramática de referencia, nada reutilizado, nada inventado).
  - Archivos: `specs/ruta-b2-c1/revision-tramo-1.md`.
- [ ] 9.2 **Revisión humana** por una persona con nivel C2 o docente (supuesto S-1): lee cada archivo, anota hallazgos por archivo y severidad. No la hace un agente.
- [ ] 9.3 Corregir los hallazgos: cada uno vuelve a la tarea de contenido de su archivo (7.x) y repite su AUTO; después se repiten 8.2 y 8.3.
- [ ] 9.4 El revisor firma en `revision.json` cada archivo aprobado (revisor, fecha, estado, huella del archivo tal como quedó). Los tipos de error encontrados se escriben en `revision-tramo-1.md` como lista de control para el tramo 2. (AC-9, AC-23, AC-28)
- [ ] 9.5 [C] **Punto de control de publicación**: todas las entradas de `revision.json` en `aprobado` y con la huella actual; sin hallazgos altos abiertos; los cuatro comandos en verde. **Si no se cumple, la fase 10 no empieza** y la ruta sigue como borrador.

## Fase 10 — Publicación

- [ ] 10.1 Implementar: quitar `borrador: true` de la ficha de `b2c1` (sigue `disponibles: 4`). El test 8.4 debe seguir en verde. (AC-8, AC-29)
  - Archivos: `src/data/tracks.ts`.
- [ ] 10.2 Implementar: README y textos de la app que dicen "dos rutas" o ponen B2 como techo (`README.md`, descripción de `index.astro`, comentario de cabecera de `tracks.ts`); regenerar `docs/plan-de-estudio.html` con `npm run plan:export`. Sin cambiar el nombre de la app. (AC-45, AC-49)
  - Archivos: `README.md`, `src/pages/index.astro`, `src/data/tracks.ts`, `docs/plan-de-estudio.html`.
- [ ] 10.3 Verificación en navegador sin el interruptor de borradores: la ruta aparece con su marca en bienvenida, selector y recomendación del diagnóstico (AC-1, AC-29, AC-33); elegirla avisa de que está incompleta; el peso inicial no sube más de 2 KB gz frente a la línea base de 1.1 (AC-41).
- [ ] 10.4 [C] Punto de control: los cuatro comandos; AC-1 a AC-10 y AC-16 a AC-49 marcados o con motivo escrito; anotar en `progress.md`.

## Build Verification

- [ ] 11.1 `npm run build` sin errores ni avisos nuevos; `dist/sw.js` contiene `CONTENT_BY_TRACK` con las tres rutas.
- [ ] 11.2 `npm test` y `npm run test:plan` en verde.
- [ ] 11.3 `git diff --stat -- src/data/a2b1 src/data/b1b2 db/schema.sql` vacío.
- [ ] 11.4 `grep` de hex/rgb fuera de las fichas en los archivos de `src/` tocados: ninguno.
- [ ] 11.5 Actualizar `progress.md`: estado final, supuestos S-1 a S-13 pendientes de respuesta, y la lista de control heredada para el tramo 2.
