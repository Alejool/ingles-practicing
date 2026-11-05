# ADR 0001 — Backend en Laravel con núcleo hexagonal

- Estado: propuesto (pendiente del punto de control 1 del dueño)
- Fecha: 2026-11-05
- Plan: `specs/backend-separado/plan.md`

## Contexto

La API vive en `netlify/functions/*.mts` y se sirve con tres adaptadores (Netlify, Docker con `server/index.mts`, Vercel). Los límites de tiempo de serverless impiden el harness del alumno (ejecuciones de varios pasos de hasta 45 s). El dueño decidió (2026-11-05) un backend "duro y puro" en Laravel, hexagonal, con migraciones claras y Docker, sustituyendo la decisión anterior de un servidor Node único. La base de producción (Neon) ya tiene siete tablas con datos que no se pueden alterar. Los usuarios instalados no deben notar el cambio: mismas rutas, códigos, JSON, cabeceras y SSE.

## Opciones

1. **Servidor Node único** (spec original): menor riesgo de paridad (mismo código), pero no es lo que pide el dueño.
2. **Laravel "clásico"** (controladores + Eloquent + servicios): rápido de escribir; Eloquent cambia formatos (fechas, `{}` frente a `[]`) y esconde el SQL de la reserva atómica.
3. **Laravel hexagonal mínimo**: `app/Http` como adaptador de entrada; `backend/src/<Contexto>/{Domain,Application,Infrastructure}`; dominio sin framework; SQL portado tal cual; puertos solo donde hay segundo adaptador o test aislado.

Sub-decisiones:
- Base existente: migraciones protegidas con `hasTable` (elegida) / línea base que ejecuta `schema.sql` / marcar migraciones a mano en producción.
- Servidor: nginx + php-fpm (elegida) / FrankenPHP.
- Prompts y saneado compartidos con el cliente: TS como fuente + port PHP verificado con fixtures doradas (elegida) / plantillas JSON comunes / mover el modo clave propia al servidor.
- Tests: PHPUnit 11 en el backend + tests de contrato HTTP independientes del lenguaje (`node:test`) escritos y en verde contra Node antes de escribir PHP.

## Decisión

Opción 3. Laravel 13.40.0 sobre PHP 8.4; PHPUnit 11.5.57. Ocho contextos (`Shared`, `Auth`, `Ai` —con la cuota—, `Progress`, `Library`, `Pulse`, `Admin`, `Learner`); tres puertos (`Clock`, `ChatModel`, `LoginLinkSender`) más `Tool` para el harness. Sin Eloquent. Migraciones espejo de `db/schema.sql`, una por tabla, que no hacen nada si la tabla existe; un test compara el esquema resultante con el de `schema.sql` y, antes del corte, se compara de solo lectura con Neon. nginx sirve el front estático y pasa la API a php-fpm sin búfer. La paridad la define la batería `tests/contract/`.

## Consecuencias

- Positivas: un solo backend desplegable en cualquier VPS con Docker; ejecuciones largas posibles; dominio testeable sin base; el corte es un cambio de DNS con vuelta atrás inmediata (mismo esquema, mismos hashes de sesión e IP, las dos APIs pueden convivir sobre la misma base).
- Negativas: dos implementaciones de prompts y saneado (TS para el cliente, PHP para el servidor), mantenidas iguales por fixtures; trabajo de paridad fina (UTF-16, fechas ISO, `{}`); Symfony añade `private` a `Cache-Control` (aceptado); cada SSE ocupa un worker de fpm; se pierde el modo local con pglite.
- Riesgos: esquema de Neon distinto del archivo (mitigado con la comparación de solo lectura); trabajo en curso sobre la API Node mientras se construye (mitigado congelando la API desde el punto de control 1.13); `deepseek-chat` fuera de la lista actual de DeepSeek (afecta igual a Node; se decide aparte).
- Reversible: hasta la fase 6 (retirada de Node) todo es aditivo; después, la vuelta atrás es redesplegar `master` (que no se ha tocado).
