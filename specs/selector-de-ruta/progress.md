# Selector de ruta — Progreso

## Línea base (tarea 1.1) — 2026-10-10

Árbol de trabajo de `redesign/ui` antes de tocar nada de esta feature.

- `npm test`: 36 pass / 0 fail / 0 skip.
- `npm run test:plan`: "Plan correcto en todas las rutas." (A2 → B1 y B1 → B2).

### CP: Fase 1 — Base común — 2026-10-10
tests: 36 pass / 0 fail / 0 skip
build: pass [npm test, npm run check (146 archivos, 0 errores, 0 avisos), npm run test:plan, npm run build:fast]
done: [1.1, 1.2, 1.3, 1.4]
rework: [1.2 — `anunciar()` pasó de `requestAnimationFrame` a `setTimeout(50)`: con la pestaña oculta el anuncio no llegaba a escribirse; check y build repetidos después]
criteria_met: [ninguno completo todavía; 1.2 y 1.3 son la base de AC-10, AC-16, AC-29, AC-30 y AC-32, que se cierran en las fases 3 y 6]
issues:
- Verificado en navegador (dev, 320 px, tema oscuro): `#anuncio` recibe el texto de `toast()` y se vacía antes de repetirlo; `abrirDialogo()` abre modal, lleva el foco al título, mide 296 px a 320 px sin desbordar, no toca el `overflow` de `body`, Escape respeta `alCancelar` y el foco vuelve a `volverA`.
- Sin verificar: el respaldo sin `showModal` (no hay navegador sin `<dialog>` a mano) y el lector de pantalla real; quedan para 6.1.
- Desviación: el velo del diálogo usa `--paper` con opacidad .8 en vez de `--ink` (plan.md, "DOM y ARIA"): `--ink` es casi blanco en el tema oscuro y dejaba un velo claro sobre la app oscura.
- Desviación: el respaldo sin `showModal` es la misma caja fija arriba (`.dlg-enlinea`, `role="dialog"`, sin modalidad), no una caja dentro del lateral: `dialogo.ts` es común con tutor-contextual y no conoce el lateral.


### CP: Fase 2 — Lógica pura — 2026-10-10
tests: 78 pass / 0 fail / 0 skip
build: pass [npm test, npm run check (163 archivos, 0 errores, 0 avisos), npm run test:plan, npm run build:fast]
done: [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9]
rework: []
criteria_met: [ninguno completo: son criterios de interfaz. Su lógica queda fijada por tests — AC-6, AC-9, AC-16, AC-17 (`reducir`), AC-7, AC-12, AC-14 (`avisos`), AC-8 (`resumenProgreso`, `opciones`), AC-18 y S-7 (`opciones`), AC-3 (`etiquetaIndicador`), AC-19 (casilla en `reducir`), AC-35 (`resumenProgreso` no muta); se cierran al pintar en la fase 3 y verificar en la 6]
issues:
- Rojo antes de verde en los cuatro pares: 2.1 (módulo `sesion.ts` inexistente → 8 tests), 2.3 (módulo `selector-ruta.ts` inexistente → 8), 2.5 (sin `ESTADO_INICIAL` → 15), 2.7 (sin `avisos` → 11). Suite: 36 → 44 → 52 → 67 → 78.
- Desviación: `TrackMeta` todavía no tiene `disponibles` (lo añade ruta-b2-c1 5.2 y `src/data/**` no es de esta lista). `selector-ruta.ts` exporta `MetaRuta = TrackMeta & { disponibles?: number }` y sus funciones reciben `MetaRuta`; cuando el campo exista en `TrackMeta` el tipo sigue valiendo sin cambios.
- Desviación: `TrackId` aún es `"a2b1" | "b1b2"`; los tests de tres rutas construyen la ficha de `b2c1` con el id convertido desde texto. Sin efecto en producción.
- Decisión: el total de días de una ruta es `(disponibles ?? 24) × 5`, calculado dentro de `opciones` (la firma del plan no lo recibe). 24 y 5 son constantes del módulo.
- Decisión: una sesión de tipo `ia` no genera aviso de clase `sesion`; produce el aviso `ia`, una sola vez aunque `iaEnCurso` también sea verdadero.
- Decisión: en `cerrado`, `elegir` se ignora (AC-4). `pedirCambioDeRuta(id)` de la fase 3 tiene que despachar `abrir` y después `elegir`.
- Pendiente para la fase 3, fuera de las tareas 2.x: no existe una función pura que diga si hay sesión que se pierde (`sesiones.some(s => s.pierde)`) ni el texto de la casilla de AC-19; conviene añadirlas con su test antes de pintar.

