# Rediseño limpio

> **Cambio 2026-11-05 — `specs/landing-y-acceso/`:** se añade una vista nueva fuera del shell, la **landing pública** (explicación, muestra jugable y entrada por correo), con las mismas reglas de tokens, tipografía y una sola acción principal. La maqueta debe incluirla antes de aplicar el rediseño.

## Overview
La app funciona, pero cada vista se ha ido maquetando por su cuenta: dos familias tipográficas (sans y serif) compitiendo, sombras y bordes de pesos distintos, el naranja usado a la vez como color de texto, de borde y de relleno, y varias acciones que parecen igual de importantes en la misma pantalla. El resultado se lee cansado y no deja claro qué hacer a continuación.

Este rediseño cambia solo la piel: una estructura de aplicación limpia (lateral claro con la ruta arriba y dos grupos, "Estudiar" y "Atajos"; iconos de línea; cifras sobre gris; filas en tarjetas redondeadas; aire; sin sombras pesadas), una sola familia tipográfica con escala fija y la misma paleta v2 con papeles más estrictos. No cambia qué se estudia, cómo se calcula el progreso ni qué se guarda.

La referencia visual aprobable es `docs/diseno/maqueta-rediseno.html` (Panel, Plan diario, Vocabulario, hoja de estados, diálogo de ruta, cajón móvil, claro y oscuro) con capturas en `docs/diseno/capturas/`.

## User Stories
- Como estudiante, quiero abrir cualquier vista y saber en un vistazo dónde estoy y cuál es lo siguiente que debo hacer.
- Como estudiante en móvil, quiero que el contenido empiece arriba y que el menú no me quite pantalla mientras estudio.
- Como estudiante que estudia de noche, quiero un tema oscuro que se lea igual de bien que el claro.
- Como estudiante que usa teclado o lector de pantalla, quiero recorrer el menú, las vistas y los diálogos sin ratón y sin perder el foco.
- Como estudiante que ya lleva semanas, quiero que tras el rediseño mi progreso, mis tarjetas y mis textos sigan exactamente igual.

## Alcance
- **Shell**: lateral (selector de ruta arriba, grupo "Estudiar", grupo "Atajos", pie con Ajustes, Cuenta y tema), barra superior y cajón en móvil, diálogo de cambio de ruta (el comportamiento lo define `specs/selector-de-ruta/`; aquí solo su piel).
- **18 vistas**: Panel, Plan diario, Vocabulario, Mis palabras, Gramática, Use of English, Listening & Reading, Writing, Speaking, Tutor, Prueba rápida, Simulacro (grupo Estudiar); Diagnóstico, Qué examen, Cuaderno de errores, Recursos (grupo Atajos); Ajustes, Cuenta (pie).
- **Componentes**: botón (principal, secundario, discreto, tamaño pequeño), campo de texto, opción de radio en tarjeta, etiqueta de estado (chip), insignia (badge), tile de cifra, barra (medidor y progreso), fila-tarjeta, paso del plan, tarjeta contenedora, aviso de error (banner), estado vacío, esqueleto de carga, diálogo.

## Acceptance Criteria

### Estructura y jerarquía
- [ ] AC-1: Las 18 vistas usan el mismo esqueleto: encabezado (miga en texto pequeño, `h1` con la escala "display", entradilla opcional), cifras sobre gris si las hay, tarjetas blancas con borde de 1 px y filas.
- [ ] AC-2: Cada vista tiene como máximo una acción principal con relleno naranja (`--fill`). El resto de acciones son secundarias (borde) o discretas (texto petróleo).
- [ ] AC-3: El naranja solo aparece como relleno de esa acción principal y siempre con texto negro (`--on-fill`). Nunca como color de texto, borde, icono ni fondo decorativo.
- [ ] AC-4: Una sola familia tipográfica (Instrument Sans, con anchura variable) y solo los tamaños de la escala de tokens. La serif desaparece de la app.
- [ ] AC-5: No hay sombras salvo la del diálogo modal (`--shadow-dialog`). Las tarjetas se separan por borde de 1 px y espacio.
- [ ] AC-6: Iconos de línea de un mismo set (trazo 1,6 px, 24×24 de caja, 18 px de tamaño normal y 16 px pequeño), nunca emojis como icono.

