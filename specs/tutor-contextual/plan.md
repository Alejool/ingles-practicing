# Tutor contextual — Plan técnico

Alcance: la **primera entrega** del spec. Dos puntos de entrada —(a) la regla de cada unidad de gramática y (b) las preguntas ya corregidas y falladas de drills de gramática, Use of English y prueba rápida— con todos los criterios del spec para ellos (AC-1 a AC-67, salvo los puntos (c)–(g) de AC-1 y las sugeridas de AC-43). Incluye completa la regla "solo si la IA está activa".

**Requisito previo bloqueante**: los arreglos de seguridad (reserva atómica `reservar()` en `netlify/functions/_quota.mts:374-397`, IP no falsificable `clientIp()`/`ipDeProxy()` en `_http.mts:80-106`, saneado `shared/sanitize.ts`) están en el árbol de trabajo sin confirmar ni revisar. Este plan se construye sobre ellos. Ninguna tarea de servidor empieza hasta que estén confirmados en la rama, y la feature **no se publica** hasta que estén desplegados.

## Technical Approach

Cuatro piezas, cada una con su parte pura (con tests) y su parte de pintado (verificada en navegador):

1. **Regla única de disponibilidad** (`src/scripts/ia-disponible.ts`, pura). Hoy `aiReady()` devuelve siempre `true` y nadie la usa (`src/scripts/ai.ts:50-52`). La regla nueva recibe los hechos (clave propia, conexión, si hay servidor, cuota, si hay cuentas, coste de una pregunta) y devuelve uno de tres estados: oculto, activo o inactivo con motivo y salida. Un módulo fino (`ia-estado.ts`) lee esos hechos de `api.ts`/`ai.ts`/`navigator` y avisa a los puntos de entrada pintados cuando cambian.
2. **Tipo de petición nuevo en el servidor**: `kind: "explain"` en `shared/prompts.ts`. El cliente manda datos acotados del tema o ítem, la última pregunta y respuesta, y un identificador de pregunta sugerida o una pregunta libre; el servidor compone un único mensaje de sistema y un único mensaje de usuario. No se aceptan turnos con rol `assistant` del cliente: el intercambio anterior viaja como texto citado dentro del mensaje de usuario, así que no se puede falsificar el rol (resuelve para este tipo el hallazgo "el tutor acepta turnos del asistente").
3. **Conversación en memoria** (`ayuda-conversacion.ts`, pura): un `Map` por visita con la conversación de cada tema o ítem, el tope de 6 preguntas, las sugeridas ya usadas y el texto parcial de una respuesta cancelada. Nada se guarda ni se sincroniza.
4. **Panel de ayuda** (`views/ayuda.ts`): un `<dialog>` modal (reutiliza `src/scripts/dialogo.ts` de `specs/selector-de-ruta`), hoja inferior en móvil y panel lateral en escritorio. Al estar en la capa superior se abre encima de una tanda a pantalla completa sin repintar la vista de debajo: el ejercicio queda exactamente como estaba.

Las respuestas se pintan con `textContent`, nunca con `innerHTML`: el modelo marca el inglés con `[[…]]` y un analizador puro lo convierte en `<span lang="en">`. No hay HTML del modelo que sanear.

Se llama a `streamAi()` directamente (`ai.ts:171`), no a `ask()`: `ask()` encola sin conexión (`ai.ts:303-311`) y eso incumpliría AC-55.

## Supuestos adoptados (pendientes de confirmación del dueño)

