# Selector de ruta — Plan técnico

Alcance: el spec completo (AC-1 a AC-35). Publicable con dos rutas; preparado para tres y para una incompleta.

## Technical Approach

Hoy la ruta se cambia con un clic sobre una tarjeta (`src/scripts/nav.ts:44-60`), el error sale por `alert()` (`nav.ts:55`), la descripción vive en `title` (`nav.ts:53`) y en móvil las tarjetas ocupan una franja propia (`src/styles/global.css:226-238`). Nada sabe si hay una tanda en marcha: cada vista guarda su estado en variables de módulo (`views/mock.ts:22-28`, `views/quiz.ts:41-46`, `views/grammar.ts:24`, `views/uoe.ts:27`, `views/vocab.ts:76`, `views/diagnostic.ts:23`, `views/reading.ts:31`).

El plan separa tres piezas:

1. **Lógica pura, con tests** (`src/scripts/selector-ruta.ts`, `src/scripts/sesion.ts`): máquina de estados del selector (lista → confirmar → cargando → error), textos de los avisos, resumen de progreso por ruta, disponibilidad sin conexión y registro de sesiones en curso. Sin DOM, sin `import.meta.env`, imports de valor siempre con extensión `.ts`: es la condición para que corran con `node --experimental-strip-types --test` (los módulos que importan `./api` no cargan en Node porque `api.ts:9` lee `import.meta.env`).
2. **Pintado imperativo, verificado en navegador** (`src/scripts/views/selector.ts`, `src/scripts/dialogo.ts`): un indicador (un botón) y un `<dialog>` nativo abierto con `showModal()`. El `<dialog>` da trampa de foco, Escape, fondo inerte y capa superior sin dependencias; al estar en la capa superior también se ve por encima de una tanda a pantalla completa.
3. **Enganches en las vistas**: cada vista con tanda declara su sesión al pintarse y ofrece una función `cerrar()`; `setTrack` (`src/scripts/track.ts:102-115`) no cambia.

El orden al confirmar es: descargar el contenido → si llega, cerrar sesiones → cambiar → cerrar el diálogo → anunciar. Si la descarga falla no se ha tocado nada: la ruta anterior y la tanda siguen intactas (AC-17).

No se añade ningún dato guardado. El selector lee `S.tracks[id]` para el resumen de progreso y escribe solo `S.track`, como hoy.

## Supuestos adoptados (pendientes de confirmación del dueño)

| # | Pregunta abierta del spec | Supuesto adoptado |
|---|---|---|
| S-1 | Lectura de "que no sea un click para cambiar" | La del spec: cambio deliberado y confirmado (abrir, elegir, confirmar). No se elige ruta automáticamente ni se mueve a Ajustes. |
| S-2 | Dónde vive el indicador en móvil | En la misma línea que la marca (`.brand`), a la derecha. En escritorio, en el lateral donde hoy está `#trackPick`. |
| S-3 | ¿Confirmación siempre? | Siempre (AC-4), haya o no progreso. |
| S-4 | ¿Un texto de writing ya autoguardado es "sesión en curso"? | No. Solo se menciona si hay una respuesta de IA en curso; el texto guardado se conserva. |
| S-5 | Bienvenida de primera visita | Sin confirmación adicional (AC-25). |
| S-6 | Resumen de progreso (AC-8) | "día N de M" o "sin empezar". Sin porcentaje ni fecha. |
| S-7 | AC-18 si no se puede saber qué hay en caché | El aviso previo se da solo cuando el service worker contesta; si no contesta, la ruta se puede elegir y el fallo se trata con AC-17. |
| S-8 | "Sesión del plan" (AC-20) | El plan diario guarda cada paso al responder: se declara como tanda informativa ("el día N queda a medias; lo marcado se conserva"), no hay nada que se pierda. |

## Key Decisions