### CP: Correcciones de la revisión de las fases 1–2 — 2026-10-10
tests: 83 pass / 0 fail / 0 skip
build: pass [npm test, npm run check]
done: [revisión-1 (Escape una sola vez), revisión-2 (`cargada` sin `elegida`), `seVaAPerder`, `textoCasilla`, acción `descartar`]
rework: [1.3, 2.6]
criteria_met: []
issues:
- `dialogo.ts`: el oyente de `keydown` para Escape solo se registra en el respaldo sin `showModal`; con `showModal` Escape llega por `cancel`.
- Decisión sobre el cierre forzado durante `cargando`: acción `descartar`, que desde cualquier fase vuelve a `cerrado` con la ruta activa intacta. Una carga que termine después cae en `cerrado` y se ignora: no se cambia de ruta a espaldas de quien cerró. Fijado con dos tests de `reducir`.
- Rojo antes de verde: 5 tests nuevos fallaban por falta del export `seVaAPerder`; 78 → 83.

### CP: Fase 3 — Indicador y diálogo — 2026-10-11
tests: 84 pass / 0 fail / 0 skip
build: pass [npm test, npm run check (164 archivos, 0 errores, 0 avisos), npm run test:plan, npm run build:fast]
done: [3.1, 3.2, 3.3, 3.4]
rework: [2.6 — `volver` desde `error` lleva a la lista (el botón «Elegir otra ruta» no hacía nada tras un fallo); test en rojo primero, 83 → 84]
criteria_met: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-26, AC-27 — vistos en navegador a 320 px, tema oscuro, con teclado; el resto de tamaños y temas se repasa en la fase 6]
issues:
- Desviación: `nav.ts` ya no exporta `buildTrackPicker`; `main.ts` importa `montarIndicador` de `views/selector.ts`. Un alias en `nav.ts` habría creado el ciclo nav → selector → ai → nav en cuanto el selector importe `ai.ts` (tarea 4.6).
- Desviación: el anuncio «Ruta: …» no lo hace `selector.ts` sino el `toast()` que ya había en el oyente de cambio de ruta de `main.ts` (ahora `toast()` llama a `anunciar()`); así también lo dicen la bienvenida y el diagnóstico, y no se anuncia dos veces.
- Móvil: en menos de 960 px se oculta el subtítulo de la marca («Entrenamiento para certificación») para que marca e indicador compartan línea a 320 px. La cabecera del lateral pasa de dos franjas (marca + rutas) a una de 65 px.
- 3.3: sin service worker (`npm run dev`) ninguna ruta sale como no disponible. La respuesta `HAS` no existe todavía en `public/sw.js` (ruta-b2-c1 3.4): hasta entonces el aviso previo de AC-18 no puede aparecer y el fallo se trata con AC-17.
- Corregido durante la verificación: el paso de confirmar pintaba el texto «null» cuando no había casilla.
- El camino de error no se puede provocar todavía con dos rutas: la precarga de `track.ts` deja la otra ruta en memoria a los 1,5 s. Se fuerza en la fase 6.

### CP: Fase 4 — Sesiones en curso — 2026-10-11
tests: 85 pass / 0 fail / 0 skip
build: pass [npm test, npm run check (164 archivos, 0 errores, 0 avisos), npm run test:plan, npm run build:fast]
done: [4.1, 4.2, 4.3, 4.4 (solo vocabulario), 4.5, 4.6, 4.7, 4.8, 4.9, 4.10]
rework: []
criteria_met: [AC-19, AC-22 — vistos en navegador a 1280 px con teclado: simulacro en curso, aviso + casilla, confirmar sin casilla no cambia, Escape devuelve al simulacro con reloj y respuestas; con la casilla, tras confirmar no queda reloj, ni pantalla completa, ni vista en sesión. AC-20, AC-21, AC-23 implementados; se repasan en la fase 6]
issues:
- 4.4, Mis palabras: no se declara sesión. La vista no tiene tanda: cada palabra se califica y se guarda al responder, y `actual` existe siempre que hay palabras pendientes. Declararla haría salir la casilla de «pierdo lo que tengo a medias» a cualquiera con palabras pendientes, sin que se pierda nada.
- Decisión (AC-20): las tandas declaran en `pierde` que se interrumpen («no se retoma donde la dejaste»), así que también piden la casilla; el plan diario es `informativa` y no la pide (S-8).
- 4.5, escucha: se declara solo con el segundo pase abierto y preguntas a medias; `reading.ts` retira la declaración al salir de la pestaña de escucha.
- 4.6, speaking: se declara al arrancar el cronómetro y se retira en `pararCrono`. `conserva` va vacío: no he comprobado qué se guarda de la transcripción.
- 4.6: `iaEnCurso()` cuenta las correcciones de `ask()` (writing, speaking, errores); el tutor usa `streamAi` directamente y se declara como sesión `ia`.
- 4.7: rojo antes de verde (falta el export `planAMedias`), 84 → 85.
- 4.9: `pasos.ts` importa ahora `state` y `track` para leer el nombre de la ruta. La línea «Ruta: …» solo se ve por debajo de 960 px.
- Riesgo ya existente, no tocado: `renderAll()` llama a `pantallaCompleta()` de cada vista y la última gana, de modo que una tanda abierta en un módulo puede perder `body.sesion-activa` tras un repintado general.