### Contraste (medido, no estimado)
- [ ] AC-7: Toda pareja texto/fondo de los tokens cumple WCAG AA (≥ 4,5:1) en tema claro y oscuro, medida con la fórmula de luminancia relativa de WCAG 2.x. La tabla de abajo es la referencia; cualquier token nuevo se añade a la tabla con su medida antes de usarse.
- [ ] AC-8: Bordes de controles interactivos (botón secundario, campo, selector de ruta, chip de ruta móvil, filtros), anillo de foco, barras de progreso y bordes de estado (inválido, actual, elegido) cumplen ≥ 3:1 contra el fondo adyacente en ambos temas (WCAG 1.4.11).
- [ ] AC-9: El estado elegido o actual no se comunica solo por color: lleva además `aria-current`/`aria-pressed`/`checked` y un cambio de forma (borde, relleno o marca con texto).

### Estados completos
- [ ] AC-10: Cada tipo de componente tiene los estados que le corresponden, visibles en la hoja de estados de la maqueta y replicados en la app:

| Componente | Reposo | Hover | Foco | Pulsado | Desactivado | Cargando | Vacío | Error |
|---|---|---|---|---|---|---|---|---|
| Botón principal | sí | sí | sí | escala 0,97 | sí | spinner + texto + `aria-busy` | — | — |
| Botón secundario / pequeño | sí | sí | sí | escala 0,97 | sí | igual que principal | — | — |
| Botón discreto | sí | sí | sí | escala 0,97 | sí | — | — | — |
| Campo de texto | sí | sí | sí | — | sí | — | placeholder | borde + mensaje con icono, `aria-invalid` + `aria-describedby` |
| Opción de radio en tarjeta | sí | sí | sí | — | sí | — | — | — |
| Fila-tarjeta | sí | sí | foco del contenedor | — | — | — | — | — |
| Ítem de navegación | sí | sí | sí | — | — | — | — | — |
| Lista / sección con datos | — | — | — | — | — | esqueleto con `aria-busy` | estado vacío con acción | banner con motivo y reintento |

- [ ] AC-11: El hover solo se aplica con puntero fino; en táctil, las acciones que en escritorio aparecen al pasar el ratón (por ejemplo "Elegir" en una fila) están siempre visibles.
- [ ] AC-12: Los mensajes de error y los avisos van en texto dentro de la app, nunca con `alert()`.

### Móvil (375 px)
- [ ] AC-13: A 375 px de ancho ninguna de las 18 vistas, el cajón ni el diálogo producen scroll horizontal (`scrollWidth` igual a `clientWidth`), en claro y oscuro. Además se comprueba a 320 px.
- [ ] AC-14: Por debajo de 960 px el lateral pasa a cajón: barra superior de una línea con menú, nombre de la vista y ruta activa; no hay franja propia para la ruta.
- [ ] AC-15: Con el cajón abierto, el contenido y la barra superior tienen `inert`; el foco entra en el ítem actual, Escape o tocar el velo lo cierran y el foco vuelve al botón de menú. Si la ventana pasa a escritorio con el cajón abierto, se cierra y se quita `inert`.
- [ ] AC-16: Todas las dianas táctiles miden al menos 44×44 px; los campos usan 16 px de cuerpo para que iOS no amplíe.

### Accesibilidad de navegación
- [ ] AC-17: Al cambiar de vista, el foco va al `h1` de la vista (`tabindex="-1"`), sin anillo visible por ratón, y el ítem del menú lleva `aria-current="page"`.
- [ ] AC-18: Los controles que filtran o eligen dentro de una vista no pierden el foco de teclado al pulsarse (se actualiza su estado en el mismo elemento o el foco se restaura al equivalente).
- [ ] AC-19: El nombre accesible de cada control contiene su texto visible (WCAG 2.5.3); por ejemplo "Día 36, anterior".
- [ ] AC-20: Con `prefers-reduced-motion: reduce` no hay animaciones de movimiento; el spinner se sustituye por un indicador estático.

### Sin cambios funcionales
- [ ] AC-21: Cero cambios en la lógica de estudio (planificación de días, repetición espaciada, cálculo de dominio, corrección, cuotas de IA).
- [ ] AC-22: Cero cambios en las claves y el formato de los datos guardados (`localStorage` y sincronización: `src/scripts/state.ts`, `sync.ts`, `queue.ts`, `library.ts`, `pulse.ts`, `api.ts`). El progreso guardado antes del rediseño carga idéntico.
- [ ] AC-23: Cero cambios en `src/data/`. Textos de contenido, mazos y planes se muestran tal cual.
- [ ] AC-24: `npm run build` y `npm run test:plan` siguen pasando.

