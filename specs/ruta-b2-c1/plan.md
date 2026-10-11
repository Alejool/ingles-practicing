# Ruta B2 → C1 — Plan técnico (tramo 1)

Alcance: **tramo 1** del spec. Ruta registrada, diagnóstico, estrategias, rúbrica y recursos, semanas 1–4 con todo lo que abren, marca "en construcción", regla del validador para rutas incompletas, y el código que hace falta para que una tercera ruta —y una incompleta— no rompa ni pierda nada: AC-1 a AC-10, AC-16 a AC-49 en lo que aplica a lo publicado. La paridad completa (AC-11 a AC-15) es del tramo 2 y no se planifica aquí.

## Technical Approach

El README dice que añadir una ruta es crear la carpeta y sumarla a `TRACK_META` y `CARGADORES`. No es así: la lista de rutas está escrita a mano en muchos sitios y varios textos dan por hecho 24 semanas y techo B2.

| Dónde | Qué hay escrito a mano |
|---|---|
| `src/data/types.ts:288`, `src/scripts/state.ts:20` | `TrackId = "a2b1" \| "b1b2"`, definido dos veces |
| `src/scripts/state.ts:79,86,109-110` | `DEF.tracks`, `P()` y `migrate()` solo conocen dos rutas; `migrate()` descarta cualquier otra |
| `src/scripts/sync.ts:176` | `mergeState` solo funde `a2b1` y `b1b2` |
| `netlify/functions/pulse.mts:21`, `readings.mts:35` | `PISTAS = ["a2b1","b1b2"]`; otra ruta se guarda como `b1b2` |
| `scripts/precache.mts:45` | expresión regular con los dos nombres de bundle |
| `scripts/exportar-plan.mts:27-80,134,278,293,318-320` | bloques, examen, metas y pestañas por ruta |
| `scripts/validar-plan.mts:31,53-54,62` | 24 semanas, 120 días y mínimos de lectura y escucha |
| `src/scripts/progress.ts:131-133`, `views/mock.ts:308,325`, `views/reading.ts:256`, `views/uoe.ts:66`, `views/diagnostic.ts:159,224-243`, `views/onboarding.ts:165-198`, `views/plan.ts:385-388` | escala del diagnóstico, escala y nivel del simulacro, nivel de las lecturas generadas, tope de palabras, recomendación de ruta, semana de inicio, calendario de 24 semanas |
| `shared/prompts.ts:66-78,88,147,178,184` | "B1/B2", "nunca por encima de un B2 fuerte", "VERSIÓN B2", "Cambridge B2 First", lecturas solo B1 o B2 |
| `src/data/tracks.ts:82-86`, `src/scripts/track.ts:33` | `precargarOtras` descarga todas las demás rutas a los 1,5 s |

El plan tiene cinco líneas de trabajo:

1. **Una sola lista de rutas** en `shared/tracks.ts` (ids y nivel objetivo), importable por cliente, servidor y scripts. Todos los sitios de la tabla pasan a leerla.
2. **Datos guardados compatibles hacia delante**: `migrate()` y `mergeState` conservan cualquier ruta que encuentren, no solo las que conocen; el servidor deja de borrar las rutas que un cliente no envía.
3. **Carga perezosa real**: se elimina `precargarOtras`; el service worker guarda y calienta contenido por ruta y conserva lo guardado al actualizarse.
4. **Ruta incompleta**: `TrackMeta.disponibles` (semanas publicadas) y `TrackMeta.borrador`; la app calcula todo sobre lo publicado y enseña estados vacíos donde aún no hay contenido.
5. **Contenido C1** en archivos nuevos bajo `src/data/b2c1/`, redactado por tipo, con autocomprobación por tarea y **revisión humana que bloquea la publicación**: la ruta nace como borrador (invisible para los estudiantes, visible para quien revisa) y un test impide quitar la marca sin el registro de revisión.

Nada de `src/data/a2b1` ni `src/data/b1b2` se edita. `db/schema.sql` no cambia: las columnas `track` y `kind` son `text` sin restricción (`db/schema.sql:55,90,115`).

## Supuestos adoptados (pendientes de confirmación del dueño)

