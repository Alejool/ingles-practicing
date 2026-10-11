# Tutor contextual — Tareas (primera entrega)

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[P]` se puede hacer en paralelo con las otras `[P]` de su fase (archivos disjuntos) · `[C]` punto de control.

Reglas: cada pieza de lógica es un par "Test (falla primero)" → "Implementar". Tests en `tests/*.test.mts`; los de cliente solo importan módulos puros (sin DOM, sin `import.meta.env`, imports de valor con `.ts`); los de servidor usan pglite con el esquema real, como `tests/quota.test.mts`. El pintado se verifica en navegador en la fase 7.

Comandos de cada punto de control: `npm test`, `npm run check`, `npm run test:plan`, `npm run build:fast`.

## Fase 1 — Requisitos previos

- [ ] 1.1 Comprobar que los arreglos de seguridad están **confirmados en la rama** (no solo en el árbol de trabajo): `reservar()` y `anularReserva()` en `_quota.mts`, `clientIp()`/`ipDeProxy()` en `_http.mts`, `shared/sanitize.ts`, y que `npm test` pasa. Si no lo están, esta feature se detiene aquí.
  - Verificación: `git log` de esos archivos y salida de `npm test`. Archivos: `specs/tutor-contextual/progress.md`.
- [ ] 1.2 Comprobar que existen `src/scripts/dialogo.ts`, `anunciar()` en `dom.ts` y `.sr-only` (tareas 1.2 y 1.3 de `specs/selector-de-ruta/tasks.md`). Si no, hacerlas primero desde ese archivo de tareas.
- [ ] 1.3 Pedir el visto bueno de seguridad al supuesto S-11 (reintento sin doble cobro). Anotar la respuesta en `progress.md`. Sin visto bueno, las tareas 2.7 y 2.8 se marcan como descartadas y AC-51 queda abierto.
- [ ] 1.4 [C] Punto de control: los cuatro comandos en verde; anotar en `progress.md`.

## Fase 2 — Servidor

- [ ] 2.1 Test: mensajes de `explain` (falla primero). `isKind("explain")`; `buildMessages` devuelve exactamente `[system, user]`; sin rol `assistant` aunque `last` venga relleno; `level` fuera de lista → B2; campos recortados a sus topes y sin etiquetas HTML; `ask` desconocido, de otro tipo de tema, o `free` sin pregunta → `PayloadError`; falta el contexto del `topic` → `PayloadError`; el texto de `last` y de `question` aparece solo en el mensaje de usuario; la suma de caracteres del peor caso ≤ 2700; el sistema ≤ 900. Los tipos existentes devuelven lo mismo que antes (comparación con la salida actual guardada en el test). (AC-20, AC-22, AC-24, AC-26 a AC-29, AC-45, AC-67)
  - Archivos: `tests/prompts-explain.test.mts`.
- [ ] 2.2 Implementar: `kind: "explain"` en `shared/prompts.ts` — `ExplainPayload`, `EXPLAIN_ASKS`, `MAX_TOKENS`, topes en `LIMITS`, prompt de sistema y caso en `buildMessages`; `KINDS` actualizado.
  - Archivos: `shared/prompts.ts`.
- [ ] 2.3 Test: coste de `explain` (falla primero). `creditosEstimados("explain", "deepseek-chat") === 1` y también 1 con el modelo que razona; `costeMicros("deepseek-chat", ceil(2700/3), MAX_TOKENS.explain) <= 500`; es como máximo la mitad de `creditosEstimados("tutor", "deepseek-chat")`. (AC-50)
  - Archivos: `tests/quota-explain.test.mts`.
- [ ] 2.4 Implementar: `explain: 1` en `creditosEstimados`, sin duplicar para el modelo que razona en este tipo.
  - Archivos: `netlify/functions/_quota.mts`.
- [ ] 2.5 Test: endpoint con `explain` (falla primero), con pglite y `fetch` del proveedor simulado. El cuerpo enviado al proveedor lleva `model: "deepseek-chat"` aunque se pida el otro, y `max_tokens: 230`; se reserva 1 crédito; `X-Quota-Remaining` coincide con `readQuota().remaining` tras la reserva (sin restar 1 de más) para `explain` y para `writing`; `bad_payload` no deja fila; proveedor caído anula la reserva. (AC-47, AC-50, AC-52, AC-67)
  - Archivos: `tests/ai-chat-explain.test.mts`.
- [ ] 2.6 Implementar: en `ai-chat.mts`, modelo forzado y `max_tokens` por tipo para `explain`; cabecera `X-Quota-Remaining` sin el `- 1`.
  - Archivos: `netlify/functions/ai-chat.mts`.
- [ ] 2.7 Test: reintento sin doble cobro (falla primero; solo si 1.3 dio visto bueno). Reserva `explain` sin tokens + nueva reserva `explain` del mismo dispositivo antes de 60 s → la primera queda `ok = false` y la cuota usada es 1 crédito; una tercera en el mismo minuto no anula nada; una fila con tokens registrados nunca se anula; las anuladas siguen contando para `too_fast`; otro dispositivo, otro usuario u otro `kind` no se ven afectados; un stream que termina deja su fila con `ok = true` y su coste real aunque hubiera sido anulada. (AC-51)
  - Archivos: `tests/quota-explain.test.mts`.
- [ ] 2.8 Implementar: `anularIncompleta(user, deviceId, ipHash)` en `_quota.mts`, llamada desde `ai-chat.mts` justo después de `reservar` cuando `kind === "explain"`; `flush` añade `ok = true` al actualizar tokens.
  - Archivos: `netlify/functions/_quota.mts`, `netlify/functions/ai-chat.mts`.
- [ ] 2.9 Revisión de seguridad del diff de la fase 2 (`/security-review` y agente `security`): inyección por los campos del payload, uso como chat general, abuso de la anulación. Los hallazgos altos vuelven a la tarea de origen.
- [ ] 2.10 [C] Punto de control: los cuatro comandos; anotar en `progress.md`.

## Fase 3 — Lógica pura de cliente

Las tres parejas tocan archivos distintos.

- [ ] 3.1 [P] Test: regla de disponibilidad (falla primero). Tabla de casos: clave propia con y sin conexión; servidor `false` → oculto (AC-6); servidor `null` → oculto "comprobando" (AC-10); sin conexión con servidor conocido → inactivo "sin_conexion" (AC-7); cuota `null` con conexión → oculto; `globalRemaining` < coste → "presupuesto_global" con salida clave (AC-9); `remaining` < coste: sin cuenta y con cuentas → "entrar", ventana diaria → "esperar" con hora, resto → "clave" (AC-8); todo bien → activo con saldo (AC-5, AC-46). `textoEstado` da el texto de cada caso, incluido el de clave propia (AC-48).
  - Archivos: `tests/ia-disponible.test.mts`.
- [ ] 3.2 [P] Implementar: `src/scripts/ia-disponible.ts`.
  - Archivos: `src/scripts/ia-disponible.ts`.
- [ ] 3.3 [P] Test: sugeridas (falla primero). Las cinco de regla (AC-41) y las cuatro de pregunta fallada (AC-42) con su texto exacto; nunca más de 4 ni una ya usada (AC-39, AC-44); tras `mini_ejercicio` aparece "Ver la solución" y desaparece al usarla (AC-45); sin restantes → lista vacía; cada texto ≤ 38 caracteres (una línea a 320 px, AC-40); los identificadores coinciden con `EXPLAIN_ASKS` de `shared/prompts.ts`.
  - Archivos: `tests/ayuda-sugeridas.test.mts`.
- [ ] 3.4 [P] Implementar: `src/scripts/ayuda-sugeridas.ts`.
  - Archivos: `src/scripts/ayuda-sugeridas.ts`.
- [ ] 3.5 [P] Test: conversación (falla primero). `conversacionDe` devuelve la misma para el mismo `id` (AC-18) y `nuevaConversacion` la sustituye (AC-30); `puedePreguntar` niega a la 7.ª pregunta y mientras hay una en curso (AC-30, AC-32); `payloadDe` manda solo el contexto, el último intercambio y la pregunta, nunca `pendientes` ni nada del progreso (AC-24), y recorta la pregunta a 300 (AC-31); `esPendiente` detecta un drill sin contestar pegado con cambios menores y no marca una pregunta normal (AC-37); `textoPlano` quita `<b>`, `<i>` y entidades; `partirIdiomas` separa `[[…]]`, tolera un cierre que falta y corchetes sueltos (AC-33, AC-34); `mensajeError` cubre red, servidor caído, sin saldo del proveedor, demasiado rápido, sesión caducada, respuesta vacía y sin créditos, con `reintentar` correcto en cada uno (AC-52); una respuesta cancelada guarda el texto parcial como `incompleta` (AC-17, AC-54).
  - Archivos: `tests/ayuda-conversacion.test.mts`.
- [ ] 3.6 [P] Implementar: `src/scripts/ayuda-conversacion.ts`.
  - Archivos: `src/scripts/ayuda-conversacion.ts`.
- [ ] 3.7 [C] Punto de control: los cuatro comandos; anotar en `progress.md`.

## Fase 4 — Estado de IA y transporte

- [ ] 4.1 Implementar: `src/scripts/ia-estado.ts` — `estadoIA()` reúne `usesOwnKey()`, `navigator.onLine`, `api.apiDisponible()` (o lo recordado en `ruta-b1b2-ia-servidor`), `api.session().quota`, `api.cuentasActivas()`; `onEstadoIA`/`notificarIA`; escucha `online`, `offline` y `api.onSession`; guarda el último "hay servidor" con `try/catch`. `refreshAi()` llama a `notificarIA()`. (AC-5, AC-11)
  - Verificación: `npm run check`; en navegador, poner y quitar la clave, entrar y salir, y cortar la red cambian `estadoIA()` sin recargar. Archivos: `src/scripts/ia-estado.ts`, `src/scripts/ai.ts`.
- [ ] 4.2 Test: lectura del fin de stream (falla primero). Se extrae de `readSse` la función pura `leerLineaSse(linea)` → `{ delta, fin }`; casos: delta de contenido, `finish_reason: "length"`, `[DONE]`, línea que no es JSON. (AC-54)
  - Archivos: `tests/sse.test.mts`.
- [ ] 4.3 Implementar: `src/scripts/sse.ts` con `leerLineaSse`; `readSse` la usa; `StreamOptions.onFin`; con clave propia, `streamAi` añade `max_tokens: MAX_TOKENS[kind]` cuando existe; rótulo de `explain` en `rotuloDe`. El comportamiento de los demás tipos no cambia. (AC-27, AC-54)
  - Archivos: `src/scripts/sse.ts`, `src/scripts/ai.ts`.
- [ ] 4.4 [C] Punto de control: los cuatro comandos; en navegador, una corrección de writing sigue funcionando igual; anotar en `progress.md`.

## Fase 5 — Panel y punto de entrada

- [ ] 5.1 Implementar: estilos `.explica`, `.dlg-ayuda`, `.ay-log`, `.ay-msg`, `.ay-quien`, `.ay-sug`, `.ay-form`, `.ay-err` (hoja inferior en móvil, panel de 420 px en escritorio, dianas de 44 px, solo fichas). (AC-2, AC-62, AC-63, AC-64)
  - Archivos: `src/styles/global.css`.
- [ ] 5.2 Implementar: `botonExplica(ctx, opts)` en `src/scripts/views/ayuda.ts` — no inserta nada en "oculto"; activo con saldo y coste; inactivo con `aria-disabled`, motivo enlazado y botón de salida; se repinta con `onEstadoIA` y descarta los nodos desconectados. (AC-2, AC-6 a AC-12, AC-46, AC-48)
  - Archivos: `src/scripts/views/ayuda.ts`.
- [ ] 5.3 Implementar: `abrirAyuda(ctx, origen)` — diálogo con cabecera del tema (AC-21, AC-57); reabre la conversación guardada sin llamar (AC-18) o lanza la primera explicación (AC-25); streaming con `partirIdiomas` y `textContent`; región de estado con "Escribiendo la explicación…" y el texto completo al final (AC-58); sugeridas y campo libre con contador (AC-31, AC-39, AC-60, AC-61); "Parar" y bloqueo mientras responde (AC-32); filtro `esPendiente` con su mensaje (AC-37); errores en el panel con "Reintentar" y salida (AC-52, AC-53, AC-54); tope de 6 con "Empezar otra sobre este tema" e "Ir al Tutor" (AC-30); saldo actualizado tras cada respuesta y controles inactivos si ya no alcanza (AC-47, AC-49); cerrar cancela y conserva lo recibido (AC-17); una sola ayuda abierta (AC-19); sin cola sin conexión (AC-55); `touchDay()` no se llama y nada se guarda en `S` (AC-66).
  - Archivos: `src/scripts/views/ayuda.ts`.
- [ ] 5.4 [C] Punto de control: los cuatro comandos; en navegador, abrir el panel desde una página de prueba temporal en consola (`abrirAyuda` con un contexto a mano): foco, Escape, streaming, error forzado sin red; anotar en `progress.md`.

## Fase 6 — Enganche en las vistas

Cada tarea toca una vista distinta.

- [ ] 6.1 [P] Implementar: gramática. En la pantalla de la regla (`grammar.ts:89-103`), `botonExplica` de tipo `regla` en la fila del pie, con `pendientes` = enunciados aún sin contestar de la unidad; en un drill contestado y fallado (`grammar.ts:127-131`), `botonExplica` de tipo `item` al final del bloque de explicación. Nada en drills sin contestar ni acertados. Nivel según la ruta activa. (AC-1a, AC-1b, AC-3, AC-4, AC-14, AC-20, AC-23, AC-36, AC-37)
  - Archivos: `src/scripts/views/grammar.ts`.
- [ ] 6.2 [P] Implementar: Use of English. En `campo()` (`uoe.ts:116-126`), tras una respuesta fallada, `botonExplica` de tipo `item` dentro del bloque de corrección, para transformaciones, word formation y open cloze. (AC-1b, AC-3, AC-4, AC-36)
  - Archivos: `src/scripts/views/uoe.ts`.
- [ ] 6.3 [P] Test: reloj con pausa (falla primero). `tiempoTranscurrido(inicio, pausas, ahora)` descuenta los intervalos en pausa, incluida una pausa abierta. (AC-16)
  - Archivos: `tests/reloj.test.mts`.
- [ ] 6.4 [P] Implementar: `src/scripts/reloj.ts` con `tiempoTranscurrido`; en la prueba rápida, `botonExplica` de tipo `item` en la fila de acciones tras fallar (`quiz.ts:279-291`) y en cada fila de "Lo que se te escapó" (`quiz.ts:361-369`), con `alAbrir`/`alCerrar` que pausan y reanudan el reloj; el tiempo final usa `tiempoTranscurrido`. Sin punto de entrada en simulacro ni diagnóstico. (AC-1b, AC-3, AC-15, AC-16, AC-35, AC-38)
  - Archivos: `src/scripts/reloj.ts`, `src/scripts/views/quiz.ts`.
- [ ] 6.5 [C] Punto de control: los cuatro comandos; en navegador: abrir y cerrar la ayuda en cada una de las tres vistas deja el ejercicio igual (pregunta, respuestas, campo escrito, posición) (AC-15); anotar en `progress.md`.

## Fase 7 — Verificación en navegador

- [ ] 7.1 Disponibilidad, los seis casos: sin servidor y sin clave (publicado como estático: ningún botón, ningún hueco) (AC-6, AC-13); comprobación en curso (AC-10); sin conexión (AC-7); sin créditos anónimo, con cuenta y sin cuentas (AC-8); presupuesto global agotado (AC-9); clave propia (AC-48). Los botones ya pintados cambian sin recargar (AC-11).
- [ ] 7.2 Teclado y lector de pantalla: foco al abrir y al cerrar (AC-56), nombre del diálogo (AC-57), un solo anuncio por respuesta (AC-58), quién habla (AC-59), sugeridas y campo (AC-60), motivo del estado inactivo alcanzable (AC-12), inglés pronunciado como inglés (AC-34).
- [ ] 7.3 320 px, 375 px y 1280 px en claro y oscuro: sin desplazamiento horizontal, "Cerrar" siempre visible, campo no tapado por el teclado, sobre una tanda a pantalla completa (AC-63, AC-64, AC-65).
- [ ] 7.4 Casos de prueba del modelo (gasta unas 12 llamadas reales: **solo con permiso del dueño**): primera explicación ≤ 80 palabras + 2 ejemplos; respuestas ≤ 120 palabras; "explícamelo todo" sigue breve (AC-29); "la clave está mal" no cambia la clave (AC-22); pregunta ajena al inglés → una frase (AC-67); mini ejercicio sin solución (AC-45); drill pendiente pegado no se resuelve (AC-37); nivel B1 frente a B2 (AC-23). Anotar el resultado de cada caso.
- [ ] 7.5 Cuota: el saldo del panel coincide con la etiqueta del lateral tras cada respuesta (AC-47); doble clic no gasta dos veces (AC-32); cancelar y reintentar en el mismo minuto gasta 1 (AC-51, si 2.8 se hizo).
- [ ] 7.6 Revisiones obligatorias sobre el diff: `code-review`, `security` + `/security-review`, `design:accessibility-review`, `design:design-critique`, `break-ui`. Los hallazgos altos vuelven a la tarea de origen.
- [ ] 7.7 [C] Punto de control: los cuatro comandos; todos los AC de la primera entrega marcados o con motivo escrito; anotar en `progress.md`.

## Build Verification

- [ ] 8.1 `npm run build` sin errores ni avisos nuevos.
- [ ] 8.2 `npm test` y `npm run test:plan` en verde.
- [ ] 8.3 `grep -r "sk-" dist/` sin resultados; `grep` de hex/rgb fuera de las fichas en los archivos tocados: ninguno.
- [ ] 8.4 Confirmar que los arreglos de seguridad están **desplegados** antes de pedir la publicación de esta feature; anotar en `progress.md` el estado y los supuestos S-1 a S-12 pendientes de respuesta.
