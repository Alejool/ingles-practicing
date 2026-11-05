# Orden de ejecución entre features

Cubre las tres listas de tareas —`selector-de-ruta`, `tutor-contextual` (primera entrega) y `ruta-b2-c1` (tramo 1)— y los arreglos de seguridad (tarea F1: `shared/sanitize.ts`, `reservar()` en `_quota.mts`, `clientIp()`/`ipDeProxy()` en `_http.mts`, tests en `tests/`), que hoy están en el árbol de trabajo sin confirmar ni revisar.

Abreviaturas: **SEL** = `specs/selector-de-ruta/tasks.md`, **TUT** = `specs/tutor-contextual/tasks.md`, **C1** = `specs/ruta-b2-c1/tasks.md`, **SEG** = arreglos de seguridad.

## Orden recomendado

1. **SEG** se revisa y se confirma en la rama. Es lo primero porque deja fijos `package.json` (script `test`), `_quota.mts`, `_http.mts`, `ai-chat.mts` y `readings.mts`, que tocan TUT y C1.
2. **SEL** completo (fases 1 a 6). No depende de SEG y trae tres piezas que usan las otras dos: `anunciar()`, `dialogo.ts` y la carga de ruta con estado y error en texto.
3. **C1 fases 1 a 6** (código: lista única de rutas, datos guardados, carga perezosa, nivel, ruta incompleta, validador). La fase 3 quita la precarga: debe ir después de SEL para que el cambio de ruta ya tenga su estado de carga.
4. **TUT** completo. Necesita SEG confirmado y `dialogo.ts` de SEL.
5. **C1 fases 8 a 10** (ensamblado, revisión humana, publicación), cuando el contenido de la fase 7 esté escrito.

**C1 fase 7 (contenido)** no espera a nadie: son archivos nuevos en `src/data/b2c1/` y corre en paralelo con todo lo anterior desde el primer día.

Los pasos 3 y 4 se pueden intercambiar o solapar respetando las dependencias de la tabla siguiente.

## Dependencias

| Tarea | Necesita antes | Motivo |
|---|---|---|
| TUT 1.1 en adelante (todo el servidor) | SEG confirmado | TUT amplía `reservar()` y `ai-chat.mts`. La feature no se publica hasta que SEG esté desplegado. |
| TUT 1.2, 5.x | SEL 1.2 y 1.3 | `anunciar()`, `.sr-only`, `dialogo.ts`. |
| TUT 2.8 | Visto bueno de seguridad (TUT 1.3) | Anulación de reservas incompletas. |
| C1 1.5 | SEG confirmado | Mismo archivo `readings.mts`. |
| C1 3.1 (quitar la precarga) | SEL fase 3 | Sin el selector, un fallo de descarga acaba en `alert()`. |
| C1 3.5 | SEL 3.2 | Ambas tocan el oyente de cambio de ruta en `main.ts`. |
| C1 4.6 y 4.7 (`target` en los prompts) | TUT 2.2 | Mismo archivo `shared/prompts.ts`; el tipo `explain` ya acepta `level: "C1"`. |
| C1 5.5 | SEL fase 5 | Mismos archivos `onboarding.ts` y `diagnostic.ts`. |
| C1 5.6 | SEL fase 3 (o, si no existe, el selector actual) | La tercera ruta y su marca en el selector. |
| C1 5.4 | C1 4.4 y 4.5 | Mismas vistas `mock.ts` y `uoe.ts`. |
| SEL 3.3 (aviso previo de "no disponible sin conexión") | C1 3.4 para tener respuesta | Sin el mensaje `HAS` del service worker el selector funciona igual: lo trata como desconocido. No bloquea. |
| TUT 6.1, 6.2, 6.4 | SEL fase 4 | Mismas vistas `grammar.ts`, `uoe.ts`, `quiz.ts` (SEL añade la declaración de sesión; TUT añade el botón). |
| C1 8.1 (ensamblar) | C1 fases 1, 5, 6 y 7 | Ficha, borrador, validador y contenido. |
| C1 10.x (publicar) | C1 9.5 | Revisión humana aprobada. |

## Archivos que tocan varias listas

Regla: un archivo de esta tabla lo edita una sola lista cada vez, en el orden indicado.