| Decisión | Elección | Motivo |
|---|---|---|
| Contenedor del selector | `<dialog>` nativo con `showModal()` | Trampa de foco, Escape, `inert` del fondo y capa superior de serie; cero dependencias (constitución 2). Soportado en todos los navegadores que ya exige `target: es2022` (`astro.config.mjs:31`). |
| Elegir ruta | Lista de botones; pulsar uno lleva al paso de confirmar | Tres acciones exactas (abrir, elegir, confirmar) como pide AC-4. Con radios + "Continuar" serían cuatro. |
| Confirmación aparte con sesión en curso (AC-19) | Casilla obligatoria ("Entiendo que se pierde…") que habilita el botón de confirmar | Explícita, operable con teclado, sin un segundo diálogo encadenado. |
| Saber si hay sesión | Registro `sesion.ts`: cada vista declara `{tipo, nombre, pierde, conserva, cerrar}` al pintarse | El estado vive en cada vista; un registro evita que el selector importe ocho vistas y cree ciclos. |
| Orden al confirmar | Descargar primero, cerrar sesiones después | Si la descarga falla, la tanda no se ha destruido (AC-17, AC-19). |
| Errores de carga | Texto dentro del diálogo con `role="alert"` y "Reintentar" | Sustituye el `alert()` de `nav.ts:55` (AC-17). |
| Anuncio del cambio | Región viva persistente `#anuncio` (`role="status"`) + `anunciar()` en `dom.ts` | `toast()` crea y borra un nodo (`dom.ts:39-43`) y no se anuncia; la auditoría lo marca como hallazgo alto. |
| Indicador en móvil | Dentro de `.brand`, en fila | Elimina la franja `.trackpick` de `global.css:234-238`; el contenido sube ~58 px (AC-26). |
| Ruta visible en pantalla completa (AC-23) | `pantallaCompleta()` añade una línea "Ruta: …" a la vista en sesión | En móvil `body.sesion-activa` oculta el lateral (`global.css:364`). Para cambiar hay que salir de la tanda: no hay camino que salte AC-19/20. |
| Disponibilidad sin conexión (AC-18) | Mensaje `HAS` al service worker con tiempo límite de 400 ms; sin respuesta = desconocido | En `npm run dev` no hay SW y los SW antiguos no conocen el mensaje; lo desconocido cae en AC-17 (supuesto S-7). |
| Precarga de la otra ruta | No se toca en esta feature | La quita `specs/ruta-b2-c1` (fase de carga perezosa). El selector ya trata la descarga y su fallo, así que funciona igual con o sin precarga. |
| Bienvenida | La tarjeta deja de asignar `S.track` sin contenido; se cambia con `setTrack` al avanzar o al saltar | Arregla el hallazgo "Saltar cambia de ruta sin contenido" (`onboarding.ts:81-86`): hoy `T()` lanza. |
| Dependencias nuevas | Ninguna | — |

## Data Model

Nada persistido cambia. Prueba: los únicos accesos a almacenamiento son la lectura de `S.tracks` y la escritura de `S.track` que ya hace `setTrack` (`track.ts:112-113`). No hay claves nuevas de `localStorage`. Un test de caracterización (`tests/selector-ruta.test.mts`) comprueba que `resumenProgreso` no muta el progreso que recibe.

```ts
// src/scripts/sesion.ts — en memoria, nunca guardado
export type TipoSesion = "simulacro" | "tanda" | "ia" | "informativa";
export interface SesionActiva {
  tipo: TipoSesion;
  /** "Simulacro 2", "Gramática · unidad 3". */
  nombre: string;
  /** Qué se pierde al cambiar, en una frase. Vacío si nada. */
  pierde: string;
  /** Qué se conserva, en una frase. */
  conserva: string;
  /** Deja la vista en reposo: para relojes, audio y pantalla completa. Sin confirmaciones. */
  cerrar: () => void;
}

// src/scripts/selector-ruta.ts — estado del diálogo, en memoria
export type Fase = "cerrado" | "lista" | "confirmar" | "cargando" | "error";
export interface EstadoSelector {
  fase: Fase;
  activa: TrackId;
  elegida: TrackId | null;
  /** Casilla de AC-19 marcada. */
  aceptaPerder: boolean;
  error: string | null;
}
export type Accion =
  | { t: "abrir" } | { t: "elegir"; id: TrackId } | { t: "volver" }
  | { t: "aceptar"; valor: boolean } | { t: "confirmar" }
  | { t: "cargada" } | { t: "fallo"; mensaje: string }
  | { t: "reintentar" } | { t: "cancelar" };

export interface OpcionRuta {
  id: TrackId; name: string; who: string; exam: string;
  activa: boolean;
  /** "día 37 de 120" | "sin empezar" */
  progreso: string;
  /** "En construcción · 4 de 24 semanas" | null */
  marca: string | null;
  /** false = no descargada y sin conexión. */
  disponible: boolean;
}
export interface Aviso { clase: "progreso" | "construccion" | "sesion" | "ia"; texto: string }
```

`TrackMeta` (`src/data/tracks.ts:16-21`) gana un campo opcional `disponibles?: number` (semanas publicadas; ausente = ruta completa). Lo crea `specs/ruta-b2-c1`; aquí solo se lee, y con dos rutas completas nunca está presente.

## Interface Contracts

