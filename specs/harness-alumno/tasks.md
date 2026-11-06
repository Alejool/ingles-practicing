# Harness del alumno — Tareas

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[P]` paralelizable con las otras `[P]` de su fase (archivos disjuntos) · `[C]` punto de control · **[AUT]** necesita autorización humana explícita (migraciones fuera de la base de test, gasto real, instalar dependencias en el front, refactor de código vanilla, cambios en `docker/`).

Orden de ejecución: fases 0 a 10, después 12 (memoria semántica) y 13 (bienvenida), y por último 11 (llamadas reales y cierre). Las fases 12 y 13 se añadieron el 2026-11-05 (decisiones del dueño: cuenta obligatoria sin clave propia, y embeddings locales + pgvector).

Reglas: cada pieza es "Test (falla primero)" → "Implementar". Backend: `backend/tests/Unit/Learner` (sin base, `FakeChatModel`, `FrozenClock`) y `backend/tests/Feature/Learner` (Postgres `ruta_test`). Front: `frontend/tests/*.test.mts` (`node:test`, solo módulos puros); los componentes se verifican en navegador en la fase 10. Ninguna prueba automática llama a DeepSeek salvo `tests/Live` con `HARNESS_LIVE_TESTS=1`.

Comandos de cada punto de control:
- `docker compose -f docker/compose.yml run --rm api php artisan test`
- `npm test`, `npm run check`, `npm run test:plan`, `npm run build:fast` en `frontend/`
- `npm run test:contract` contra el stack `docker/` (la paridad de backend-separado no puede romperse)

## Fase 0 — Requisitos previos

- [ ] 0.1 Comprobar: `backend-separado` en su punto de control final (o al menos 5.5 si el front aún no se ha movido; entonces las rutas `frontend/…` se leen como raíz), servidor de `tutor-contextual` hecho en Laravel, `tracks.json` exportado con las tres rutas (C1 fase 1). Si falta algo, se para.
  - Archivos: `specs/harness-alumno/progress.md`.
- [ ] 0.2 [C] Línea base: los tres comandos en verde; anotar.

## Fase 1 — Datos

- [ ] 1.1 Test (falla primero): `Feature/Database/HarnessMigrationTest` (DDL dentro de una transacción con `ROLLBACK`) — tras `migrate`, existen `harness_runs` y `learner_events` con columnas, `check` (incluido el tipo `bienvenida` en las dos), índices únicos parciales (también `learner_events_bienvenida_uq`) y FKs del plan; borrar un usuario borra sus filas de las dos tablas y nada más; las siete tablas base no cambian (`SchemaParityTest` sigue verde).
- [ ] 1.2 Implementar: migraciones `2026_11_20_000001_create_harness_runs_table` y `…000002_create_learner_events_table` (solo `create`; `down()` vacío: ningún `DROP`).
  - Archivos: `backend/database/migrations/*.php`.
- [ ] 1.3 Test: `Architecture/AppendOnlyTest` declara `learner_events` y `harness_runs` (la fase 12 añade `content_chunks` y `learner_memories`): falla si cualquier archivo de `backend/src`, `backend/app` o `backend/database` contiene `update`/`delete`/`drop` sobre ellas (SQL o constructor de consultas). Autocomprobación con un fixture que viola la regla.
- [ ] 1.4 **[AUT]** (En el despliegue del harness, no aquí.) Ejecutar estas dos migraciones en producción. Queda escrito en `DESPLIEGUE.md`.
- [ ] 1.5 [C] Punto de control.

## Fase 2 — Límites y esquemas

- [ ] 2.1 [P] Test (falla primero): `Unit/Learner/LimitsTest` — cada variable ausente, vacía, no numérica, ≤ 0 y por encima del máximo cae al defecto; valores válidos se respetan; `HARNESS_ENABLED` solo `true` activa. (AC-15)
- [ ] 2.2 [P] Implementar: `Harness\Limits`, `RunKind`, `StopReason`; entradas en `config/ruta.php` y `backend/.env.example`.
- [ ] 2.3 [P] Test (falla primero): `Unit/Learner/SchemaCheckerTest` — cada palabra clave del subconjunto (tipo, requeridos, `additionalProperties:false`, `enum`, longitudes, patrón, rangos, `items`, tamaños de lista, `const`); error con ruta del campo (`contenido.items[2].o`); una palabra clave no soportada en un esquema hace fallar `SchemaCatalogTest` (recorre `ToolSchemas` y `OutputSchemas`).
- [ ] 2.4 [P] Implementar: `Schema\Checker`, `Schema\ToolSchemas` (seis), `Schema\OutputSchemas` (explicación, rechazo, contenido por tipo de ejercicio).
- [ ] 2.5 [P] Test (falla primero): `Unit/Learner/ToolArgsTest` — por herramienta: argumentos de más, de menos, tipo equivocado, `enum` fuera de candidatos. (AC-11, AC-23)
- [ ] 2.6 [P] Test (falla primero): `Unit/Learner/ExerciseRulesTest` y `ExerciseSchemaTest` — opciones repetidas, `a` fuera de rango, opción vacía, nivel distinto del foco, `apunta_a` ausente del perfil, saneado de `e` y textos; las tres formas coinciden con ejemplos reales de `resources/content/b1b2.json`. `ProposalRulesTest` — solo dos tipos, día dentro de los próximos 7 y de la ruta, ref existente, `efecto` redactado por PHP. (AC-28, AC-33 a AC-36)
- [ ] 2.7 [P] Implementar: `Schema\ExerciseRules`, `Schema\ProposalRules`.
- [ ] 2.8 [C] Punto de control.

## Fase 3 — Eventos del alumno

- [ ] 3.1 Caracterización (sin código de producción): con el contenido exportado y un progreso real anonimizado, fijar el formato de `ref` (`gram:<unidad>`, `gram:<unidad>:<i>`, `vocab:<mazo>:<i>`, lecturas, escucha), la forma de `progress.gram` y la de `tracks[ruta].diag` (respuestas → área de cada pregunta; el contenido exportado debe traer el área por pregunta del diagnóstico, AC-77). Anotar en `progress.md`; si hay que extender `exportar-contenido.mts` (lista de refs), se hace aquí con su test.
- [ ] 3.2 Test (falla primero): `Unit/Learner/AnswerEventTest` — invariantes (área de la lista, `dada` solo si `ok` falso y ≤ 80, ref con patrón, fecha recortada a [−30 d, +5 min], `clientId` con el patrón de `DeviceId`).
- [ ] 3.3 Implementar: `Events\AnswerEvent`, `Events\EventKind`.
- [ ] 3.4 Test (falla primero) Feature: `IngestEventsTest` — lote válido → 200 `{aceptados, duplicados}`; reenvío → todo duplicados, sin filas nuevas; un evento inválido o con ref inexistente en la ruta → 422 `bad_events` con índice y motivo, **ninguna** fila; > 100 eventos o > 32 KB → 422/413; sin sesión 401; con `HARNESS_ENABLED=false` **sigue aceptando** (los datos no dependen del agente, S-12). Más `IsolationTest` (parte de eventos). (AC-1, AC-2, AC-4, AC-20)
- [ ] 3.5 Implementar: `LearnerEventRepository` (insert con `on conflict do nothing`, consultas por usuario/tipo/ventana), `ContentIndex`, `IngestEvents`, `IngestEventsRequest`, middleware `HarnessEnabled` (solo para `POST /api/harness/runs`), `EventsController`, `StatusController` (`{ agente }`), rutas.
- [ ] 3.6 [C] Punto de control.

## Fase 4 — Perfil, guía y resumen

- [ ] 4.1 [P] Test (falla primero): `Unit/Learner/StartingPointTest` — desde progresos de ejemplo (vacío, solo `stats`, completo, con rutas sin datos, **solo diagnóstico**, **diagnóstico + progreso local subido**): valores esperados, diagnóstico convertido en aciertos/preguntas por destreza; sin textos del cuaderno de errores. (AC-21, AC-77)
- [ ] 4.2 [P] Implementar: `Profile\StartingPoint`, `ProgressReader`.
- [ ] 4.3 [P] Test (falla primero): `Unit/Learner/ProfileDeriverTest` — cada regla del plan (ventana, bandas, unidad débil, recurrente N = 3 en 14 días, vocabulario dominado, constancia, margen, datos suficientes, **puntos fuertes**, **origen** de cada dato: refs ≤ 5, respuestas, última fecha, `partida:<ruta>`); `WeeklySeriesTest` — 12 semanas ISO, semanas vacías `sin_datos`, cambio de año, misma regla de banda; determinismo con los mismos eventos en distinto orden. (AC-22, AC-78)
- [ ] 4.4 [P] Implementar: `Profile\LearnerProfile`, `Profile\ProfileDeriver`, `Profile\WeeklySeries` y el agregado semanal en `LearnerEventRepository`.
- [ ] 4.5 [P] Test (falla primero): `Unit/Learner/GuideTest` — tono, nivel, siguiente paso por cada rama; foco de `explicar` con y sin relación; candidatos de `revisar_plan` (exclusión de refs recientes, máximo 2, ninguno → sin modelo); foco de `ejercicios` por prioridad y `sin_datos`. (AC-25, AC-28, AC-35)
- [ ] 4.6 [P] Implementar: `Guide\Guide`, `Guide\Focus`.
- [ ] 4.7 [P] Test (falla primero): `Unit/Learner/ContextBuilderTest` y `UntrustedTest` — perfil enorme → ≤ `HARNESS_CONTEXT_TOKENS` (estimación caracteres/3); orden de prioridad al recortar; nunca el JSON de progreso, correos ni ids; la relación del foco llega; respuesta correcta de un ítem solo con `respuestaDada`; delimitadores y caracteres de control quitados del texto no fiable. (AC-9, AC-14, AC-26)
- [ ] 4.8 [P] Implementar: `Harness\ContextBuilder`, `Harness\Untrusted`, `Harness\Prompts`.
- [ ] 4.9 Test (falla primero) Feature: `GET /api/learner/perfil` (crea el punto de partida una sola vez y deja `progress` idéntica byte a byte; perfil con `evolucion`, `fuertes` y `origen`, y siguiente paso; vacío → `datosSuficientes:false`; responde igual con `HARNESS_ENABLED=false`) — `ProfileEvolutionTest` y `GET /api/learner/exportar` (todo lo del usuario, nada de otro, sin prompts). (AC-2, AC-21, AC-24, AC-39, AC-78)
- [ ] 4.10 Implementar: `GetProfile`, `ExportLearnerData`, `ProfileController`, `ExportController`, rutas.
- [ ] 4.11 [C] Punto de control.

## Fase 5 — Bucle

- [ ] 5.1 Test (falla primero): `Unit/Learner/RunLoopTest` con `FakeChatModel` programable y `FrozenClock` — `max_pasos` (pide herramientas sin parar; nunca más de `HARNESS_MAX_STEPS` ejecuciones ni más de `+1` llamadas), `tiempo` (llamada lenta abortada; resultado parcial válido conservado), `presupuesto` (costes simulados; la guarda mira lo estimado de la siguiente), "último turno" con `tool_choice` forzado, herramienta desconocida/no ofrecida/nombre parecido (cuenta como paso, error estructurado, registrada), argumentos inválidos, salida final inválida (descartada, motivo `error`), `rechazo_tema` (sin herramientas), terminal correcta → `fin`, máximo una observación por ejecución, error del proveedor → `error`. (AC-5, AC-6, AC-7, AC-10, AC-11, AC-12, AC-13)
- [ ] 5.2 Implementar: `Harness\RunLoop`, `RunResult`, `Tool` (puerto), `ToolCall`, `ToolResult`, `RunContext`.
- [ ] 5.3 Test (falla primero): `Unit/Learner/InjectionTest` — casos conocidos en `pregunta`, en `respuestaDada` y en una observación guardada, con un modelo simulado que obedece: mismas herramientas ofrecidas, mismos `enum`, mismos límites, nada escrito fuera de lo normal. (AC-14)
- [ ] 5.4 Implementar lo que 5.3 descubra (solo en `Untrusted`, `Prompts` o `RunLoop`).
- [ ] 5.5 Test (falla primero): `Unit/Learner/CostModelTest` — con los valores por defecto y precios de `PRICE_HARNESS_*`, el peor camino de cada tipo (tabla del plan) ≤ `HARNESS_MAX_CREDITS`; topes de salida por tipo; `RunRequestTest`: cuerpo enviado al modelo (`HARNESS_MODEL`, `thinking` desactivado, `response_format` sin herramientas, sin `user`). (AC-7, AC-45)
- [ ] 5.6 Implementar: `DeepSeekClient::complete()` (timeout = tiempo restante, solo HTTP) y la entrada de precio de `HARNESS_MODEL` en `Pricing`.
- [ ] 5.7 [C] Punto de control.

## Fase 6 — Herramientas

- [ ] 6.1 [P] Test (falla primero) + implementar: `ReadProfileTool`, `ReadProgressTool` (secciones, ≤ 250 tokens, solo la ruta activa y el usuario del contexto).
- [ ] 6.2 [P] Test (falla primero) + implementar: `SearchContentTool` — solo la ruta activa, ≤ 3 resultados, extractos ≤ 400; nunca otra ruta, la web ni la base. (AC-38)
- [ ] 6.3 [P] Test (falla primero) + implementar: `RecordObservationTool` (evento pendiente de escribir, categoría cerrada, ≤ 200). (AC-23)
- [ ] 6.4 [P] Test (falla primero) + implementar: `ProposePlanTool` (candidatos de la guía en `enum`, `efecto` por PHP, tope de pendientes). (AC-28, AC-32)
- [ ] 6.5 [P] Test (falla primero) + implementar: `GenerateExerciseTool` (esquema por tipo, `ExerciseRules`, saneado, id de PHP). (AC-33 a AC-37)
- [ ] 6.6 Test: `IsolationTest` (parte de herramientas) — con dos usuarios, ninguna herramienta lee ni escribe del otro aunque el modelo pase ids en el texto. (AC-4)
- [ ] 6.7 [C] Punto de control.

## Fase 7 — Ejecución de punta a punta

- [ ] 7.1 Test (falla primero) Feature: `RunQuotaTest` — reserva `harness` de `HARNESS_MAX_CREDITS` antes de llamar; coste real al final; anulación sin llamadas (`sin_cambios`); sin créditos → mismo error de cuota que el chat y registro con motivo `cuota`; N ejecuciones concurrentes con cuota para una → una. (AC-8)
- [ ] 7.2 Test (falla primero) Feature: `RunLogTest` — un registro por motivo con todos los campos y sin prompts; `InterruptedRunTest` (excepción tras la reserva → fila `ai_usage` con coste, sin `harness_runs`); `PendingCapTest` (409 antes de reservar; recomprobación en la transacción). (AC-16, AC-17, AC-32)
- [ ] 7.3 Test (falla primero) Feature: `RunEndpointTest` — SSE con `estado`, `resultado` y `fin` en ese orden y con las formas del plan; errores previos como JSON; `resultado` solo tras guardar; `ExercisesPrivateTest`; `ProposalNoSideEffectTest`; `LogsTest` (log sin token, texto ni prompts). (AC-12, AC-29, AC-37, AC-42)
- [ ] 7.4 Implementar: `StartRun`, `HarnessRunRepository`, `StartRunRequest`, `RunController` (`StreamedResponse`), ruta.
- [ ] 7.5 Revisión de seguridad (`/security-review` + agente `security` + skill `claude-security`): inyección, aislamiento, cuota, logs, SSE. Hallazgos altos vuelven a su tarea.
- [ ] 7.6 [C] Punto de control.

## Fase 8 — Propuestas y ejercicios guardados

- [ ] 8.1 Test (falla primero) Feature: `DecideProposalTest` (aceptar/rechazar = evento nuevo; segunda decisión 409 `ya_decidida`; ajena o inexistente 404; decidida no vuelve a pendientes; aceptadas en `aceptadas`) y listados de propuestas y ejercicios (`GET /api/learner/ejercicios`, `/{id}` con 404 ajeno). (AC-4, AC-30)
- [ ] 8.2 Implementar: `ListProposals`, `DecideProposal`, `ListExercises`, `GetExercise`, `DecideProposalRequest`, controladores, rutas.
- [ ] 8.3 [C] Punto de control.

## Fase 9 — Admin

- [ ] 9.1 Test (falla primero) Feature: `HarnessReportTest` — `op=harness` con filtros de fecha y correo, totales, motivos, interrumpidas; el informe por defecto de `/api/admin` no cambia (contrato `admin` verde). (AC-18)
- [ ] 9.2 Implementar: consulta en `AdminQueries`, caso de uso `HarnessRunsReport`, rama `op=harness` en `AdminController`.
- [ ] 9.3 [C] Punto de control.

## Fase 10 — Frontend (React solo en `features/`)

Antes de construir: `frontend-design` y `emil-design-eng` (dirección dentro de los tokens existentes; sin rediseño).

- [ ] 10.1 **[AUT]** Instalar con versión exacta: `@astrojs/react@7.1.2`, `react@19.3.1`, `react-dom@19.3.1`, `@tanstack/react-query@5.106.0`, `zod@4.6.7`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`; integración de React en `astro.config.mjs`. Verificación: `npm run check` y `npm run build` sin errores ni avisos nuevos, y el bundle de las vistas existentes no crece (React solo en las islas).
- [ ] 10.2 [P] Test (falla primero): `frontend/tests/learner-schemas.test.mts` (Zod acepta las respuestas del contrato y rechaza formas rotas) y `harness-sse.test.mts` (parser puro: eventos partidos entre trozos, líneas desconocidas, `fin` siempre último, JSON inválido → error).
- [ ] 10.3 [P] Implementar: `features/learner/{schemas,types}`, `features/harness/{schemas,types}`, parser SSE en `harnessService.ts`.
- [ ] 10.4 [P] Test (falla primero): `frontend/tests/event-outbox.test.mts` — sin cuenta en el dispositivo no encola; **sin red o con la sesión caducada encola** y envía al volver red y sesión de esa cuenta; cada evento lleva `cuenta` y solo se envían los de la cuenta de la sesión; tope 500 FIFO; lotes de 100; mismo id no se duplica; 422 descarta el lote y lo anota; claves nuevas `ruta-b1b2-eventos` y `ruta-b1b2-aviso-harness` presentes en `CLAVES_POR_CUENTA` de `cuenta-local.ts` (archivadas como `…@<id>` al cambiar de cuenta; las claves existentes no cambian). (AC-3, AC-20, AC-79)
- [ ] 10.5 [P] Implementar: `eventOutbox.ts`, `learnerService.ts`, `harnessService.ts` (fetch), hooks (`useSession` sobre `api.onSession`, queries con `enabled: isSignedIn()`), las dos claves en `CLAVES_POR_CUENTA`.
- [ ] 10.6 **[AUT]** Caracterizar los reproductores de drills, lecturas y escucha: ¿se pueden montar en un contenedor dado con datos dados? Si hay que extraer una función exportada de `views/grammar.ts`/`reading.ts`/`listening.ts`, hacerlo sin cambiar comportamiento (verificado en navegador antes y después). Si exige reescribir, parar y decidir.
- [ ] 10.7 Implementar: gancho en `progress.ts` (`bump(area, ok, ref?, dada?)` → outbox si hay cuenta en el dispositivo, también offline; no depende de `HARNESS_ENABLED`), refs en `gradeCard`, `views/grammar.ts:132` y `views/plan.ts:90`.
- [ ] 10.8 Implementar: componentes (`LearnerIsland`, `ProfilePanel`, `WeeklyEvolution`, `SourceList` (origen de cada dato, AC-78), `NextStep`, `ProposalList`, `ProposalCard`, `ExerciseList`, `ExerciseHost`, `PlanAdjustments(Island)`, `PrivacyNotice`, `RunButton`, `RunProgress`), montaje de Mi seguimiento donde decida el dueño (`landing-y-acceso`, su pregunta 4) y en `Plan.astro`, puntos de entrada del agente solo con `agente:true`, selector de transporte en la superficie de TUT con caída al `explain` de siempre (test puro del selector, AC-27).
- [ ] 10.9 Verificación en navegador: sin red (estudio intacto, eventos en cola, ninguna petición), sesión caducada sin red (encola; al volver y entrar, se envía), otra cuenta en el mismo dispositivo (no ve ni envía lo de la anterior), agente apagado (Mi seguimiento sí, puntos de entrada del agente no), agente encendido; landing sin peticiones al harness; estados de carga, vacío, error y deshabilitado; teclado, lector de pantalla, tema claro y oscuro, 320 px; propuesta aceptada aparece en el Plan; ejercicio generado se abre con el reproductor existente. Revisiones: `design:design-critique`, `design:accessibility-review`, `break-ui`. (AC-3, AC-24, AC-31, AC-33, AC-44, AC-78, AC-79)
- [ ] 10.10 [C] Punto de control.

## Fase 12 — Memoria semántica (capacidad e)

Requisitos: fases 3 (eventos), 4 (resumen) y 6 (herramientas) cerradas. Tests unitarios con `FakeEmbedding` e `InMemoryVectorSearch`; los de grupo `embeddings` y `perf` corren en Docker con el contenedor real (sin coste, sin red externa tras descargar el modelo).

- [ ] 12.1 **[AUT]** Base local con pgvector: copia `pg_dump` de `ruta` y `ruta_test`; cambiar en `docker/compose.yml` la imagen de `db` de `postgres:17-alpine` a `pgvector/pgvector:0.8.6-pg17-bookworm` sobre el **mismo** volumen `db-data` (sin `initdb`, sin vaciar ni recrear). Verificación: `select version()` (17.x), `select * from pg_available_extensions where name = 'vector'` (0.8.6), `SchemaParityTest` y `npm run test:contract` en verde, recuento de filas de las siete tablas igual que antes.
- [ ] 12.2 **[AUT]** Servicio `embeddings` en `docker/compose.yml`: `ghcr.io/huggingface/text-embeddings-inference:cpu-1.9.4`, `--model-id intfloat/multilingual-e5-small --revision 614241f622f53c4eeff9890bdc4f31cfecc418b3`, volumen `embeddings-model`, sin puertos publicados, `mem_limit: 1536m`, healthcheck `/health`; `api` con `EMBEDDINGS_URL=http://embeddings:80` y `depends_on` no obligatorio; `php artisan learner:index-content` tras `migrate` en el perfil `local`. Verificación: `/health` desde `api`, RAM medida en reposo y con carga, anotada en `progress.md`.
- [ ] 12.3 Test (falla primero): `Feature/Database/MemoryMigrationTest` (DDL en transacción con `ROLLBACK`) — extensión `vector`, `content_chunks` y `learner_memories` con columnas, `vector(384)`, índices HNSW, GIN y únicos, FKs en cascada; `learner_memories` sin columna de texto; índice `learner_events_fts`; borrar un usuario borra sus memorias y nada más; las tablas anteriores no cambian. (AC-40, AC-75)
- [ ] 12.4 Implementar: migraciones `2026_11_20_000003_enable_pgvector`, `…000004_create_content_chunks_table`, `…000005_create_learner_memories_table`, `…000006_create_learner_events_fts_index` (solo `create`; `down()` vacío). Ampliar `AppendOnlyTest` con `content_chunks` y `learner_memories`.
- [ ] 12.5 [P] Test (falla primero): `LimitsTest` ampliado — `EMBEDDINGS_URL` vacío = desactivado; `EMBEDDINGS_QUERY_TIMEOUT_MS`, `EMBEDDINGS_INDEX_TIMEOUT_MS`, `HARNESS_RAG_TOP_K`, `HARNESS_RAG_MIN_SIM` fuera de rango → defecto. Implementar en `Limits`, `config/ruta.php`, `backend/.env.example`. (AC-73)
- [ ] 12.6 [P] Test (falla primero): `Unit/Learner/ContentChunkerTest` (fragmentos deterministas por tipo, refs válidas, texto ≤ 1 200, las tres rutas) y `MemoryTextTest` (solo `respuesta` fallada y `observacion`; respuesta dada ≤ 80; sin correo ni ids). Implementar `Memory\ContentChunker`, `Memory\MemoryText`.
- [ ] 12.7 [P] Test (falla primero): `Unit/Learner/TeiEmbeddingClientTest` (`Http::fake`: URL de config, cuerpo `inputs`/`normalize`/`truncate`, prefijos `query: `/`passage: `, 384 dimensiones, timeout y 5xx → `EmbeddingUnavailable`) y `Architecture/NoExternalEmbeddingsTest` (ningún otro cliente HTTP en `Learner`). Implementar `EmbeddingPort`, `TeiEmbeddingClient`, `FakeEmbedding`. (AC-74)
- [ ] 12.8 Test (falla primero): `Unit/Learner/RetrieverTest` con `FakeEmbedding` e `InMemoryVectorSearch` — top-k, umbral, orden por similitud, solo el usuario del contexto, versión actual o última indexada con refs filtradas, caída a texto completo (embedder caído, tiempo vencido, URL vacía), caída literal sin contenido indexado, `via` registrado. Implementar `VectorSearch`, `InMemoryVectorSearch`, `Retriever`. (AC-69, AC-72, AC-73)
- [ ] 12.9 Test (falla primero) Feature: `PgVectorSearchTest` y `FullTextFallbackTest` (contra `ruta_test`: aislamiento con dos usuarios de recuerdos casi iguales, filtro por modelo y versión), `IndexContentTest` (segunda ejecución sin filas nuevas; versión nueva = filas nuevas; fallo a mitad → ninguna fila) e `IndexMemoriesTest` (la ingesta responde antes de indexar; embedder caído → evento guardado y sin memoria; el lote siguiente la crea; log sin texto). Implementar `PgVectorSearch`, `FullTextSearch`, `MemoryRepository`, `IndexContent`, `IndexLearnerMemories`, comandos `learner:index-content` y `learner:index-memories`, `afterResponse()` en `IngestEvents` y `RecordObservationTool`. (AC-69, AC-71, AC-72, AC-75)
- [ ] 12.10 Test (grupo `embeddings` y `perf`, Docker con TEI real): `SemanticSearchTest` — conjunto fijo de ~20 consultas (español e inglés, incluida "me lío con el pasado y el present perfect") con la ref esperada entre los 5 primeros en ≥ 90 %; calibrar `HARNESS_RAG_MIN_SIM` y anotarlo. `RetrievalLatencyTest` — tres rutas indexadas, 10 000 recuerdos de un usuario y 50 000 de otros, 200 consultas: p95 < 150 ms y cero llamadas al `ChatModel`. Si falla: plan B del plan (búsqueda exacta por usuario), medir otra vez, anotar. (AC-68, AC-70)
- [ ] 12.11 Test (falla primero) + implementar: `SearchContentToolTest` semántico (consulta en español devuelve contenido en inglés de la ruta activa; nunca otra ruta) y `ContextBuilderTest::rag` (recuerdos primero, delimitados como no fiables, ≤ `HARNESS_RAG_TOP_K`, total ≤ `HARNESS_CONTEXT_TOKENS`); `CostModelTest` sigue verde sin cambios. Uso del `Retriever` en `SearchContentTool` y `ContextBuilder`. (AC-38, AC-68, AC-69, AC-73)
- [ ] 12.12 [C] Punto de control: los tres comandos de siempre + `php artisan test --group=embeddings,perf` en Docker; AC-68 a AC-75 revisados en `progress.md` con las medidas (latencia p95, RAM, tasa de acierto de AC-68).
- [ ] 12.13 **[AUT]** (En el despliegue, no aquí.) Producción: comprobar de solo lectura la versión de pgvector disponible en Neon (≥ 0.8.0); ejecutar las migraciones 000003–000006; desplegar el contenedor de embeddings en el VPS (imagen `cpu-1.9.4` o `cpu-arm64-1.9.4` según la máquina); `learner:index-content`. Queda escrito en `DESPLIEGUE.md`.

## Fase 13 — Bienvenida (fuente de `landing-y-acceso` AC-25)

Requisitos: fases 5 y 7 cerradas; `bienvenida.ts` de `landing-y-acceso` hecho (su fase 7).

- [ ] 13.1 Test (falla primero): `scripts/exportar-bienvenida.mts` ejecuta `bienvenida.ts` sobre una matriz de diagnósticos (todas las bandas, empates, las tres rutas) y escribe `backend/tests/fixtures/bienvenida.json`; `Unit/Learner/WelcomeGoldenTest` exige los mismos `datos` (niveles, tres puntos, día y bloques); un test `node:test` falla si el fixture no está al día. `WelcomeTest`: dos diagnósticos distintos → datos distintos. (AC-76)
- [ ] 13.2 Implementar: `Guide\Welcome`, `WelcomeData`.
- [ ] 13.3 Test (falla primero): `RunLoopTest::bienvenida` (sin herramientas ofrecidas: cualquier llamada a herramienta se rechaza; salida `{tipo:"bienvenida", texto ≤ 600}` validada; inválida → descartada, motivo `error`), `RunRequestTest` (`response_format` JSON, tope de salida 250), `CostModelTest` con la fila `bienvenida` ≤ `HARNESS_MAX_CREDITS`. (AC-5 a AC-12, AC-76)
- [ ] 13.4 Implementar: `RunKind::bienvenida`, prompt de `bienvenida` en `Prompts`, esquema en `OutputSchemas`.
- [ ] 13.5 Test (falla primero) Feature: `WelcomeEndpointTest` — `POST /api/learner/bienvenida`: con agente y cuota → `via:"modelo"`, una fila en `harness_runs` (`kind = bienvenida`) y un evento `bienvenida`; segunda llamada → `via:"guardada"` sin reserva ni llamada; modelo con salida inválida, sin cuota o `HARNESS_ENABLED=false` → `texto:null`, `via:"plantilla"`, sin evento; sin diagnóstico → 422 `sin_diagnostico` sin reservar; sin sesión 401; aislamiento entre usuarios. (AC-1, AC-2, AC-4, AC-76)
- [ ] 13.6 Implementar: `GetWelcome`, `WelcomeController`, ruta.
- [ ] 13.7 [P] Test (falla primero) + implementar: `learner-schemas.test.mts` acepta la respuesta de la bienvenida y rechaza formas rotas; `learnerService.bienvenida()` y `useWelcome`. El montaje en el paso 3 del onboarding es de `landing-y-acceso` (su fase 8): no se toca aquí.
- [ ] 13.8 [C] Punto de control: los tres comandos de siempre; AC-76 a AC-79 revisados en `progress.md`.

## Fase 11 — Llamadas reales y cierre

- [ ] 11.1 Test: `tests/Live/HarnessLiveTest` (grupo `live`, se salta sin `HARNESS_LIVE_TESTS=1`): ~11 casos — 3 de tema ajeno, 3 de inyección, 2 de explicación con error recurrente (una con recuerdo parecido recuperado), 2 de ejercicios (drill y lectura), 1 de bienvenida. Mide créditos, tasa de descarte y motivos.
- [ ] 11.2 **[AUT]** Ejecutar 11.1 con gasto real (≈ 10 llamadas, < 0,02 USD con la tabla de costes). Anotar resultados y coste real frente al modelo de coste; si el peor caso real supera 3 créditos, proponer ajuste de topes al dueño.
- [ ] 11.3 Revisión de código (`/code-review`, `/simplify`) del diff completo; hallazgos altos vuelven a su tarea.
- [ ] 11.4 [C] Punto de control final: backend, front y contrato en verde (más los grupos `embeddings` y `perf`); criterios AC-1 a AC-46 y AC-68 a AC-79 revisados uno a uno en `progress.md` con la tabla "Cambios respecto al spec"; `HARNESS_ENABLED` sigue en `false` por defecto; nada desplegado.

## Tareas que necesitan autorización humana

1.4 (migrar producción), 10.1 (dependencias nuevas en el front), 10.6 (posible refactor de código vanilla), 11.2 (gasto real en DeepSeek), 12.1 (cambiar la imagen de la base local), 12.2 (servicio nuevo en `docker/`), 12.13 (pgvector, tablas e indexado en producción).