| # | Pregunta abierta del spec | Supuesto adoptado |
|---|---|---|
| S-1 | Relación con el módulo Tutor (14) | El Tutor queda como está, con sus cuatro modos. La ayuda enlaza a él al llegar al tope (AC-30). |
| S-2 | Gasto al abrir | Abrir lanza ya la primera explicación (AC-25); el saldo y el coste se ven junto al botón antes de pulsarlo (AC-46). |
| S-3 | Ocultar o desactivar | Reparto por casos del spec: sin servidor y sin clave → oculto; sin conexión → inactivo con motivo; sin créditos → inactivo con salida; comprobación pendiente → oculto. |
| S-4 | Aviso único "con una clave propia se activan las explicaciones" | No se añade: oculto del todo (AC-6). |
| S-5 | Coste | 1 crédito por pregunta. No se tocan los límites de cuota ni los créditos de prueba. |
| S-6 | Límites de brevedad | Los del spec: 80 palabras + 2 ejemplos; 120 palabras y 3 ejemplos; 6 preguntas; 300 caracteres. |
| S-7 | Modelo | Siempre el rápido (`deepseek-chat`) por el servidor compartido, aunque en Ajustes esté el que razona. Con clave propia se respeta el modelo del estudiante: paga él. |
| S-8 | Guardar una explicación en el cuaderno | Fuera. |
| S-9 | Texto del botón | "Explícamelo". |
| S-10 | AC-37 (no resolver preguntas pendientes pegadas) | Mejor esfuerzo verificado: instrucción en el prompt más un filtro determinista en el cliente que no envía una pregunta libre que coincide con un drill sin contestar de esa unidad. |
| S-11 | AC-51 (no cobrar dos veces el reintento) | Anulación acotada en servidor (ver Key Decisions). **Necesita visto bueno de seguridad** antes de implementarse; si se rechaza, AC-51 queda sin cumplir y se documenta. |
| S-12 | Reloj de la prueba rápida (AC-16) | Se pausa mientras la ayuda está abierta. El simulacro no tiene punto de entrada. |

## Key Decisions

| Decisión | Elección | Motivo |
|---|---|---|
| Tipo de petición | `kind: "explain"`, nuevo, con su propio prompt | El modo `explain` del Tutor pide regla, tres ejemplos, contraste y ejercicio (`shared/prompts.ts:91-94`): largo y sin contexto. |
| Historial hacia el modelo | Solo el último intercambio, como texto citado dentro del mensaje de usuario | Impide falsificar turnos de asistente (AC-22, AC-67) y acota los tokens de entrada, que es lo que permite cobrar 1 crédito. |
| Preguntas sugeridas | Identificadores fijos (`ask`); el servidor los traduce a la instrucción | "Fijas por tipo de tema" (AC-40) y más corto que mandar texto. |
| Coste | Reserva de 1 crédito (`creditosEstimados`: `explain: 1`); `max_tokens` 230; entrada total ≤ 2700 caracteres | Con los precios por defecto (`_quota.mts:46-49`): 230 × 1,10 + 900 × 0,27 ≈ 496 micros ≤ 500 (1 crédito). El Tutor reserva 3 (`_quota.mts:134`): se cumple AC-50. Un test fija ambos topes. |
| Modelo en servidor | Para `explain` se ignora `body.model` y se usa `deepseek-chat` | El que razona cuesta el doble (supuesto S-7). |
| `X-Quota-Remaining` | Deja de restar 1 (`ai-chat.mts:130`) | La reserva ya está contada cuando se lee la cuota (`ai-chat.mts:48,120`); hoy resta de más (AC-47). |
| Reintento sin doble cobro (AC-51) | Al reservar un `explain`, se anula la reserva anterior del mismo dispositivo o usuario si es `explain`, tiene menos de 60 s, no registró tokens y no se ha anulado ninguna otra en los últimos 60 s. Al terminar un stream, `flush` pone `ok = true` | Solo se libra una llamada que no terminó; una que termina siempre se cobra. Las filas anuladas siguen contando para el límite por minuto (`_quota.mts:292-296` no filtra por `ok`). Gasto no contabilizado acotado a la entrada de una llamada por minuto y actor. Alternativa descartada: reutilizar la fila (se saltaría el límite de ritmo). |
| Disponibilidad con la app cerrada y sin red | Se recuerda el último "hay servidor" en una clave nueva de `localStorage` | Sin eso, sin conexión no se distingue "no hay servidor" (oculto, AC-6) de "lo hay pero no llego" (inactivo con motivo, AC-7). |
| Contenedor | `<dialog>` modal de `dialogo.ts` | Foco atrapado, Escape, capa superior (AC-56, AC-57, AC-65); sin dependencias. |
| Marcado del inglés | El modelo envuelve el inglés en `[[…]]`; analizador puro → `<span lang="en" class="en">` | AC-33, AC-34 sin HTML del modelo. Tolera un cierre que aún no ha llegado durante el streaming. |
| Anuncios | Registro con `role="log"` y `aria-live="off"`; región `role="status"` aparte que dice "Escribiendo la explicación…" y, al acabar, el texto completo una vez | El `role="log"` anuncia cada fragmento por defecto (AC-58). |
| Estado inactivo | `aria-disabled="true"` (no `disabled`) + motivo en texto enlazado con `aria-describedby` | Un botón `disabled` no recibe foco: el motivo no sería alcanzable con teclado (AC-12). |
| Dónde aparece el botón | Al final del bloque de explicación del ítem, o en la fila de botones del pie; nunca encima del texto | Aparece cuando responde la comprobación sin mover lo que se está leyendo (AC-10) y sin reservar hueco (AC-6). |
| Dependencias nuevas | Ninguna | — |