### CP: Fase 5 — Otros caminos que cambian de ruta — 2026-10-11
tests: 87 pass / 0 fail / 0 skip
build: pass [npm test, npm run check (164 archivos, 0 errores, 0 avisos), npm run test:plan, npm run build:fast]
done: [5.1, 5.2, 5.3, 5.4]
rework: []
criteria_met: [AC-24 (diagnóstico: mismo diálogo, directo en confirmar; bienvenida paso 3: aviso de progreso junto al botón), AC-25 — visto en navegador a 320 px con teclado: la tarjeta solo queda elegida, la ruta guardada no cambia hasta «Siguiente» o «Saltar», y «Saltar» tras elegir la otra ruta arranca en ella sin romper]
issues:
- 5.2: rojo antes de verde (falta el export `eleccionBienvenida`), 85 → 87.
- 5.3: la capa lleva `role="dialog"`, `aria-modal`, nombre por `aria-labelledby` y foco en el título de cada paso; mientras está abierta, `.app` queda `inert`. Las tarjetas son `<button aria-pressed>` con una marca de texto «Elegida».
- 5.1: `renderDiag` vuelve a la portada si el resultado en pantalla era de la otra ruta y la nueva no tiene diagnóstico hecho.
- No ejercitado en navegador: el botón de recomendación del diagnóstico y el del paso 3 de la bienvenida (hace falta una nota concreta); sí se probó `pedirCambioDeRuta()` llamándolo directamente.

### CP: Fase 6 y Build Verification — 2026-10-11
tests: 87 pass / 0 fail / 0 skip
build: pass [npm test, npm run test:plan, npm run build (astro check 164 archivos 0 errores 0 avisos, astro build, precache)]
done: [7.1, 7.2, 7.3, 7.4]
rework: [3.2 — texto «null» en el paso de confirmar; aro de foco del título del diálogo]
criteria_met: [AC-1 a AC-12, AC-16 (lógica y estado en texto), AC-17 (fallo y ruta intacta), AC-19, AC-22, AC-24, AC-25, AC-26, AC-27, AC-29, AC-30, AC-31, AC-33, AC-34, AC-35]
issues:
- 6.1 sin hacer: no hay lector de pantalla en este entorno. Con teclado sí: abrir con Enter, Tab por las opciones, elegir, casilla con Espacio, confirmar, Escape en lista y en confirmar, foco de vuelta al indicador o al botón que abrió.
- 6.2 a medias: medido a 320 px (tema oscuro, capturas) y a 1280 px (tema claro, por medidas y contraste calculado: todos los pares del diálogo entre 6,8:1 y 21:1). Sin desbordes a 320 px (diálogo de 296 px). No se probó 375 px, ni capturas en claro (el panel del navegador dejó de dibujar), ni la medida del `h1` contra la versión anterior: la cabecera del lateral queda en 65 px en una sola línea.
- 6.3 a medias: fallo forzado parando el servidor de desarrollo con la otra ruta sin precargar: motivo en texto con `role="alert"`, ruta anterior y datos guardados idénticos, foco en «Reintentar», segundo intento vuelve a fallar sin romper. No se pudo probar el reintento con la red de vuelta: reiniciar el servidor recarga la pestaña.
- 6.4 a medias: tras cambiar, el progreso de la ruta anterior es idéntico salvo la clave `counters` del día, que la app ya crea al usarse (anterior a esta feature); racha, errores, tema y ajustes sin cambios. No se comprobó el texto de writing ni la vuelta.
- 6.5 sin hacer: las revisiones (`code-review`, accesibilidad, crítica de diseño, `break-ui`) las lanza el coordinador sobre este diff.
- Cierre forzado del diálogo (cerrar el `<dialog>` por fuera): el estado vuelve a `cerrado`, la ruta no cambia y el selector se vuelve a abrir.
- 7.3: ningún hex ni rgb nuevo en los archivos tocados.
- AC sin cerrar: AC-13 y AC-14/15 con tres rutas y ruta incompleta (probado solo en tests; `TrackMeta.disponibles` no existe todavía), AC-18 (falta el mensaje `HAS` en `public/sw.js`, ruta-b2-c1 3.4), AC-20/21/23 (implementados, solo el simulacro se ejercitó), AC-28 (44 px con puntero táctil; 40 px con ratón), AC-32 (foco y contraste vistos; `prefers-reduced-motion` no se probó, no se añadió ninguna animación).
- Supuestos pendientes del dueño: S-1 a S-8 de plan.md, más dos decisiones de esta sesión: las tandas piden la casilla (AC-20) y Mis palabras no declara sesión.
- Un hook de base de datos (`db-guard`) bloqueó un comando de edición de archivos por una coincidencia de texto; no se rodeó: las ediciones se hicieron con la herramienta de edición.