| # | Pregunta abierta del spec | Supuesto adoptado |
|---|---|---|
| S-1 | Quién revisa y con qué criterio | Una persona con nivel C2 o docente de inglés, o el dueño; firma por archivo en `src/data/b2c1/revision.json` (revisor, fecha, estado). Aprobado = sin hallazgos altos abiertos en ese archivo. |
| S-2 | Publicado y marcado, u oculto | Publicado a todos con la marca "en construcción" **después** de la revisión. Hasta entonces, borrador: solo se ve con el interruptor de borradores del dispositivo. |
| S-3 | Entrega del tramo 2 | Fuera de este plan. |
| S-4 | Objetivos de la tabla | Los del spec (igualar B1 → B2). El tramo 1 entrega lo que abren las semanas 1–4. |
| S-5 | Simulacro | 30 ítems (8+8+8+6). No hay simulacro en el tramo 1: estado vacío. |
| S-6 | Nombre del examen | "Cambridge C1 Advanced, IELTS 7–8, TOEFL 95–110". |
| S-7 | Nombre de la app | No se cambia. Solo los textos de AC-49. |
| S-8 | Opciones en la escucha | Se mantiene lo que el contrato ya permite; las preguntas del tramo 1 llevan 3 opciones. |
| S-9 | Dejar de precargar la otra ruta | Aceptado: el primer cambio a una ruta nunca abierta tarda lo que tarde su descarga, también entre A2 → B1 y B1 → B2. |
| S-10 | Insignia "las dos rutas" | No se toca (`progress.ts:273`). |
| S-11 | Escala del simulacro en C1 (no preguntado; hace falta para AC-21) | `142 + pct × 0,68` (rango 142–210 de C1 Advanced); etiquetas: < 160 "por debajo de B2", < 180 "B2", < 200 "C1", resto "C2". No se usa en el tramo 1 (no hay simulacro) pero queda definido y con test. |
| S-12 | Escala del diagnóstico en C1 | < 40 "B1+", < 55 "B2.1", < 70 "B2.2", < 82 "C1.1", resto "C1.2", calcada de las otras dos (`progress.ts:131-133`). |
| S-13 | Recomendación de ruta | B1 → B2 con ≥ 90 % en la bienvenida o ≥ 88 % en el diagnóstico propone B2 → C1 (con el aviso de incompleta); B2 → C1 con < 30 % / < 40 % propone B1 → B2. Mismos umbrales que hoy entre las otras dos. |

## Key Decisions