## Data Model

### Persistido

| Qué | Clave / campo | Nuevo | Forma |
|---|---|---|---|
| Último "hay servidor de IA" | `localStorage["ruta-b1b2-ia-servidor"]` | Sí, clave nueva | `"1"` o `"0"`. Del dispositivo; no se sincroniza ni se exporta. |
| Uso de IA | tabla `ai_usage`, columna `kind` | No | Valor nuevo `"explain"` en una columna `text` sin restricción (`db/schema.sql:55`). Sin cambio de esquema. |

Nada más. Las conversaciones viven en memoria (AC-66). No se toca `ruta-b1b2-v1` ni `S`: el blob guardado antes de esta feature carga igual porque ningún código de esta feature lee ni escribe en él. Si la clave nueva falta o `localStorage` no está disponible, la regla trata el servidor como "aún no comprobado" (oculto hasta que responda la comprobación).

### En memoria

```ts
// src/scripts/ia-disponible.ts
export interface HechosIA {
  clavePropia: boolean;
  enLinea: boolean;
  /** true/false = lo dijo la última comprobación (o lo recordado); null = aún no se sabe. */
  servidor: boolean | null;
  cuota: { remaining: number; globalRemaining: number; window: "total" | "día";
           resetsAt: string | null; authenticated: boolean } | null;
  cuentas: boolean;
  coste: number;
}
export type EstadoIA =
  | { estado: "oculto"; motivo: "sin_servidor" | "comprobando" }
  | { estado: "activo"; via: "clave" | "servidor"; saldo: number | null; coste: number }
  | { estado: "inactivo"; motivo: "sin_conexion" | "sin_creditos" | "presupuesto_global";
      salida: "entrar" | "esperar" | "clave" | null; renuevaEn: string | null };

// src/scripts/ayuda-conversacion.ts
export type TipoTema = "regla" | "item";
export interface ContextoAyuda {
  /** "gram:g3:regla" · "gram:g3:7" · "uoe:t:t12" · "quiz:<huella del enunciado>" */
  id: string;
  tipo: TipoTema;
  /** Cabecera: "Present perfect vs. past simple" · "Pregunta 4 · tu respuesta: have went" */
  cabecera: string;
  nivel: "B1" | "B2" | "C1";
  titulo: string;
  regla?: string; trampa?: string;
  item?: { enunciado: string; dada: string; correcta: string; porQue: string };
  /** Enunciados sin contestar de la unidad, para el filtro de AC-37. Nunca salen del navegador. */
  pendientes?: string[];
}
export interface Turno { quien: "estudiante" | "tutor"; texto: string; incompleta?: boolean }
export interface Conversacion {
  ctx: ContextoAyuda; turnos: Turno[]; preguntas: number; usadas: string[];
  esperaSolucion: boolean; enCurso: boolean;
}
```

## Interface Contracts

### Petición y respuesta de la IA