### CP: Correcciones de la revisión de las fases 3–5 — 2026-10-11
tests: 94 pass / 0 fail / 0 skip
build: pass [npm test, npm run check (164 archivos, 0 errores, 0 avisos), npm run test:plan, npm run build:fast]
done: [revisión 1 a 10]
rework: [2.4, 2.8, 3.2, 4.3, 4.4, 4.5, 4.6, 5.2, 5.3]
criteria_met: [AC-11 — ida y vuelta entre rutas con una unidad de gramática abierta: lo guardado queda idéntico byte a byte; AC-20 — la tanda que se retoma avisa sin pedir casilla]
issues:
- 1: la casilla solo sale donde se pierde algo de verdad: simulacro, prueba rápida y grabación de speaking (la transcripción no se guarda). Diagnóstico, lectura, gramática, Use of English, vocabulario y escucha declaran `pierde: ""` y dicen que se retoman; su aviso sale como información (`clase: "informa"`), no como alerta. Deja sin efecto la decisión anterior de que todas las tandas pidieran casilla.
- 2: `secuenciaCambio` en `selector-ruta.ts`, con dependencias inyectadas y seis tests (orden, descarga pendiente, fallo de descarga, intento abandonado, fallo de un intento abandonado, excepción al cerrar o al cambiar). `selector.ts` numera cada intento. Rojo antes de verde.
- 3: `ai.ts` guarda un `AbortController` por corrección en un `Set`; cada «Parar» corta la suya y `abortarIa()` las corta todas. Sin test: `ai.ts` no carga en Node (importa `api.ts`). No se tocó cuota, cola ni guardado.
- 4: `resumenProgreso` cuenta también gramática, Use of English, simulacros, writing con texto, pruebas rápidas y lecturas. Dos tests, rojo antes de verde.
- 5: `main.ts` repinta el indicador tras importar, fusionar con el servidor, reiniciar y la primera sincronización.
- 6: quitados la regla `body.cargando-ruta .trackpick`, el oyente de carga de `main.ts` y `setLoadingListener`/`onLoading` de `track.ts` (la bienvenida pinta su propio estado). Se queda `.trackpick{flex:0 0 auto}`: es la clase de `#trackPick` en `Rail.astro`. Sin tocar por no ser de esta lista: `src/components/views/Panel.astro:4` dice «Elige tu ruta en el lateral», que en móvil ya no es exacto.
- 7: `eleccionBienvenida` y sus tests eliminados. La bienvenida cambia de ruta con la misma `secuenciaCambio` que el selector; la garantía «no se asigna la ruta sin contenido» la fijan sus tests.
- 8: en el paso 2 de la bienvenida el foco vuelve a la opción recién elegida.
- 9: `diagnostic.ts` sigue usando `toast` y `go` (reinicio del diagnóstico y salto al plan): no se quitan.
- 10: tasks.md — 4.4 pasa a `[~]` con su motivo; texto de 3.2 puesto al día.
- ABIERTO, para el dueño (no corregido: cambia datos guardados y necesita su tarea): `src/scripts/views/quiz.ts`, `resultado()` añade una entrada al historial cada vez que se pinta. Confirmar un cambio de ruta con el resultado de una prueba en pantalla repinta la vista y escribe esa entrada en la ruta de destino. Es anterior a esta feature.
- Decisión de producto, se deja como está: el plan diario se declara desde `render()` como sesión informativa (solo avisa, nunca pide casilla).
- Sin verificar en navegador en esta ronda: bienvenida (pasos 1 y 2) y varios «Parar» a la vez; sí el flujo del selector con una unidad de gramática abierta.