## Non-Goals
- Cambiar la paleta v2 o añadir colores nuevos de marca.
- Cambiar el comportamiento del selector de ruta (va en `specs/selector-de-ruta/`).
- Reordenar, fusionar, añadir o quitar vistas o módulos.
- Reescribir textos de contenido o de `src/data/`; solo se ajustan microtextos de la interfaz (etiquetas de botones, estados vacíos) donde hoy son genéricos.
- Animaciones decorativas, ilustraciones o mascotas.
- Cambios de backend, de sincronización o de almacenamiento.
- Un sistema de componentes en un framework distinto del que ya usa la app.

## Design Tokens

Los valores exactos viven en la maqueta y pasarán a `src/styles/global.css`. Los nombres son los de la maqueta.

### Color (papeles)

| Papel | Token | Claro | Oscuro | Uso |
|---|---|---|---|---|
| Fondo de trabajo | `--bg` | #FFFFFF | #0B1318 | Zona de contenido, tarjetas, controles |
| Fondo apagado | `--bg-muted` | #EAECF0 | #142630 | Lateral, tiles de cifra, hover, desactivado |
| Hover sobre apagado | `--bg-hover` | #DDE0E6 | #1C3341 | Ítem de menú en hover |
| Activo en lateral | `--bg-active` | #FFFFFF | #233D4D | Ítem actual, selector de ruta |
| Tinta | `--ink` | #000000 | #F3F5F6 | Texto principal |
| Tinta 2 | `--ink-2` | #3B4F5C | #C9D2D8 | Secundario, entradilla, menú en reposo |
| Tinta 3 | `--ink-3` | #55656F | #B4C0C7 | Micro, ayudas, metadatos |
| Tinta de nav activo | `--nav-active-ink` | #233D4D | #EAF3F8 | Texto del ítem actual |
| Borde | `--border` | #D3D7DD | #2A4352 | Separadores y tarjetas (decorativo) |
| Borde de control | `--border-control` | #74808A | #8499A5 | Bordes de controles interactivos (≥ 3:1) |
| Acento (petróleo) | `--accent` | #233D4D | #A9CDE2 | Activo, elegido, botón discreto, barras |
| Sobre acento | `--on-accent` | #FFFFFF | #0B1318 | Texto sobre relleno de acento |
| Acento suave | `--accent-soft` | #DFE6EA | #2F5063 | Fondo de fila u opción elegida |
| Tinta de acento | `--accent-ink` | #16303F | #EAF3F8 | Texto sobre acento suave |
| Relleno principal | `--fill` | #FE7F2D | #FE7F2D | Solo la acción principal |
| Relleno principal hover | `--fill-hover` | #E96C17 | #E96C17 | Hover de la acción principal |
| Sobre relleno | `--on-fill` | #000000 | #000000 | Texto de la acción principal |
| Correcto | `--ok` / `--ok-soft` | #1F6B45 / #DCEBE2 | #7FCFA0 / #1D4A3F | Chip "al día", paso hecho |
| Aviso | `--warn` / `--warn-soft` | #6F5800 / #F2ECCB | #E2C766 / #46412B | Chip de pendientes |
| Error | `--bad` / `--bad-soft` | #A3352E / #F5E0DD | #F2A59A / #55303A | Errores, dominio < 70% |
| Foco | `--focus` | #233D4D | #A9CDE2 | Anillo de 2 px, separación 2 px |
| Velo | `--scrim` | rgba(11,19,24,.40) | rgba(0,0,0,.60) | Detrás de cajón y diálogo |

### Tipografía
Familia única: `"Instrument Sans", "Helvetica Neue", Arial, sans-serif` (pesos 400–700, anchura 75–100; titulares y cifras al 87,5 %). Cifras con `tabular-nums`.

