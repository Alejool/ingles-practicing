# Selector de ruta — Tareas

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[P]` se puede hacer en paralelo con las otras `[P]` de su fase (archivos disjuntos) · `[C]` punto de control.

Reglas: cada tarea de lógica es un par "Test (falla primero)" → "Implementar". Los tests viven en `tests/*.test.mts` y solo importan módulos puros (sin DOM, sin `import.meta.env`, imports de valor con extensión `.ts`). Lo que es pintado se verifica en navegador en la fase 6.

Comandos de cada punto de control: `npm test`, `npm run check`, `npm run test:plan`, `npm run build:fast`.

## Fase 1 — Base común

- [x] 1.1 Verificar la suite: `npm test` y `npm run test:plan` terminan en verde sobre el árbol actual; anotar el resultado en `progress.md`. Si `npm test` falla por los arreglos de seguridad sin fusionar, parar y avisar.
  - Verificación: salida de ambos comandos. Archivos: `specs/selector-de-ruta/progress.md`.
- [x] 1.2 Implementar: región viva y utilidades. `anunciar(mensaje)` en `dom.ts` que escribe en `#anuncio`; `<div id="anuncio" class="sr-only" role="status">` en `Base.astro`; clase `.sr-only` en `global.css`. `toast()` llama además a `anunciar()`. (AC-10, AC-16)
  - Verificación: `npm run check`; en navegador, el nodo `#anuncio` recibe el texto de un toast. Archivos: `src/scripts/dom.ts`, `src/layouts/Base.astro`, `src/styles/global.css`.
- [x] 1.3 Implementar: `src/scripts/dialogo.ts` con `abrirDialogo()` (`showModal`, `aria-labelledby`, `aria-describedby`, Escape → `alCancelar`, foco al título, devolución de foco a `volverA`, respaldo en línea si no hay `showModal`) y estilos `.dlg` + `::backdrop`. (AC-29, AC-30, AC-32)
  - Verificación: `npm run check`; se verifica en navegador en 6.x. Archivos: `src/scripts/dialogo.ts`, `src/styles/global.css`.
- [x] 1.4 [C] Punto de control: `npm test`, `npm run check`, `npm run test:plan`, `npm run build:fast`; revisar marcas; anotar en `progress.md`.

## Fase 2 — Lógica pura

- [x] 2.1 [P] Test: registro de sesiones (falla primero). Declarar, sustituir, retirar con `null`, listar; `cerrarSesiones()` llama a todos los `cerrar()`, sigue si uno lanza y deja el registro vacío. (AC-19, AC-20, AC-22)
  - Archivos: `tests/sesion.test.mts`.
- [x] 2.2 [P] Implementar: `src/scripts/sesion.ts` hasta que 2.1 pase.
  - Archivos: `src/scripts/sesion.ts`.
- [x] 2.3 [P] Test: resumen de progreso (falla primero). `diaActual` (primer día sin hacer; todos hechos → último), `resumenProgreso` ("sin empezar" sin días, sin tarjetas y sin diagnóstico; "día 37 de 120"; ruta de 20 días → "día 3 de 20"; progreso `undefined`), no muta la entrada; `marcaConstruccion` (`disponibles: 4` → "En construcción · 4 de 24 semanas"; ausente → `null`); `etiquetaIndicador`. (AC-3, AC-8, AC-14, AC-35)
  - Archivos: `tests/selector-ruta.test.mts`.
- [x] 2.4 [P] Implementar: esas cuatro funciones en `src/scripts/selector-ruta.ts`.
  - Archivos: `src/scripts/selector-ruta.ts`.
- [x] 2.5 Test: máquina de estados (falla primero). abrir → lista; elegir la activa → cerrado sin cambios (AC-6); elegir otra → confirmar; confirmar sin casilla con sesión que se pierde → se ignora (AC-19); confirmar → cargando; en cargando se ignoran abrir/elegir/confirmar/cancelar (AC-16); fallo → error con `activa` intacta (AC-17); reintentar → cargando; cargada → cerrado con `activa` = elegida; cancelar desde lista, confirmar y error → cerrado (AC-9).
  - Archivos: `tests/selector-ruta.test.mts`.
- [x] 2.6 Implementar: `ESTADO_INICIAL` y `reducir`.
  - Archivos: `src/scripts/selector-ruta.ts`.
- [x] 2.7 Test: opciones y avisos (falla primero). `opciones` con dos y con tres rutas; marca de la activa; `disponible` falso solo si no está en memoria, no hay conexión y la caché dice que no (con caché `null` → disponible) (AC-18, S-7); `avisos` siempre incluye el de progreso y el de lo común (AC-7, AC-12), añade construcción si `disponibles` (AC-14), sesión con lo que se pierde y lo que se conserva (AC-19, AC-20), IA en curso (AC-21); `textoConfirmar` nombra el destino (AC-9).
  - Archivos: `tests/selector-ruta.test.mts`.
- [x] 2.8 Implementar: `opciones`, `avisos`, `textoConfirmar`.
  - Archivos: `src/scripts/selector-ruta.ts`.
- [x] 2.9 [C] Punto de control: los cuatro comandos; revisar AC-6, AC-7, AC-8, AC-9, AC-14, AC-16, AC-17, AC-18 contra los tests; anotar en `progress.md`.

## Fase 3 — Indicador y diálogo

- [x] 3.1 Implementar: marcado del lateral. `#trackPick` pasa dentro de `.brand`; en < 960 px `.brand` es una fila (marca a la izquierda, indicador a la derecha) y desaparece la franja; estilos `.ruta-ind`, `.ruta-lista`, `.ruta-op`, `.aviso`, `.ruta-acepto` con dianas de 44 px. Se retiran las reglas de `.trackpick button` que ya no aplican. (AC-1, AC-13, AC-26, AC-28, AC-34)
  - Verificación: `npm run build:fast`; captura a 320 px y a 1280 px. Archivos: `src/components/Rail.astro`, `src/styles/global.css`.
- [x] 3.2 Implementar: `src/scripts/views/selector.ts` — `montarIndicador()`, `abrirSelector()`, `pedirCambioDeRuta(id)`; pinta cada fase a partir de `reducir`; al confirmar corre `secuenciaCambio` (`selector-ruta.ts`, con tests): `cargarTrack(id)` → ¿sigue vigente el intento? → `cerrarSesiones()` → `abortarIa()` → `callar()` → salir de pantalla completa → `setTrack(id)` → cerrar; error con `role="alert"` y "Reintentar"; estado de carga con `role="status"`. `nav.ts`: se elimina `buildTrackPicker` y su `alert()`; `main.ts` importa `montarIndicador` y lo llama también tras importar, fusionar y reiniciar. El anuncio "Ruta: …" lo hace el `toast()` del oyente de cambio de ruta de `main.ts` (que ahora llama a `anunciar()`), no `selector.ts`. Se elimina el oyente de carga de `main.ts` y `setLoadingListener` de `track.ts`: el estado de carga lo dice quien pide el cambio. (AC-2, AC-4, AC-5, AC-10, AC-11, AC-15, AC-16, AC-17, AC-29, AC-30, AC-31, AC-33)
  - Verificación: `npm run check`; recorrido en navegador en 6.x. Archivos: `src/scripts/views/selector.ts`, `src/scripts/selector-ruta.ts`, `src/scripts/nav.ts`, `src/scripts/main.ts`, `src/scripts/track.ts`.
- [x] 3.3 Implementar: consulta de disponibilidad. `selector.ts` envía `{type:"HAS"}` al service worker al abrir, espera 400 ms y pasa el resultado (o `null`) a `opciones`; escucha `online`/`offline` para repintar la lista abierta. No se toca `public/sw.js` (lo hace `specs/ruta-b2-c1`): sin respuesta, `null`. (AC-18, S-7)
  - Verificación: sin SW (`npm run dev`) ninguna ruta sale como no disponible. Archivos: `src/scripts/views/selector.ts`.
- [x] 3.4 [C] Punto de control: los cuatro comandos; en navegador: abrir, elegir, confirmar y cancelar con ratón y con teclado; anotar en `progress.md`.

## Fase 4 — Sesiones en curso

Todas tocan archivos distintos; cada una añade la llamada a `declararSesion` en el `render` de su vista y una función `cerrar` sin `confirm()`.

- [x] 4.1 [P] Implementar: simulacro declara `simulacro` mientras `mockRunning` (se pierde lo respondido); `cerrar` para el reloj y deja la portada. (AC-19, AC-22) — Archivos: `src/scripts/views/mock.ts`.
- [x] 4.2 [P] Implementar: prueba rápida declara `tanda` con preguntas en curso; `cerrar` para el reloj y vacía la tanda. (AC-20, AC-22) — Archivos: `src/scripts/views/quiz.ts`.
- [x] 4.3 [P] Implementar: gramática y Use of English declaran `tanda` con `paso >= 0` (lo respondido se conserva); `cerrar` vuelve a la lista. (AC-20) — Archivos: `src/scripts/views/grammar.ts`, `src/scripts/views/uoe.ts`.
- [~] 4.4 [P] Implementar: vocabulario y Mis palabras declaran `tanda` con sesión abierta. (AC-20) — Archivos: `src/scripts/views/vocab.ts`, `src/scripts/views/mine.ts`.
  - A medias a propósito: vocabulario hecho; `mine.ts` sin tocar. Mis palabras no tiene tanda (cada palabra se califica y se guarda al responder, y `actual` existe siempre que hay palabras pendientes): declararla avisaría de una sesión en curso a cualquiera con palabras pendientes. Pendiente de que el dueño decida si se quiere igualmente.
- [x] 4.5 [P] Implementar: lectura y escucha declaran `tanda` con preguntas a medias; `cerrar` llama a `pararEscucha()`. Diagnóstico declara `tanda` con `paso >= 0`. (AC-20, AC-22) — Archivos: `src/scripts/views/reading.ts`, `src/scripts/views/listening.ts`, `src/scripts/views/diagnostic.ts` (solo la declaración; el botón de recomendación va en 5.1).
- [x] 4.6 [P] Implementar: speaking declara `tanda` con el cronómetro en marcha (`cerrar` = `pararTodo`); `ai.ts` exporta `iaEnCurso()` y `abortarIa()`; el tutor declara `ia` mientras responde. (AC-21, AC-22) — Archivos: `src/scripts/views/speaking.ts`, `src/scripts/ai.ts`, `src/scripts/views/tutor.ts`.
- [x] 4.7 Test: día del plan a medias (falla primero). `planAMedias(pasosMarcados, total)` es verdadero solo entre 1 y total−1. (AC-20, S-8) — Archivos: `tests/selector-ruta.test.mts`.
- [x] 4.8 Implementar: `planAMedias` en `selector-ruta.ts`; el plan declara sesión `informativa` cuando se cumple. — Archivos: `src/scripts/selector-ruta.ts`, `src/scripts/views/plan.ts`.
- [x] 4.9 Implementar: `pantallaCompleta()` inserta o retira en la vista una línea "Ruta: <nombre>" visible con `.en-sesion`; `selector.ts`, tras cambiar, llama a `callar()` y a `pantallaCompleta(false)`. (AC-22, AC-23)
  - Verificación: en móvil, con una tanda abierta, se lee la ruta. Archivos: `src/scripts/pasos.ts`, `src/scripts/views/selector.ts`, `src/styles/global.css`.
- [x] 4.10 [C] Punto de control: los cuatro comandos; en navegador: con simulacro en curso, cancelar conserva reloj y respuestas (AC-19); confirmar no deja reloj, audio ni pantalla completa (AC-22); anotar en `progress.md`.

## Fase 5 — Otros caminos que cambian de ruta

- [x] 5.1 Implementar: los dos botones de recomendación del diagnóstico llaman a `pedirCambioDeRuta(id)` en vez de a `setTrack` (`diagnostic.ts:231,240`). (AC-24)
  - Archivos: `src/scripts/views/diagnostic.ts`.
- [x] 5.2 Test: elección en la bienvenida (falla primero). `eleccionBienvenida(elegida, activa)` → `{cambiar: boolean}`; nunca hay cambio de `S.track` sin contenido cargado (se modela como "pendiente" hasta `cargada`). (AC-25)
  - Archivos: `tests/selector-ruta.test.mts`.
- [x] 5.3 Implementar: bienvenida. Las opciones de ruta son `<button aria-pressed>` con nombre, para quién y examen visibles; la elección queda en una variable local y se aplica con `setTrack` al pulsar "Siguiente" o "Saltar", con estado de carga y error en texto; la recomendación del paso 3 muestra el aviso de progreso de `avisos()` junto al botón; la capa lleva `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y foco inicial en el título. Sin confirmación adicional. (AC-24, AC-25, AC-28, AC-29)
  - Archivos: `src/scripts/views/onboarding.ts`, `src/styles/global.css`.
- [x] 5.4 [C] Punto de control: los cuatro comandos; en navegador: primera visita con teclado; "Saltar" tras elegir la otra ruta no rompe el arranque; anotar en `progress.md`.

## Fase 6 — Verificación en navegador

- [ ] 6.1 Recorrido completo con teclado y con lector de pantalla (NVDA o VoiceOver): anuncio del indicador (AC-3), foco al abrir y al cerrar (AC-29), avisos leídos antes del botón (AC-31), anuncio del cambio (AC-10). Anotar hallazgos con archivo:línea.
- [~] 6.2 320 px, 375 px y 1280 px en tema claro y oscuro: sin desbordes, dianas de 44 px, el contenido empieza más arriba que antes (medir la posición del primer `h1` antes y después) (AC-13, AC-26, AC-27, AC-28, AC-32, AC-34).
- [~] 6.3 Sin conexión (DevTools → Offline) con la otra ruta sin descargar: fallo con motivo en texto, ruta anterior intacta, "Reintentar" funciona al volver la red (AC-17, AC-33).
- [~] 6.4 Progreso: anotar días hechos, tarjetas y texto de writing de una ruta, cambiar y volver: idénticos; racha, errores y tema sin cambios (AC-11, AC-12, AC-35).
- [ ] 6.5 Revisiones obligatorias sobre el diff: `code-review`, `design:accessibility-review`, `design:design-critique`, `break-ui`. Los hallazgos altos vuelven a la tarea que los originó.
- [~] 6.6 [C] Punto de control: los cuatro comandos; todos los AC del spec marcados o con motivo escrito; anotar en `progress.md`.

## Build Verification

- [x] 7.1 `npm run build` (incluye `astro check`, `astro build` y el precache) sin errores ni avisos nuevos.
- [x] 7.2 `npm test` y `npm run test:plan` en verde sobre el resultado final.
- [x] 7.3 `grep` de hex/rgb fuera de los bloques de fichas en los archivos tocados: ninguno.
- [x] 7.4 Actualizar `progress.md` con el estado final y lo que queda pendiente de respuesta del dueño (supuestos S-1 a S-8).