`POST /api/ai/chat` (sin endpoint nuevo; `server/index.mts` y `api/[...ruta].ts` no cambian).

```jsonc
{
  "kind": "explain",
  "payload": {
    "topic": "rule" | "item",
    "level": "B1" | "B2" | "C1",          // lista cerrada; otro valor → "B2"
    "title": "…",                          // ≤ 120
    "rule": "…", "trap": "…",              // topic rule · ≤ 500 y ≤ 300, sin etiquetas
    "item": { "q": "…", "given": "…", "correct": "…", "why": "…" },   // topic item · ≤ 300, 120, 120, 350
    "last": { "q": "…", "a": "…" } | null, // último intercambio · ≤ 200 y ≤ 300
    "ask": "first" | "otra_forma" | "mas_ejemplos" | "espanol" | "error_tipico" | "mini_ejercicio"
         | "solucion" | "por_que_mal" | "que_regla" | "otro_igual" | "parecida" | "free",
    "question": "…"                        // solo con ask "free" · ≤ 300
  }
}
```

- `model` del cuerpo se ignora para este `kind`.
- El servidor recorta cada campo, quita etiquetas HTML y rechaza con `422 bad_payload` si falta el contexto del `topic`, si `ask` no está en la lista, si `ask` es de otro tipo de tema, o si `ask: "free"` llega sin pregunta.
- Mensajes al modelo: `[system, user]`. Sistema ≤ 900 caracteres: papel, nivel, español para explicar e inglés entre `[[ ]]`, sin saludos ni estructura de tres secciones, tope de palabras (80 + 2 ejemplos en `first`; 120 y 3 ejemplos en el resto; mini ejercicio de una frase con un hueco y sin solución), "la respuesta correcta y la explicación dadas son la verdad: explícalas, no las cambies", "si te piden más largo, sigue breve y ofrece otra pregunta", "en `rule`, si pegan un ejercicio no lo resuelvas: explica la regla y da un ejemplo distinto", "si no es sobre inglés, dilo en una frase y para".
- `max_tokens`: 230 (`MAX_TOKENS.explain` exportado por `shared/prompts.ts`, usado por el servidor y por la vía de clave propia). Entrada total ≤ 2700 caracteres, fijado por test.
- Coste: reserva de 1 crédito; al terminar se sustituye por el coste real (`ai-chat.mts:109-117`).
- Respuesta: el mismo stream SSE que el resto de tipos, con `X-Quota-Remaining`, `X-Quota-Limit`, `X-Quota-Window`. Errores con los códigos existentes (`too_fast`, `anon_limit`, `user_daily_limit`, `user_monthly_limit`, `global_limit`, `provider_no_credit`, `provider_error`, `not_authenticated`, `bad_payload`).

### Módulos puros

```ts
// shared/prompts.ts (se amplía)
export type AiKind = "writing" | "speaking" | "tutor" | "error" | "reading" | "test" | "explain";
export interface ExplainPayload { /* la forma de arriba */ }
export const MAX_TOKENS: Partial<Record<AiKind, number>>;      // { explain: 230 }
export const EXPLAIN_ASKS: Record<"rule" | "item", readonly string[]>;

// src/scripts/ia-disponible.ts
export const COSTE_EXPLICA = 1;
export function disponibilidadIA(h: HechosIA): EstadoIA;
export function textoEstado(e: EstadoIA): { visible: boolean; activo: boolean; motivo: string; saldo: string; salida: { texto: string; ir: "cuenta" | "ajustes" } | null };

// src/scripts/ayuda-sugeridas.ts
export interface Sugerida { id: string; texto: string }
export function sugeridas(tipo: TipoTema, usadas: string[], esperaSolucion: boolean): Sugerida[];   // 0–4

// src/scripts/ayuda-conversacion.ts
export const MAX_PREGUNTAS = 6; export const MAX_CARACTERES = 300;
export function conversacionDe(ctx: ContextoAyuda): Conversacion;   // la misma en la misma visita (AC-18)
export function nuevaConversacion(ctx: ContextoAyuda): Conversacion;
export function puedePreguntar(c: Conversacion): { ok: boolean; motivo: "tope" | "en_curso" | null };
export function payloadDe(c: Conversacion, ask: string, pregunta?: string): ExplainPayload;
export function esPendiente(pregunta: string, pendientes: string[]): boolean;     // AC-37
export function textoPlano(html: string): string;                                  // quita etiquetas y entidades
export function partirIdiomas(texto: string): Array<{ t: string; en: boolean }>;   // [[…]] → inglés
export function mensajeError(codigo: string | number, cuentas: boolean): { texto: string; reintentar: boolean; salida: "cuenta" | "ajustes" | null };
```