| Decisión | Elección | Motivo |
|---|---|---|
| Fuente única de ids | `shared/tracks.ts`: `TRACK_IDS`, `TrackId`, `esTrackId`, `NIVEL_OBJETIVO` | `shared/` ya lo importan cliente, funciones y scripts (`readings.mts:20`, `ai.ts:11`). El patrón estaba repetido más de tres veces (constitución 5). `types.ts` y `state.ts` reexportan el tipo. |
| Dónde se guarda el progreso C1 | Campo nuevo y opcional `tracks.b2c1` dentro del blob existente `ruta-b1b2-v1` | Es como ya se guarda cada ruta (`state.ts:23,64`) y `P()` ya crea la entrada al vuelo (`state.ts:87`). Una clave aparte protegería frente a pestañas con código viejo, pero obliga a partir guardado, exportación, importación y sincronización en dos; se descarta por simplicidad y el riesgo residual se documenta abajo. |
| `DEF.tracks` | No cambia: sigue con `a2b1` y `b1b2` | Quien nunca abre C1 guarda exactamente el mismo JSON que hoy (AC-35). |
| `migrate()` | Copia las dos rutas de siempre y **además** cualquier otra clave de `raw.tracks` que sea un objeto; una ruta activa desconocida cae a `b1b2` | Compatibilidad hacia delante: una versión futura con una cuarta ruta no perderá datos al pasar por esta. |
| `mergeState` | Recorre la unión de claves de `local.tracks` y `remote.tracks` | Igual. Se extrae a `src/scripts/merge.ts` para poder probarlo: `sync.ts` importa `./api`, que lee `import.meta.env` y no carga en Node. |
| Clientes antiguos que sincronizan (AC-37) | El servidor conserva las rutas guardadas que el cuerpo recibido no trae (`conservarRutas` en `progress.mts`) | Es la única defensa que no depende de la versión del cliente: un cliente viejo sube `tracks` sin `b2c1` y `progress.mts:57` sustituye el documento entero. La fusión del cliente nunca borra una ruta, así que conservarla en servidor no contradice ningún caso de uso. Sin cambio de esquema. |
| Precarga | Se elimina `precargarOtras` y su llamada | AC-39, AC-40 y hallazgo de rendimiento (+83 a +102 KB gz por arranque). |
| Contenido en el service worker | `precache.mts` reparte los bundles por ruta leyendo qué importa el bundle de cada ruta; `sw.js` recibe `CONTENT_BY_TRACK` | Los bundles de lecturas se llaman `reading*.HASH.js` en las tres rutas y por el nombre no se sabe de cuál son (`dist/_assets`). Leer los `import()` del bundle de la ruta es exacto y no toca la configuración de Astro ni renombra archivos de contenido. |
| Guardado al actualizar (AC-44) | En `activate`, antes de borrar las cachés viejas, el SW copia a la nueva lo que siga teniendo la misma URL y vuelve a pedir el contenido de las rutas que estaban guardadas | Hoy `activate` borra todo (`sw.js:48-54`) y el contenido solo vuelve porque la app lo pide al arrancar; sin precarga, la otra ruta guardada se perdería. |
| Ruta incompleta | `TrackMeta.disponibles?: number` | El selector y la bienvenida lo necesitan antes de descargar la ruta. `Track` no cambia (AC-2). El validador comprueba que coincide con `weeks.length`. |
| Bloqueo de publicación | `TrackMeta.borrador?: true` + test que exige `revision.json` completo y con la huella de cada archivo cuando la ruta no es borrador | El revisor necesita ver el contenido dentro de la app; el borrador lo permite sin publicarlo. Quitar la marca sin aprobaciones, o editar un archivo después de aprobado, pone `npm test` en rojo. |
| Ver borradores | Clave de dispositivo `ruta-b1b2-borradores` = `"1"`, que se activa abriendo la app con `?borradores=1` | Sin interfaz nueva. No es un control de acceso (el contenido está en el build): solo evita que un estudiante lo encuentre. |
| Textos por nivel | `src/scripts/nivel.ts` (puro): escala del diagnóstico, escala y etiqueta del simulacro, nivel de lecturas generadas, tope de palabras de transformaciones, semana de inicio, ruta recomendada | Sustituye siete comparaciones `=== "a2b1"` dispersas; testeable; para las dos rutas actuales devuelve exactamente lo de hoy (test de caracterización). |
| Prompts de IA | Campo opcional `target: "B1" \| "B2" \| "C1"` en los payloads, de lista cerrada; ausente = textos de hoy, byte a byte | AC-22 sin cambiar el comportamiento de las otras rutas. Nunca texto libre del cliente en el mensaje de sistema. |
| Ids del contenido C1 | Mismo esquema que las otras rutas para unidades, tareas y partes (`g1`…, `wr1`…, `sp1`…); mazos con ids nuevos y `cat` explícito | El progreso va por ruta (`state.ts:23`) y las vistas ya caen al primer elemento si su selección no existe (`grammar.ts:40`, `vocab.ts:120`, `writing.ts:13`, `speaking.ts:35`). `build.ts:12-23` no se toca. |
| Validador | Se extrae a `scripts/validar-lib.mts` (`validarRuta`, `duplicados`) con CLI fino | Para probar las reglas con rutas de juguete. Lo que se omite en una ruta incompleta se imprime, no se calla (AC-10). |
| Dependencias nuevas | Ninguna | — |

## Data Model

### Tipos

```ts
// shared/tracks.ts (nuevo)
export const TRACK_IDS = ["a2b1", "b1b2", "b2c1"] as const;
export type TrackId = typeof TRACK_IDS[number];
export function esTrackId(v: unknown): v is TrackId;
export const NIVEL_OBJETIVO: Record<TrackId, "B1" | "B2" | "C1">;   // a2b1→B1, b1b2→B2, b2c1→C1

// src/data/tracks.ts
export interface TrackMeta {
  id: TrackId; name: string; who: string; exam: string;
  /** Semanas publicadas. Ausente = ruta completa (24). */
  disponibles?: number;
  /** No se enseña a los estudiantes hasta pasar la revisión. */
  borrador?: true;
}
export function rutasVisibles(verBorradores: boolean): TrackMeta[];

// src/scripts/state.ts — único cambio de forma: el índice admite más claves
export interface AppState { track: TrackId; tracks: Record<string, TrackProgress>; /* resto igual */ }

// src/data/b2c1/revision.json (nuevo; no lo importa index.ts, no llega al navegador)
// { "grammar.ts": { "sha256": "…", "revisor": "…", "fecha": "2026-11-02", "estado": "aprobado" | "pendiente", "hallazgos": "…" }, … }
```