| Paso | Token | Tamaño / interlínea | Peso | Uso |
|---|---|---|---|---|
| Display | `--t-display` | 32/38 (26/32 en < 960 px) | 600, ancho 87,5 % | `h1` de vista |
| Cifra | `--t-stat` | 32/36 (28/32 en ≤ 420 px) | 600, ancho 87,5 % | Valor de tile |
| H2 | `--t-h2` | 20/28 | 600 | Título de tarjeta principal, diálogo |
| H3 | `--t-h3` | 17/24 | 600 | Título de sección |
| Cuerpo | `--t-body` | 15/24 | 400 | Texto general (16 en campos) |
| Pequeño | `--t-small` | 13/20 | 400–600 | Ayudas, metadatos, etiquetas |
| Micro | `--t-micro` | 12/16 | 500–600 | Grupos del lateral, chips, contadores |

### Espaciado
Escala de 4 px: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 20, `--s6` 24, `--s8` 32, `--s10` 40, `--s12` 48. Contenido con ancho máximo de 1040 px; márgenes de vista 40/48 px en escritorio y 16 px en móvil.

### Radios
`--r-lg` 14 px (tarjetas, tiles, diálogo), `--r-md` 12 px (filas, pasos, opciones, selector), `--r-sm` 8 px (botones, campos), `--r-xs` 6 px (chips). Ítems de menú e insignias, 10 px.

### Movimiento
`--d-fast` 120 ms (color, borde, opacidad en hover), `--d-base` 160 ms (pulsado), `--d-slow` 200 ms (cajón, diálogo). Curvas: `--ease-out` cubic-bezier(.23,1,.32,1) para entradas y pulsado; `--ease-drawer` cubic-bezier(.32,.72,0,1) para el cajón. El diálogo entra desde escala 0,97 con opacidad, centrado. Nada supera 200 ms; con movimiento reducido, duración 0.

## Tabla de contraste (medida)

Calculada con la fórmula de luminancia relativa de WCAG 2.x sobre los valores hexadecimales de los tokens leídos de `docs/diseno/maqueta-rediseno.html` (script de un solo uso, fuera del repo). Mínimo 4,5:1 para texto y 3:1 para bordes de control, foco y elementos gráficos. 35 parejas, 0 fallos.