### Módulos puros

```ts
// src/scripts/sesion.ts
export function declararSesion(id: string, s: SesionActiva | null): void;
export function sesionesActivas(): SesionActiva[];
export function cerrarSesiones(): void;           // llama a cerrar() de todas y vacía el registro

// src/scripts/selector-ruta.ts
export const ESTADO_INICIAL: (activa: TrackId) => EstadoSelector;
export function reducir(e: EstadoSelector, a: Accion, ctx: { haySesionQueSePierde: boolean }): EstadoSelector;
export function resumenProgreso(p: Partial<TrackProgress> | undefined, totalDias: number): string;
export function diaActual(dias: Record<string, boolean>, totalDias: number): number;
export function marcaConstruccion(meta: TrackMeta): string | null;
export function etiquetaIndicador(meta: TrackMeta): string;   // "Ruta actual: B1 → B2. Cambiar de ruta"
export function opciones(metas: TrackMeta[], activa: TrackId, tracks: Record<string, Partial<TrackProgress>>,
  disp: { enLinea: boolean; enMemoria: TrackId[]; enCache: TrackId[] | null }): OpcionRuta[];
export function avisos(origen: TrackMeta, destino: TrackMeta, sesiones: SesionActiva[], iaEnCurso: boolean): Aviso[];
export function textoConfirmar(destino: TrackMeta): string;   // "Cambiar a B2 → C1"
```

Reglas de `reducir` que fijan los tests: elegir la ruta activa cierra sin cambios (AC-6); `confirmar` se ignora si hay sesión que se pierde y `aceptaPerder` es falso (AC-19); en `cargando` solo se aceptan `cargada` y `fallo` (AC-16); `cancelar` y Escape devuelven a `cerrado` sin tocar `activa` (AC-9); `fallo` deja `activa` como estaba (AC-17).

### Pintado

```ts
// src/scripts/dialogo.ts
export interface Dialogo { raiz: HTMLDialogElement; cuerpo: HTMLElement; cerrar(): void }
export function abrirDialogo(o: {
  titulo: string; idTitulo: string; describeId?: string;
  alCancelar: () => boolean;      // false = no cerrar (durante la carga)
  volverA: HTMLElement | (() => HTMLElement | null);
  clase?: string;
}): Dialogo;

// src/scripts/dom.ts
export function anunciar(mensaje: string): void;   // escribe en #anuncio

// src/scripts/views/selector.ts
export function montarIndicador(): void;                       // sustituye a buildTrackPicker()
export function abrirSelector(): void;
export function pedirCambioDeRuta(id: TrackId): void;          // abre directamente en "confirmar" (AC-24)
```

`nav.ts` conserva `buildTrackPicker` como alias de `montarIndicador` para no tocar `main.ts:11,74,112,138` más de lo necesario.

### DOM y ARIA

Indicador (dentro de `#trackPick`):

```html
<button type="button" id="rutaBtn" class="ruta-ind" aria-haspopup="dialog"
        aria-label="Ruta actual: B1 → B2. Cambiar de ruta">
  <span class="tlabel">Tu ruta</span>
  <span class="tname">B1 → B2</span>
  <span class="ruta-accion">Cambiar</span>
</button>
```

Diálogo, paso "lista":

```html
<dialog class="dlg dlg-ruta" aria-labelledby="rutaT">
  <h2 id="rutaT">Elige tu ruta</h2>
  <ul class="ruta-lista">
    <li><button type="button" class="ruta-op" aria-current="true">
      <span class="tname">B1 → B2</span> <span class="chip a">Ruta actual</span>
      <span class="ruta-who">…para quién es…</span>
      <span class="ruta-exam">Cambridge B2 First…</span>
      <span class="ruta-prog">día 37 de 120</span>
    </button></li>
    <li><button type="button" class="ruta-op" aria-disabled="true" aria-describedby="rutaNo-b2c1">…
      <span class="chip warn">En construcción · 4 de 24 semanas</span>
      <span id="rutaNo-b2c1" class="ruta-no">No disponible sin conexión</span>
    </button></li>
  </ul>
  <button type="button" class="btn ghost">Cerrar</button>
</dialog>
```

Paso "confirmar" (mismo `<dialog>`, `aria-describedby="rutaAvisos"`):