`Level` (`types.ts:3`) gana `"C1"`; es una unión de cadenas usada solo como anotación.

### Persistido: qué es nuevo y por qué lo anterior carga igual

| Qué | Clave / campo | Nuevo | Notas |
|---|---|---|---|
| Progreso de B2 → C1 | `localStorage["ruta-b1b2-v1"].tracks.b2c1` | Campo nuevo y opcional | Forma `TrackProgress`, la misma de las otras rutas. Se crea la primera vez que se entra en la ruta (`state.ts:87`). |
| Ruta activa | `localStorage["ruta-b1b2-v1"].track` | Valor nuevo `"b2c1"` en un campo existente | — |
| Ver borradores | `localStorage["ruta-b1b2-borradores"]` | Clave nueva | Del dispositivo; ausente = no. |
| Progreso sincronizado | tabla `progress`, columna `data` (jsonb) | Clave nueva `tracks.b2c1` dentro del JSON | Sin cambio de esquema. |
| Biblioteca y latido | `shared_readings.track`, `pulse.track` | Valor nuevo `"b2c1"` | Columnas `text`. |

Prueba de que lo guardado carga sin cambios (cada punto es un test que se escribe **antes** de tocar el código, contra el comportamiento actual):

1. `migrate(estadoDeDosRutas)` devuelve un objeto idéntico (`deepEqual`) antes y después del cambio, para tres muestras: formato antiguo de una sola ruta con `tasks`, formato de dos rutas con progreso real, y estado vacío.
2. `JSON.stringify` de un estado de dos rutas cargado y vuelto a guardar es idéntico al de antes: no aparece `b2c1` si no se ha abierto.
3. `mergeState(local, remoto)` con dos rutas da el mismo resultado antes y después.
4. `conservarRutas(previo, entrante)` devuelve `entrante` tal cual cuando trae todas las rutas de `previo`, y cuando `entrante` no tiene `tracks` (formato antiguo).

### Clientes antiguos: qué se garantiza y qué no

Un cliente antiguo es código anterior a esta feature que sigue vivo: una pestaña abierta desde antes del despliegue, o una app instalada que arranca sin red con el esqueleto viejo en caché. Su `migrate()` solo copia `a2b1` y `b1b2` (`state.ts:107-112`) y su `mergeState` solo funde esas dos (`sync.ts:176`).

| Situación | Resultado | Garantía |
|---|---|---|
| Cliente antiguo sincroniza con una cuenta que tiene progreso C1 en el servidor | Sube `tracks` sin `b2c1`; el servidor conserva la `b2c1` guardada | **Garantizado** por `conservarRutas`, siempre que el servidor nuevo esté desplegado antes de que exista progreso C1. En Netlify, Vercel y Docker el front y las funciones se despliegan juntos. |
| Cliente antiguo recibe un conflicto de versión con datos que incluyen `b2c1` | Lo ignora al fundir y vuelve a subir sin ella; el servidor la conserva | **Garantizado**, mismo mecanismo. |
| Cliente nuevo en otro dispositivo baja el progreso | Recibe `b2c1` intacta | **Garantizado**. |
| Cliente antiguo y nuevo en el **mismo navegador** (dos pestañas): el antiguo guarda después | El blob local queda sin `b2c1`: el progreso C1 local se pierde. Con cuenta, vuelve del servidor en la siguiente sincronización del cliente nuevo; sin cuenta, no | **No garantizado.** Es el mismo riesgo de "gana el último que guarda" que ya existe entre pestañas. Mitigación: el aviso "Hay una versión nueva · Actualizar" (`main.ts:216-227`) y que el SW nuevo toma el control al instalarse. |
| Vuelta atrás del despliegue a una versión sin C1 | Igual que la fila anterior para quien no tenga cuenta | **No garantizado.** Antes de revertir, avisar; con cuenta el servidor conserva. |
| Se importa en un cliente antiguo una copia exportada con `b2c1` | Ese navegador descarta `b2c1`; si la ruta activa de la copia era `b2c1`, el arranque falla hasta recargar con red (carga el código nuevo) | **No garantizado.** El archivo de copia sigue íntegro. |
| Cliente antiguo intenta mostrar o estudiar C1 | No puede: no tiene el contenido ni la ruta | No aplica. |
| Cliente de esta versión frente a una futura cuarta ruta | La conserva al cargar, al fundir y al subir | **Garantizado** por `migrate()` y `mergeState` nuevos (tests con una ruta inventada `"zz99"`). |