| Archivo | Orden |
|---|---|
| `src/styles/global.css` | SEL → TUT (solo añaden reglas; ninguna toca los bloques de fichas) |
| `src/scripts/dom.ts`, `src/layouts/Base.astro` | SEL |
| `src/scripts/main.ts` | SEL 3.2 → C1 3.5 |
| `src/scripts/ai.ts` | SEL 4.6 → TUT 4.1 y 4.3 |
| `src/scripts/views/grammar.ts`, `quiz.ts` | SEL fase 4 → TUT fase 6 |
| `src/scripts/views/uoe.ts` | SEL 4.3 → TUT 6.2 → C1 4.5 → C1 5.4 |
| `src/scripts/views/mock.ts` | SEL 4.1 → C1 4.4 → C1 5.4 |
| `src/scripts/views/reading.ts` | SEL 4.5 → C1 4.5 |
| `src/scripts/views/speaking.ts`, `tutor.ts` | SEL 4.6 → C1 4.7 |
| `src/scripts/views/plan.ts` | SEL 4.8 → C1 5.3 |
| `src/scripts/views/onboarding.ts`, `diagnostic.ts` | SEL fase 4 y 5 → C1 5.5 |
| `src/data/tracks.ts`, `src/scripts/track.ts` | C1 (3.1 → 5.2 → 8.1 → 10.1) |
| `shared/prompts.ts` | TUT 2.2 → C1 4.7 |
| `netlify/functions/_quota.mts`, `ai-chat.mts` | SEG → TUT fase 2 |
| `netlify/functions/readings.mts` | SEG → C1 1.5 |
| `public/sw.js`, `scripts/precache.mts` | C1 fase 3 |

## Qué puede correr en paralelo sin tocar los mismos archivos

| Grupo | Tareas | Archivos |
|---|---|---|
| A | C1 fase 7 entera (contenido) | solo `src/data/b2c1/*` y `specs/ruta-b2-c1/programa-tramo-1.md` |
| B | SEL fases 1 y 2 | `dom.ts`, `Base.astro`, `global.css`, `dialogo.ts`, `sesion.ts`, `selector-ruta.ts`, `tests/sesion.test.mts`, `tests/selector-ruta.test.mts` |
| C | C1 fases 1 (menos 1.5) y 2 | `shared/tracks.ts`, `data/types.ts`, `state.ts`, `merge.ts`, `sync.ts`, `pulse.mts`, `progress.mts`, `tests/tracks|estado|merge|progress.test.mts` |
| D | TUT fase 3 (lógica pura de cliente) | `ia-disponible.ts`, `ayuda-sugeridas.ts`, `ayuda-conversacion.ts` y sus tests. `ayuda-sugeridas` solo necesita la lista de identificadores del plan; su test de coincidencia con `EXPLAIN_ASKS` se activa cuando exista TUT 2.2 |
| E | C1 6.1 a 6.4 (validador) y C1 3.2 y 3.3 (reparto de bundles) | `scripts/validar-lib.mts`, `scripts/validar-plan.mts`, `scripts/precache-lib.mts`, `scripts/precache.mts`, sus tests |

A, B, C, D y E no comparten ningún archivo entre sí. Más adelante: TUT fase 2 (servidor) corre en paralelo con SEL fases 3 a 5 y con C1 fases 4 a 6, salvo las dependencias de `shared/prompts.ts` de la tabla.

Cada grupo ejecuta su propio punto de control; como `npm test` es común, un test rojo de un grupo bloquea los puntos de control de todos: los tests de caracterización se confirman en verde antes de cambiar el código que fijan.

## Primer grupo que puede empezar ahora mismo

No dependen de SEG, de respuestas del dueño ni entre sí:

| Tarea | Qué es | Archivos que posee |
|---|---|---|
| SEL 1.1 | Verificar `npm test` y `npm run test:plan` | `specs/selector-de-ruta/progress.md` |
| SEL 1.2 | Región viva, `anunciar()`, `.sr-only` | `src/scripts/dom.ts`, `src/layouts/Base.astro`, `src/styles/global.css` |
| SEL 1.3 | `dialogo.ts` | `src/scripts/dialogo.ts`, `src/styles/global.css` (después de 1.2) |
| SEL 2.1 – 2.8 | Registro de sesiones y lógica del selector, con tests | `src/scripts/sesion.ts`, `src/scripts/selector-ruta.ts`, `tests/sesion.test.mts`, `tests/selector-ruta.test.mts` |
| C1 1.1 – 1.4 | Línea base, lista única de rutas, latido | `shared/tracks.ts`, `src/data/types.ts`, `src/scripts/state.ts`, `netlify/functions/pulse.mts`, `tests/tracks.test.mts` |
| C1 2.1 – 2.8 | `migrate`, fusión y servidor compatibles hacia delante | `src/scripts/state.ts`, `src/scripts/merge.ts`, `src/scripts/sync.ts`, `netlify/functions/progress.mts`, `tests/estado.test.mts`, `tests/merge.test.mts`, `tests/progress.test.mts`, `tests/fixtures/*` |
| C1 7.1 – 7.14 | Programa del tramo y contenido C1 por tipo | `specs/ruta-b2-c1/programa-tramo-1.md`, `src/data/b2c1/*` |
| TUT 3.1 – 3.6 | Disponibilidad de IA, sugeridas y conversación, con tests | `src/scripts/ia-disponible.ts`, `src/scripts/ayuda-sugeridas.ts`, `src/scripts/ayuda-conversacion.ts`, `tests/ia-disponible.test.mts`, `tests/ayuda-sugeridas.test.mts`, `tests/ayuda-conversacion.test.mts` |

Nota: `src/scripts/state.ts` lo tocan C1 1.3 y C1 2.x; van en ese orden dentro de la misma lista.

## Lo que sigue esperando una decisión

- Revisión y confirmación de SEG (bloquea el servidor de TUT y C1 1.5).
- Visto bueno de seguridad a la anulación de reservas incompletas (TUT 1.3; sin él, AC-51 del tutor queda abierto).
- Persona que hace la revisión humana del contenido C1 (C1 9.2; sin ella la ruta no pasa de borrador).
- Permiso para gastar unas 12 llamadas reales a la IA en los casos de prueba del modelo (TUT 7.4).
- Los supuestos adoptados al principio de cada `plan.md`.

## Añadido 2026-11-05: backend separado y harness del alumno

Dos features nuevas, solo especificadas (`spec.md`; faltan `plan.md` y `tasks.md`). Abreviaturas: **BES** = `specs/backend-separado/`, **HAR** = `specs/harness-alumno/`.

### Dónde entran en el orden

6. **BES**, después de que SEL esté cerrado y de que C1 (fases de código) y TUT estén en un punto de control. BES mueve `src/` a `frontend/` y `netlify/functions/` a `backend/`: cualquier tarea a medias sobre esos archivos se rebasa a mano. Se hace en un commit de solo movimientos, sin otras ramas abiertas sobre esos archivos, y a continuación se actualizan las rutas de las `tasks.md` pendientes.
7. **TUT fases 1 y 2 (servidor)** pasan a ir **después de BES**: tocan `_quota.mts`, `ai-chat.mts` y `shared/prompts.ts`, que BES mueve. TUT fase 3 (lógica de cliente) puede seguir antes o después; tras BES solo cambian sus rutas.
8. **HAR**, después de BES y de TUT fase 2: reutiliza los puntos de entrada, la regla de disponibilidad y el tipo de petición contextual de TUT (ver "Relación con otras features" en `specs/harness-alumno/spec.md`), y necesita `shared/tracks.ts` (C1 fase 1).

**C1 fase 7 (contenido)** sigue sin esperar a nadie; tras BES sus archivos están en `frontend/src/data/b2c1/` (git sigue el movimiento).

### Dependencias nuevas

| Tarea | Necesita antes | Motivo |
|---|---|---|
| BES (movimiento de archivos) | SEL cerrado; C1 y TUT en punto de control | Evitar conflictos de rutas con trabajo a medias. |
| BES (retirar `netlify.toml`, `vercel.json`, `api/`, `server/index.mts`) | Visto bueno del dueño | Es un borrado; `.agentflow/CONTEXT.md` dice "sin borrados". |
| BES en `master` | VPS listo y OK de despliegue | Un push a `master` publica en Netlify; sin `netlify.toml` el sitio se rompe. |
| TUT 1.x, 2.x | BES | Mismos archivos de servidor. |
| HAR (todo) | BES; TUT fase 2; C1 fase 1 (`shared/tracks.ts`) | Ejecuciones de 45 s no caben en serverless; superficie y tipo de petición de TUT; lista única de rutas. |