| Texto/trazo | Fondo | Uso | Mín. | Claro | Oscuro | Pasa |
|---|---|---|---|---|---|---|
| `--ink` | `--bg` | Texto principal | 4.5:1 | 21.00 | 17.14 | sí |
| `--ink-2` | `--bg` | Texto secundario, entradilla | 4.5:1 | 8.54 | 12.22 | sí |
| `--ink-3` | `--bg` | Micro, ayuda, metadatos | 4.5:1 | 6.04 | 10.09 | sí |
| `--ink` | `--bg-muted` | Texto en lateral y tiles | 4.5:1 | 17.75 | 14.23 | sí |
| `--ink-2` | `--bg-muted` | Menú en reposo, etiqueta de tile | 4.5:1 | 7.22 | 10.15 | sí |
| `--ink-3` | `--bg-muted` | Grupo del lateral, sub de tile, texto desactivado | 4.5:1 | 5.11 | 8.38 | sí |
| `--ink` | `--bg-hover` | Menú en hover | 4.5:1 | 15.88 | 12.01 | sí |
| `--ink-3` | `--bg-hover` | Contador del menú en hover | 4.5:1 | 4.57 | 7.07 | sí |
| `--nav-active-ink` | `--bg-active` | Ítem de menú actual | 4.5:1 | 11.38 | 10.12 | sí |
| `--ink-3` | `--bg-active` | Subtítulo del selector de ruta | 4.5:1 | 6.04 | 6.12 | sí |
| `--accent` | `--bg` | Botón discreto, icono activo | 4.5:1 | 11.38 | 11.17 | sí |
| `--accent` | `--bg-muted` | Botón discreto en hover | 4.5:1 | 9.62 | 9.27 | sí |
| `--on-accent` | `--accent` | Filtro pulsado, insignia activa, paso actual | 4.5:1 | 11.38 | 11.17 | sí |
| `--accent-ink` | `--accent-soft` | Chip "Activa" | 4.5:1 | 10.89 | 7.63 | sí |
| `--ink` | `--accent-soft` | Fila u opción elegida | 4.5:1 | 16.64 | 7.84 | sí |
| `--ink-2` | `--accent-soft` | Subtítulo de fila u opción elegida | 4.5:1 | 6.77 | 5.59 | sí |
| `--on-fill` | `--fill` | Botón principal | 4.5:1 | 8.29 | 8.29 | sí |
| `--on-fill` | `--fill-hover` | Botón principal en hover | 4.5:1 | 6.62 | 6.62 | sí |
| `--ok` | `--ok-soft` | Chip correcto, paso hecho | 4.5:1 | 5.24 | 5.39 | sí |
| `--warn` | `--warn-soft` | Chip de aviso | 4.5:1 | 5.74 | 6.14 | sí |
| `--bad` | `--bad-soft` | Chip de error | 4.5:1 | 5.34 | 5.68 | sí |
| `--ink` | `--bad-soft` | Título del banner de error | 4.5:1 | 16.59 | 10.27 | sí |
| `--ink-2` | `--bad-soft` | Detalle del banner de error | 4.5:1 | 6.75 | 7.32 | sí |
| `--bad` | `--bg` | Mensaje de error de campo | 4.5:1 | 6.76 | 9.48 | sí |
| `--border-control` | `--bg` | Borde de control | 3:1 | 4.04 | 6.32 | sí |
| `--border-control` | `--bg-muted` | Borde de control sobre gris | 3:1 | 3.42 | 5.25 | sí |
| `--border-control` | `--bg-active` | Borde del selector de ruta | 3:1 | 4.04 | 3.84 | sí |
| `--focus` | `--bg` | Anillo de foco | 3:1 | 11.38 | 11.17 | sí |
| `--focus` | `--bg-muted` | Foco sobre el lateral | 3:1 | 9.62 | 9.27 | sí |
| `--focus` | `--bg-active` | Foco sobre el ítem actual | 3:1 | 11.38 | 6.78 | sí |
| `--accent` | `--bg-muted` | Relleno de barra de progreso | 3:1 | 9.62 | 9.27 | sí |
| `--bad` | `--bg-muted` | Barra con dominio < 70% | 3:1 | 5.72 | 7.87 | sí |
| `--accent` | `--bg` | Borde de paso actual y fila elegida | 3:1 | 11.38 | 11.17 | sí |
| `--bad` | `--bg` | Borde de campo inválido | 3:1 | 6.76 | 9.48 | sí |
| `--ok` | `--bg` | Borde del punto de paso hecho | 3:1 | 6.47 | 10.12 | sí |

Notas:
- La pareja más justa es `--ink-3` sobre `--bg-hover` en claro (4,57:1). Si `--bg-hover` se oscurece, hay que volver a medir.
- `--border` (#D3D7DD / #2A4352) no figura porque solo separa contenido y no delimita controles; no debe usarse como borde de un control interactivo.
- El texto desactivado está exento de AA según WCAG, pero aun así se mide y cumple.

## Open Questions
- [NEEDS CLARIFICATION: la maqueta cubre Panel, Plan diario, Vocabulario, la hoja de estados, el diálogo de ruta y el cajón móvil. ¿Se aprueba aplicar el mismo esqueleto a las otras 15 vistas sin maqueta propia, o se quiere ver antes alguna (por ejemplo Simulacro o Writing, que tienen más estados)?]
- [NEEDS CLARIFICATION: "Ajustes" y "Cuenta" están en el pie del lateral, fuera de los grupos "Estudiar" y "Atajos". ¿De acuerdo, o deben ir dentro de "Atajos"?]
- [NEEDS CLARIFICATION: el tema oscuro mantiene el naranja #FE7F2D con texto negro (8,29:1). ¿Se acepta igual en oscuro o se prefiere un naranja algo más apagado?]
- [NEEDS CLARIFICATION: Instrument Sans se carga hoy desde Google Fonts en la maqueta. En la app, ¿se sirve la fuente desde el propio sitio (funciona sin conexión, ya que la app es offline-first) o se acepta la dependencia externa?]

## Dependencies
- Paleta v2 ya presente en `src/styles/global.css` (rama `redesign/ui`).
- `specs/selector-de-ruta/`: define el comportamiento del diálogo de ruta; este rediseño solo le da piel.
- Aprobación de la maqueta `docs/diseno/maqueta-rediseno.html` antes de tocar `src/`.
- Suite de tests de interfaz (no existe): para medir AC-13, AC-15, AC-17 y AC-18 de forma repetible hace falta montarla como primera tarea del plan.
