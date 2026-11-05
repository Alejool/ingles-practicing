# ADR 0003 — React solo como islas para las features nuevas

- Estado: propuesto (pendiente del punto de control 1 del dueño)
- Fecha: 2026-11-05
- Planes: `specs/harness-alumno/plan.md` (sección "Frontend")

## Contexto

El front es Astro estático sin framework de UI: vistas `.astro` mínimas pintadas de forma imperativa desde `src/scripts/views/*.ts`, PWA offline, sin cuenta. El dueño decide mantener Astro tal cual y usar React solo donde haga falta. Las features nuevas (perfil, propuestas, ejercicios a medida, progreso de una ejecución del harness) son de servidor, con estado remoto, caché, reintentos y formas de respuesta que validar. La constitución pide justificar cada dependencia y no romper lo que funciona sin cuenta ni red.

## Opciones

1. **Vanilla TS** como el resto: cero dependencias; reimplementar a mano caché, invalidación, estados de carga/error y validación de respuestas para cinco o seis pantallas nuevas.
2. **React en islas (`@astrojs/react`, `client:idle`) con TanStack Query y Zod**, limitado a `frontend/src/features/{harness,learner}`; las vistas existentes solo ganan un punto de montaje.
3. **Migrar el front a React**: fuera de alcance y contrario a la decisión del dueño.

## Decisión

Opción 2, con versiones exactas: `@astrojs/react@7.1.2`, `react@19.3.1`, `react-dom@19.3.1`, `@tanstack/react-query@5.106.0`, `zod@4.6.7`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`. Reglas: los servicios son el único sitio con `fetch` (reutilizan `apiUrl()` y `headers()` de `src/scripts/api.ts`); los hooks envuelven TanStack Query; los esquemas Zod viven en `schemas/` y los tipos se infieren; un `QueryClient` compartido; sin sesión ninguna query se activa. Montajes: `Account.astro` y `Plan.astro`. Lo que no es UI (la cola de eventos) es TS puro y lo llama un gancho de una línea en `progress.ts`.

## Justificación de cada dependencia

- `react`, `react-dom`, `@astrojs/react`: componentes con estado para pantallas nuevas; Astro las hidrata solo donde se montan, el resto de la app no carga React.
- `@tanstack/react-query`: caché, invalidación tras decidir una propuesta, reintentos y estados sin código propio.
- `zod`: validar en el cliente lo que llega del servidor (las respuestas del harness vienen de un modelo, aunque el servidor ya valide) e inferir tipos de una sola fuente.

## Consecuencias

- Positivas: las pantallas nuevas tienen estados completos con poco código; lo existente no cambia; offline y sin cuenta, la app no carga ni pide nada nuevo.
- Negativas: dos estilos de código en el front (vanilla y React); ~45 KB gzip de React en las vistas con isla (solo con cuenta); los componentes no tienen tests automáticos (sin Vitest por la constitución): se cubre lo puro con `node:test` y los componentes en navegador.
- Riesgo: compatibilidad de `@astrojs/react` 7.1.2 con la versión de Astro del proyecto; se comprueba al instalar (tarea 10.1 del harness) y se para si exige subir Astro.