### Archivos que tocan varias listas (añadidos)

| Archivo | Orden |
|---|---|
| `netlify/functions/*` → `backend/…` | SEG → C1 1.5 y 2.x → BES (movimiento) → TUT fase 2 → HAR |
| `shared/prompts.ts` | TUT 2.2 → C1 4.7 → HAR (los tres después de BES si BES ya ocurrió) |
| `db/schema.sql` | BES (solo lo mueve) → HAR (añade tablas) |
| `src/**` → `frontend/src/**` | Todas las listas abiertas → BES (movimiento) |

### Lo que espera una decisión (añadido)

- Preguntas abiertas de BES (dónde se publica el front, workspaces, corte de `master`) y de HAR (presupuesto de 3 créditos por ejecución, tipos de ajuste del plan, fuente de eventos, supresión de datos, dependencia para validar JSON).
- Si TUT se mantiene con su servidor pausado hasta BES y el harness la reutiliza (recomendación de `specs/harness-alumno/spec.md`), o se decide otra cosa.

## Añadido 2026-11-05 (2): backend en Laravel hexagonal

Sustituye en lo que choque a la sección anterior (que suponía un backend Node). Planes: `specs/backend-separado/{plan,tasks}.md`, `specs/harness-alumno/{plan,tasks}.md`; ADRs en `docs/adr/0001…0003`.

### Qué cambia en el orden

6. **BES** se hace en este orden interno: contratos HTTP contra la API Node (fase 1) → Laravel en `backend/` + `docker/` (fases 2–5, todo archivos nuevos) → retirada de Node y movimiento del front a `frontend/` (fase 6, con autorización). Mientras dura, `src/` **no se mueve**: SEL, C1 (contenido y cliente) y TUT fase 3 pueden seguir en sus rutas actuales hasta la fase 6.
   - Requisito para empezar BES fase 1: C1 fases 1 y 2 hechas (tocan `pulse.mts`, `progress.mts`, `readings.mts`), para que los contratos fijen ese comportamiento.
   - **Desde BES 1.13 la API Node queda congelada**: cualquier cambio en `netlify/functions/` exige actualizar en la misma tarea el contrato (`tests/contract/`) y su versión en Laravel.
7. **TUT fases 1 y 2 (servidor)** se implementan **en Laravel** después de BES fase 5 (`shared/prompts.ts` sigue siendo la fuente; se regenera `backend/tests/fixtures/prompts.json` y se adapta `Ai\Domain\PromptBuilder`; el arreglo de `X-Quota-Remaining` cambia un contrato en esa misma tarea). Sus rutas de `tasks.md` se reescriben en BES 6.5.
8. **HAR** después de BES (fase 5 como mínimo) y de TUT fase 2; vive en `backend/src/Learner` y `frontend/src/features/{harness,learner}`.

### Archivos que tocan varias listas (añadidos)

| Archivo | Orden |
|---|---|
| `netlify/functions/*` | C1 1.x/2.x → BES 1.13 (congelada) → BES 6.1 (borrado, autorización) |
| `shared/prompts.ts` | TUT 2.2 → C1 4.7 → (cada cambio regenera el fixture del backend); se mueve a `frontend/shared/` en BES 6.2 |
| `db/schema.sql` | congelado (espejo de producción); se mueve a `backend/database/schema.sql` en BES 6.2. HAR no lo toca: sus tablas van por migración |
| `src/scripts/progress.ts`, `views/grammar.ts`, `views/plan.ts` | SEL/TUT/C1 → HAR 10.7 (gancho de eventos y refs) |
| `src/components/views/Account.astro`, `Plan.astro` | → HAR 10.8 (puntos de montaje) |

### Lo que espera una decisión (añadido)

- Punto de control 1 del dueño sobre los dos planes y los ADRs (defaults D-1…D-5 y H-1…H-9).
- Autorizaciones marcadas **[AUT]** en las dos `tasks.md`.