## Interface Contracts

```ts
// src/scripts/state.ts
export function migrate(raw: any): AppState;                 // pasa a exportarse; conserva rutas desconocidas

// src/scripts/merge.ts (extraído de sync.ts; sync.ts lo reexporta)
export function mergeTrack(local: TrackProgress, remote: Partial<TrackProgress>): TrackProgress;
export function mergeState(local: AppState, remote: Partial<AppState> | null): AppState;

// netlify/functions/progress.mts
export function conservarRutas(previo: { tracks?: Record<string, unknown> } | null, entrante: any): any;

// src/data/tracks.ts
export function cargarTrack(id: TrackId): Promise<Track>;     // sin cambios
// precargarOtras: eliminada

// src/scripts/nivel.ts (puro)
export function escalaDiagnostico(id: TrackId, pct: number): string;
export function escalaSimulacro(id: TrackId, pct: number): { cs: number; nivel: string };
export function nivelLecturaGenerada(id: TrackId): "B1" | "B2" | "C1";
export function palabrasTransformacion(id: TrackId): string;              // "Entre dos y cinco" / "Entre tres y seis"
export function semanaDeInicio(pct: number, semanasDisponibles: number): number;
export function rutaRecomendada(actual: TrackId, pct: number, donde: "bienvenida" | "diagnostico", visibles: TrackId[]): TrackId | null;
export function avance(hechos: number, meta: TrackMeta): string;          // "semana 3 de 4 disponibles"
export function finDeLoPublicado(diasHechos: number, totalDias: number, meta: TrackMeta): boolean;

// shared/prompts.ts
export type Target = "B1" | "B2" | "C1";
// WritingPayload, SpeakingPayload, ErrorPayload, TutorPayload: + target?: Target
// ReadingPayload.level acepta "C1" (4 párrafos de 130–160 palabras)

// scripts/validar-lib.mts
export interface Informe { fallos: string[]; omitidas: string[]; resumen: string }
export function validarRuta(t: Track, meta: TrackMeta, lecturas: number): Informe;
export function duplicados(nueva: Track & { readings: ReadingText[] }, otras: Array<Track & { readings: ReadingText[] }>): string[];

// scripts/precache-lib.mts
export function repartirContenido(bundles: Array<{ ruta: string; codigo: string }>, ids: readonly string[]): Record<string, string[]>;
```

Mensajes del service worker (`public/sw.js`):

| Mensaje | Respuesta | Uso |
|---|---|---|
| `{type:"WARM"}` | `{type:"WARMED", n}` | Como hoy: todo el contenido ("Descargar todo", `settings.ts:256-270`). |
| `{type:"WARM", tracks:["b2c1"]}` | `{type:"WARMED", n}` | Guardar una ruta al elegirla. |
| `{type:"HAS"}` | `{type:"HAS", tracks:["a2b1","b1b2"]}` | Qué rutas están enteras en caché (lo consume `specs/selector-de-ruta`, AC-18). |

Reglas del validador para una ruta incompleta (`meta.disponibles` definido): `weeks.length === disponibles`; días construidos = `disponibles × 5`; se aplican todas las reglas por semana y por día, las de lecturas y audios dentro de rango y las de guion y respuestas; se **omiten y se listan** "24 semanas", "toda unidad se enseña", "todo mazo se programa" y los mínimos de lectura y escucha. Reglas nuevas para toda ruta (como aviso en las completas, como fallo en la incompleta): ningún día lleva a un bloque sin ítems, a una tarea de writing o parte de speaking inexistente, ni a un simulacro si `mocks` está vacío (AC-7).

