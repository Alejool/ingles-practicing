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
