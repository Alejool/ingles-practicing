# ADR 0002 — Harness del alumno: PHP decide, el modelo redacta

- Estado: propuesto (pendiente del punto de control 1 del dueño)
- Fecha: 2026-11-05
- Plan: `specs/harness-alumno/plan.md`

## Contexto

El spec pide un bucle de agente sobre DeepSeek que mantenga el conocimiento de cada estudiante (perfil), lo use para explicar, proponer ajustes del plan y generar ejercicios, con límites duros (pasos, tiempo, créditos, contexto), seis herramientas, validación JSON, solo inglés, texto del estudiante no fiable y registro de cada ejecución; tablas nuevas solo de inserción. El dueño añade: diseño mínimo y robusto; el harness debe guiar a cada estudiante según quién es; modelo más ligero y barato posible.

## Opciones

1. **Agente autónomo**: el modelo recibe un resumen grande (2 500 tokens) y decide qué leer, qué proponer y qué generar con hasta 6 pasos. Flexible; caro, poco predecible y difícil de que un modelo ligero lo haga bien dentro de 3 créditos.
2. **Política determinista + modelo acotado**: PHP deriva el perfil, elige el foco (qué punto, nivel, tono, candidatos de propuesta, tipo de ejercicio, siguiente paso) y el modelo solo redacta o genera dentro de ese foco, con herramientas cuyos `enum`/`const` rellena PHP.
3. **Sin modelo**: plantillas fijas. Barato, pero no cumple las capacidades (b) y (d).

Datos: una tabla por concepto (eventos, observaciones, propuestas, decisiones, ejercicios, ejecuciones, instantáneas) / **eventos tipados en una tabla + ejecuciones** / derivar todo del JSON de progreso.

## Decisión

Opción 2, en un único contexto `Learner`. `LearnerProfile` (objeto de valor) + `Guide` (política) deciden antes de llamar; `RunLoop` aplica límites que no dependen del modelo; último turno con `tool_choice` forzado para devolver algo útil. Valores por defecto: 3 pasos (máx. 6), 45 s, 3 créditos, resumen de 600 tokens (máx. 3 000), modelo `deepseek-flash` sin razonamiento por `HARNESS_MODEL`. Datos: `learner_events` (tipos `respuesta`, `punto_partida`, `observacion`, `propuesta`, `decision`, `ejercicio`; índices únicos parciales para idempotencia, una decisión por propuesta y un punto de partida por ruta) y `harness_runs` (una fila al terminar). Reserva única por ejecución en `ai_usage` con el mecanismo atómico existente. Validación con un comprobador mínimo del subconjunto de JSON Schema que se manda al modelo (misma fuente) + reglas semánticas a mano.

## Consecuencias

- Positivas: la mayoría de ejecuciones son de una llamada (≈ 1,2–2,9 créditos en hora punta, la mitad fuera de ella); "revisar mi plan" sin nada que proponer y el "siguiente paso" no gastan; comportamiento predecible y testeable sin red; dos tablas en vez de siete.
- Negativas: menos "inteligencia" del modelo en la elección del foco (es deliberado); `writing` y `speaking` sin datos en esta entrega; reinterpretaciones del spec (AC-5, AC-9, AC-10, AC-16, AC-19, AC-28, AC-31, AC-43, AC-45) listadas en el plan.
- Riesgos: tasa de descarte de un modelo ligero generando ejercicios (se mide en `harness_runs.discarded`); precios variables (por entorno, estimación conservadora).