### Módulos con DOM

```ts
// src/scripts/ia-estado.ts
export function estadoIA(): EstadoIA;
export function onEstadoIA(fn: (e: EstadoIA) => void): void;
export function notificarIA(): void;     // lo llama refreshAi() (ai.ts:76); también online/offline y api.onSession

// src/scripts/ai.ts (se amplía, sin cambiar lo existente)
export interface StreamOptions { onText?; signal?; onFin?: (motivo: "stop" | "length" | null) => void }

// src/scripts/views/ayuda.ts
export function botonExplica(ctx: () => ContextoAyuda, opts?: { alAbrir?: () => void; alCerrar?: () => void }): HTMLElement;
export function abrirAyuda(ctx: ContextoAyuda, origen: HTMLElement): void;
```

`botonExplica` devuelve un contenedor que se pinta según `estadoIA()` y se repinta con `onEstadoIA` mientras siga en el documento (los desconectados se descartan). `alAbrir`/`alCerrar` son el enganche del reloj de la prueba rápida.

### DOM y ARIA

Punto de entrada (activo e inactivo):

```html
<div class="explica">
  <button type="button" class="btn ghost small explica-btn" aria-describedby="exp-s1">Explícamelo</button>
  <span id="exp-s1" class="tiny">Te quedan 12 créditos · cada pregunta gasta 1</span>
</div>

<div class="explica">
  <button type="button" class="btn ghost small explica-btn" aria-disabled="true" aria-describedby="exp-s2">Explícamelo</button>
  <span id="exp-s2" class="tiny">Sin conexión: la explicación necesita internet</span>
  <button type="button" class="btn ghost small">Entrar con mi correo</button>   <!-- solo si hay salida -->
</div>
```

Oculto = el contenedor no se inserta. Con clave propia el texto es "Usa tu clave de DeepSeek: no gasta la cuota compartida" (AC-48).

Panel:

```html
<dialog class="dlg dlg-ayuda" aria-labelledby="ayT">
  <header>
    <h2 id="ayT">Explicación: Present perfect vs. past simple</h2>
    <button type="button" class="btn ghost small" aria-label="Cerrar la explicación">Cerrar</button>
  </header>
  <div class="ay-log" role="log" aria-live="off" aria-label="Conversación" tabindex="0">
    <div class="ay-msg tutor"><span class="ay-quien">Tutor</span><p>… <span lang="en" class="en">I have lived here for years</span> …</p></div>
    <div class="ay-msg est"><span class="ay-quien">Tú</span><p>Dame 3 ejemplos más</p></div>
  </div>
  <p class="sr-only" role="status" id="ayEstado"></p>
  <p class="ay-err" role="alert"></p>
  <div class="ay-sug" role="group" aria-label="Preguntas sugeridas">
    <button type="button" class="btn ghost small">Explícamelo de otra forma</button>…
  </div>
  <form class="ay-form">
    <label for="ayIn">Tu pregunta</label>
    <input id="ayIn" type="text" maxlength="300" autocomplete="off" aria-describedby="ayCuenta aySaldo">
    <span id="ayCuenta" class="tiny" aria-live="polite">0 / 300</span>
    <button type="submit" class="btn small">Preguntar</button>
    <button type="button" class="btn ghost small" hidden>Parar</button>
  </form>
  <p id="aySaldo" class="tiny" aria-live="polite">Te quedan 11 créditos · cada pregunta gasta 1</p>
</dialog>
```