DOM nuevo (todo con fichas existentes, texto y no solo color):

- Marca de ruta: `<span class="chip warn">En construcción · 4 de 24 semanas</span>` en la bienvenida y en la recomendación del diagnóstico; el selector la pinta con su propio contrato.
- Fin de lo publicado (plan): `<div class="card" role="status">` con título "Hasta aquí llega lo publicado", una frase y tres botones: "Repasar tarjetas vencidas", "Abrir el cuaderno de errores", "Hacer una prueba rápida".
- Estado vacío (simulacro; series de Use of English sin ítems): tarjeta con título, qué habrá y cuándo ("Los simulacros llegan con las semanas 5–24"), sin botón de empezar.

## Implementation Phases

1. **Lista única de rutas** y tipos.
2. **Datos guardados**: `migrate`, `merge.ts`, `conservarRutas`.
3. **Carga perezosa**: fuera la precarga; `precache-lib`, `sw.js` por ruta, "Descargar todo".
4. **Nivel por ruta**: `nivel.ts`, vistas y prompts.
5. **Ruta incompleta en la app**: metadatos, borrador, calendario, fin de lo publicado, estados vacíos, bienvenida y diagnóstico.
6. **Validador y exportador** del plan.
7. **Contenido C1** (redacción por tipo, con autocomprobación) — puede avanzar en paralelo con las fases 2 a 6.
8. **Ensamblado** de la ruta como borrador y comprobaciones automáticas.
9. **Revisión humana** — bloquea la publicación.
10. **Publicación** (quitar borrador), textos del README y build.

## Risks and Mitigations

| Riesgo | Mitigación |
|---|---|
| Contenido C1 con errores sutiles (explicación casi correcta, clave con dos respuestas defendibles) | Autocomprobación en cada tarea de redacción, comprobaciones automáticas (claves en rango, duplicados), y revisión humana por archivo que bloquea la publicación (test de `revision.json`). |
| Pérdida de progreso C1 local por una pestaña con código viejo | Documentado arriba como no garantizado; mitigado por el aviso de actualización y, con cuenta, por el servidor. |
| `conservarRutas` impide borrar una ruta a propósito | Hoy nada lo hace: "Reiniciar" solo borra en local (`main.ts:102-109`). Si el hallazgo B1 de la auditoría decide otra semántica, se revisa esta función. |
| Quitar la precarga deja el cambio de ruta sin estado de carga decente | `specs/selector-de-ruta` va antes (`specs/ORDEN.md`) y trae la carga y el error en texto. |
| El reparto de bundles por ruta falla si cambia la forma en que Vite escribe los `import()` | `repartirContenido` tiene tests con el formato real de `dist/_assets`; si un bundle de contenido queda sin ruta, `precache.mts` falla el build con un mensaje claro en vez de callarlo. |
| El SW nuevo activa sin red y no puede volver a pedir contenido cuyo nombre cambió | Copia lo que conserva la URL; lo demás se pide al arrancar la app como hoy. Verificado a mano. |
| Una regla nueva del validador falla en las rutas existentes, que no se pueden editar | En las rutas completas las reglas nuevas son avisos (no cambian el código de salida) hasta el tramo 2. |
| Vistas que rompen con arrays vacíos (`mock.ts:33-37` con `mocks: []`) | Estados vacíos con guarda explícita; recorrido de las 20 sesiones en navegador (AC-7). |
| `shared/prompts.ts`, `ai-chat.mts`, `readings.mts`, `global.css`, `onboarding.ts`, `diagnostic.ts` también los tocan otras features o los arreglos de seguridad | Orden y reparto de archivos en `specs/ORDEN.md`. |
| El bundle inicial crece por los metadatos de la tercera ruta | Solo se añade una ficha (4 cadenas) y `shared/tracks.ts`; se mide en el build contra la línea base (AC-41: ≤ 2 KB gz). |
| Textos del exportador (`EXAMEN`, `METAS`, `BLOQUES`) son contenido C1 fuera de `src/data` | Entran en la misma revisión humana (fila propia en `revision.json`). |