```html
<h2 id="rutaT">Cambiar a B2 → C1</h2>
<div id="rutaAvisos">            <!-- antes de los botones en el orden de lectura: AC-31 -->
  <p>Tu progreso en B1 → B2 se queda como está. Cada ruta lleva el suyo y puedes volver cuando quieras.</p>
  <p>La racha, el cuaderno de errores y los ajustes son los mismos en todas las rutas.</p>
  <p class="aviso warn">B2 → C1 está en construcción: tiene 4 de 24 semanas.</p>
  <p class="aviso bad">Tienes un simulacro en curso. Si cambias, se pierde lo respondido.</p>
</div>
<label class="ruta-acepto"><input type="checkbox" id="rutaAcepto"> Entiendo que se pierde el simulacro en curso</label>
<p role="status" id="rutaEstado"></p>     <!-- "Descargando B2 → C1…" -->
<p role="alert" id="rutaError"></p>       <!-- motivo del fallo + Reintentar -->
<button type="button" class="btn" id="rutaOk">Cambiar a B2 → C1</button>
<button type="button" class="btn ghost" id="rutaCancel">Cancelar</button>
```

- Foco: al abrir, al `<h2>` (`tabindex="-1"`); al pasar a confirmar, de nuevo al `<h2>`; al cerrar, a `#rutaBtn` (o al botón que llamó a `pedirCambioDeRuta`).
- Escape = cancelar. Durante la carga `alCancelar` devuelve `false` y el evento `cancel` se anula.
- Estados expuestos: activa `aria-current="true"` + chip de texto; no disponible `aria-disabled="true"` + texto enlazado; botón de confirmar `aria-disabled` mientras falte la casilla.
- Dianas de 44 × 44 px: `.ruta-ind`, `.ruta-op` y los botones del diálogo se suman a la regla táctil existente de `global.css:326`.
- Colores: solo fichas (`--surface`, `--line-2`, `--accent-soft`, `--accent-ink`, `--warn-soft`, `--bad-soft`); `--fill` solo como fondo del botón de confirmar con `--on-fill`. `::backdrop` con `--ink` y opacidad.
- 320 px: el diálogo ocupa `min(560px, 100vw - 24px)`, `max-height: 90dvh`, desplazamiento interno; el texto de cada opción hace salto de línea (sin `white-space:nowrap`).
- `prefers-reduced-motion`: sin animación de apertura (la regla global de `global.css:50` ya la anula; no se añade ninguna).
- Abrir no desplaza el contenido (AC-27): la capa superior no participa en el flujo y no se bloquea el scroll con `overflow:hidden` en `body`.

## Implementation Phases

1. **Base común**: verificación de la suite, `anunciar()` + `#anuncio` + `.sr-only`, `dialogo.ts`. (Lo reutiliza `specs/tutor-contextual`.)
2. **Lógica pura**: `sesion.ts` y `selector-ruta.ts` con sus tests.
3. **Indicador y diálogo**: `views/selector.ts`, `Rail.astro`, CSS, sustitución de `buildTrackPicker`, escucha de la respuesta `HAS`.
4. **Sesiones en curso**: cada vista declara y cierra su sesión; ruta visible en pantalla completa.
5. **Otros caminos**: diagnóstico y bienvenida (AC-24, AC-25) y los arreglos de accesibilidad de la bienvenida.
6. **Verificación en navegador** y build.

## Risks and Mitigations

| Riesgo | Mitigación |
|---|---|
| Una vista no declara su sesión y el cambio la deja a medias | Tras `setTrack`, `renderAll()` ya repinta todo (`main.ts:73-78`); además `cerrarSesiones()` llama a `callar()`, quita `sesion-activa` y aborta la IA aunque el registro esté vacío. Lista de comprobación por vista en la fase 6. |
| Un `cerrar()` lanza y bloquea el cambio | `cerrarSesiones()` envuelve cada llamada en `try/catch` y registra el error en consola; el cambio sigue. Test. |
| `<dialog>` sin `showModal` en un navegador muy antiguo | Comprobación de capacidad: si falta, el indicador abre el mismo contenido en línea dentro del lateral con `role="dialog"`. Verificado a mano, no automatizado. |
| El repintado tras una fusión de sincronización (`main.ts:70`) destruye el botón que abrió el diálogo | `volverA` acepta una función que busca `#rutaBtn` de nuevo. |
| `HAS` sin respuesta deja opciones marcadas mal | Sin respuesta nunca se marca "no disponible" (S-7). |
| Choque de archivos con otras features (`dom.ts`, `global.css`, `main.ts`, `onboarding.ts`, `diagnostic.ts`) | `specs/ORDEN.md` fija el orden: esta feature va primero y las demás parten de sus cambios. |
| Rama `redesign/ui` con cambios de paleta sin revisar | Solo se usan fichas existentes; ninguna tarea toca los bloques de fichas de `global.css:1-46`. |