- Foco: al abrir, al `<h2>`; al cerrar, al botón de origen o, si ya no existe, al contenedor del ejercicio (`volverA` como función). Escape cierra y cancela la respuesta en curso (AC-17, AC-56).
- Quién habla: texto visible "Tú" / "Tutor", no color ni alineación (AC-59).
- Mientras responde: sugeridas y "Preguntar" con `aria-disabled`; "Parar" visible (AC-32).
- El contador de caracteres se anuncia al llegar a 250 y a 300, no en cada tecla (AC-61).
- Móvil: hoja inferior `max-height: 85dvh`, cabecera pegada arriba con "Cerrar" siempre visible, formulario pegado abajo; con el teclado en pantalla el formulario sigue visible porque el alto usa `dvh` (AC-64). Escritorio: panel a la derecha de 420 px.
- Colores solo de fichas: `--surface`, `--surface-2`, `--line`, `--accent-soft`, `--accent-ink`, `--bad`, `--bad-soft`. `--fill` solo como fondo de "Preguntar". Inglés con `.en` (`global.css:83`).
- Sin animación con `prefers-reduced-motion` (regla global `global.css:50`). Dianas de 44 px en táctil.

## Implementation Phases

1. **Requisitos previos**: arreglos de seguridad confirmados; `dialogo.ts` y `anunciar()` de `specs/selector-de-ruta` (fase 1) disponibles.
2. **Servidor**: `kind: "explain"`, topes, coste, cabecera de cuota, reintento sin doble cobro.
3. **Lógica pura de cliente**: disponibilidad, sugeridas, conversación, errores, marcado de idioma.
4. **Estado de IA y transporte**: `ia-estado.ts`, `max_tokens` y `onFin` en `streamAi`.
5. **Panel y punto de entrada**: `views/ayuda.ts` y CSS.
6. **Enganche en las tres vistas**: gramática, Use of English, prueba rápida.
7. **Verificación en navegador**, casos de prueba del modelo y build.

## Risks and Mitigations

| Riesgo | Mitigación |
|---|---|
| Los arreglos de seguridad cambian en revisión y rompen lo construido encima | Las tareas de servidor no empiezan hasta que estén confirmados; los tests nuevos usan `reservar`/`anularReserva` por su firma pública. |
| La anulación de AC-51 abre gasto no contado | Acotada a una por minuto y actor, solo `explain`, solo filas sin tokens; las anuladas cuentan para el ritmo. Revisión de seguridad obligatoria (S-11) y test de abuso (N reintentos seguidos → solo 1 anulación). |
| El modelo no respeta la brevedad o resuelve un ejercicio pegado | `max_tokens` corta en duro; filtro `esPendiente` en cliente; conjunto de 12 casos manuales en la fase 7 (gasta llamadas reales: solo con permiso). No se puede garantizar al 100 % (S-10). |
| Respuesta cortada por `max_tokens` a media frase | `onFin("length")` marca el turno como incompleto y ofrece "Sigue" como pregunta nueva (AC-54). |
| 230 tokens no bastan para 120 palabras con 3 ejemplos | El prompt pide el tope en palabras; si los casos de la fase 7 se cortan, se sube `MAX_TOKENS.explain` y se baja el tope de entrada manteniendo el test de coste ≤ 1 crédito. |
| Precios cambiados por variable de entorno dejan el coste real en 2 créditos | El test fija el tope con los precios por defecto; se documenta en el plan que subir precios exige revisar `MAX_TOKENS`. |
| `shared/prompts.ts` lo tocan dos features (este plan y el nivel C1) | Orden en `specs/ORDEN.md`: primero este `kind`; el nivel C1 llega después y este tipo ya acepta `level: "C1"`. |
| La vista se repinta con la ayuda abierta (fusión de sincronización, `main.ts:70`) | El `<dialog>` cuelga de `body`, no de la vista; el foco de vuelta usa una función que busca el ejercicio. |
| Doble clic gasta dos veces | `enCurso` bloquea en la conversación (test) y los controles quedan `aria-disabled` mientras responde. |
