# Landing y acceso con cuenta

## Overview
Hoy la app entera funciona sin cuenta: quien entra estudia, su progreso vive en el navegador y la cuenta (enlace mágico) es un añadido para sincronizar. Eso hace imposible que el servidor conozca a cada estudiante, que es justo lo que necesita el agente del harness (`specs/harness-alumno/`), y deja el progreso atado a un navegador que se puede borrar.

Esta feature separa dos espacios:

1. **Landing pública**: una página de entrada que explica qué es la ruta y deja **probar** unas cuantas actividades de inglés reales sin cuenta. Lo que se hace ahí no se guarda.
2. **La app**: plan, progreso, módulos de estudio, tutor y agente. **Requiere cuenta.** No hay plan gratuito ni de pago: sin cuenta = muestra; con cuenta = todo.

Dos garantías para quien ya estudia: el progreso que tiene hoy en su navegador **sube a su cuenta** la primera vez que entra (nada se pierde), y quien ya entró **sigue pudiendo estudiar sin conexión** (PWA); lo hecho offline se sincroniza al volver la red.

Decidido por el dueño el 2026-11-05 (landing + acceso, subir progreso local, estudio offline con cuenta). Enmienda el principio 8 de la constitución.

### Cómo es hoy (medido en el código, 2026-11-05)
- Cuentas por enlace mágico: `auth-request`, `auth-verify`, `auth-session` (sesión `Bearer`). Se pueden apagar por entorno (`accounts_off`).
- `progress`: una fila por usuario con `data jsonb`, versión y fecha; conflicto de versión → `version_conflict` 409.
- El estado local vive en `localStorage` (y una cola en IndexedDB); el cliente lo sube si hay sesión.
- IA: cupo anónimo (`anon_limit`) para invitados, cupo por usuario con cuenta, y la opción de **clave propia** de DeepSeek en Ajustes.
- Onboarding: elegir ruta (A2→B1 o B1→B2) + diagnóstico de diez preguntas.

## Usuarios
- **Visitante sin cuenta**: llega a la landing, prueba, decide si crea cuenta.
- **Estudiante nuevo**: crea cuenta y empieza desde cero (elige ruta, diagnóstico).
- **Estudiante existente sin cuenta**: lleva semanas estudiando en este navegador; al entrar no puede perder nada.
- **Estudiante con cuenta**: estudia en uno o varios dispositivos, a veces sin conexión.
- **Dueño**: necesita que todo el uso de la app (y de la IA) esté asociado a una cuenta.

## User Stories
- Como visitante, quiero ver en un minuto qué es esto y probar algo real antes de dar mi correo.
- Como visitante, quiero entrar o crear cuenta desde la landing con solo mi correo.
- Como estudiante que ya llevaba progreso sin cuenta, quiero que al entrar la primera vez todo mi progreso aparezca en mi cuenta.
- Como estudiante con cuenta, quiero seguir estudiando en el metro sin conexión y que al volver se guarde todo.
- Como estudiante con cuenta en dos dispositivos, quiero que ninguno de los dos borre lo que hice en el otro.
- Como dueño, quiero que la IA del servidor solo la use quien tiene cuenta.

## Acceptance Criteria

### Landing
- [ ] AC-1: Quien abre la app sin sesión ve la landing, no la app. Ninguna vista de estudio (Panel, Plan, módulos, Tutor, Ajustes, Cuenta) es accesible sin sesión; al intentarlo por URL directa vuelve a la landing.
- [ ] AC-2: La landing explica en una pantalla qué es la ruta (niveles A2→B1 y B1→B2, plan de 24 semanas, qué se practica) con texto real y una única acción principal: "Entrar con tu correo".
- [ ] AC-3: La landing ofrece una muestra jugable sin cuenta: al menos una actividad de cada tipo listado en "Muestra" (abajo), con contenido real de `src/data/` y corrección inmediata.
- [ ] AC-4: Nada de lo hecho en la muestra se guarda en el navegador ni en el servidor, con una sola excepción: el resultado del diagnóstico (AC-6b). Al recargar, la muestra empieza de cero. Test.
- [ ] AC-5: La muestra no llama a la IA ni a ningún endpoint con coste. Test (cero peticiones a `/api/ai/*` desde la landing).
- [ ] AC-6: Al terminar cada actividad de muestra se ofrece entrar con el correo, sin bloquear seguir probando. El mensaje dice qué gana al entrar, con su resultado concreto: guardar el progreso, plan de 24 semanas, seguimiento personal y agente que adapta el estudio a sus errores.
- [ ] AC-6b: El diagnóstico gratuito es completo (las diez preguntas de su ruta) y da un resultado de nivel por destreza. Si el visitante entra con su correo en esa misma pestaña, el resultado pasa a su cuenta como punto de partida del seguimiento y no tiene que repetirlo. Si cierra la pestaña, el resultado se pierde.
- [ ] AC-7: La landing funciona sin conexión una vez cargada (está en el precache de la PWA).

### Entrada
- [ ] AC-8: Entrar = escribir el correo → recibir enlace mágico → abrirlo → dentro. El mismo flujo sirve para cuenta nueva y existente (no hay registro aparte ni contraseña).
- [ ] AC-9: Tras entrar por primera vez sin progreso previo, el estudiante pasa por el onboarding actual (elegir ruta + diagnóstico).
- [ ] AC-10: Errores del flujo con mensaje claro y sin perder lo escrito: correo inválido, envío fallido, enlace caducado o ya usado, demasiados intentos.
- [ ] AC-11: Si las cuentas están apagadas en el servidor (`accounts_off`), la landing lo dice ("la entrada no está disponible ahora") y no deja esperar un correo que no llegará.

### Progreso local → cuenta
- [ ] AC-12: Si al entrar hay progreso local en el navegador (de antes de esta feature) y la cuenta no tiene progreso, el progreso local se sube completo a la cuenta. Después, la app muestra exactamente lo mismo que antes de entrar: semana y día, gramática, tarjetas, palabras propias, cuaderno de errores, simulacros, textos. Test con un estado local real.
- [ ] AC-13: Si hay progreso local **y** la cuenta ya tiene progreso, no se sobrescribe ninguno en silencio. [NEEDS CLARIFICATION: ¿se pregunta al estudiante cuál conservar, o se fusionan (unión de tarjetas, errores y marcas; el más avanzado en plan)?]
- [ ] AC-14: El progreso local no se borra del navegador al subirlo (principio 6); queda como copia hasta que el servidor confirma la versión.
- [ ] AC-15: La subida no cambia la forma ni las claves de lo guardado (principio 6). Test: el blob subido es byte a byte el local, más campos nuevos opcionales si los hay.

### Sesión y estudio sin conexión
- [ ] AC-16: Quien ya entró en un dispositivo puede abrir la app y estudiar todos los módulos sin conexión. Lo que no puede funcionar offline (IA, correo) lo dice en el sitio, sin romper la vista.
- [ ] AC-17: Lo hecho sin conexión se guarda en local y se sincroniza al volver la red, sin acción del estudiante.
- [ ] AC-18: Si la sesión caduca estando sin conexión, el estudiante sigue estudiando; al volver la red se le pide entrar otra vez y entonces se sincroniza lo pendiente. Nada se pierde.
- [ ] AC-19: Dos dispositivos con la misma cuenta: un cambio hecho en uno no borra uno hecho en el otro (el conflicto de versión `version_conflict` se resuelve sin pérdida). Test.
- [ ] AC-20: Salir de la cuenta en un dispositivo vuelve a la landing. [NEEDS CLARIFICATION: ¿al salir se borra el progreso local de ese dispositivo (privacidad en ordenadores compartidos) o se conserva hasta que entre otra cuenta?]

### Bienvenida y seguimiento
- [ ] AC-24: El seguimiento del estudiante empieza en su primera entrada. Su punto de partida es el diagnóstico (de la landing o del onboarding) más el progreso local subido, si lo había.
- [ ] AC-25: Tras el diagnóstico de la primera entrada, el agente da la bienvenida con un mensaje propio de ese estudiante: nivel estimado por destreza, los tres puntos en los que empezar y qué toca hoy en el plan. No es un texto fijo: dos estudiantes con diagnósticos distintos reciben mensajes distintos. Si la IA no está disponible, se muestra la misma información sin redactar por el modelo (sale del perfil).
- [ ] AC-26: Existe una vista **Mi seguimiento** donde el estudiante ve lo que la app sabe de él: nivel por destreza y su evolución semana a semana, puntos fuertes, puntos débiles, errores que se repiten y propuestas del agente pendientes. Cada dato dice de dónde sale (qué ejercicios).
- [ ] AC-27: Cada ejercicio, respuesta y sesión de estudio con cuenta alimenta el seguimiento (también lo hecho sin conexión, al sincronizar). El estudiante ve el efecto en Mi seguimiento en la siguiente visita a la vista, sin acción manual.
- [ ] AC-28: El estudiante puede descargar su seguimiento completo (lo define `specs/harness-alumno/`, AC-39).

### IA
- [ ] AC-21: Todos los endpoints de IA exigen sesión. Las peticiones sin sesión reciben 401 sin llamar al modelo. El cupo anónimo deja de usarse.
- [ ] AC-22: [NEEDS CLARIFICATION: la opción de **clave propia** de DeepSeek en Ajustes, ¿se mantiene para estudiantes con cuenta o se quita?]

### Accesibilidad y diseño
- [ ] AC-23: La landing cumple las reglas del rediseño (`specs/rediseno-limpio/`): una acción principal naranja, tokens de color, Instrument Sans, claro y oscuro, foco visible, navegable con teclado, contraste AA.

## Muestra (landing)
Contenido real, sin guardar, sin IA:
- El diagnóstico completo (diez preguntas) de la ruta elegida en la propia landing, con resultado por destreza (AC-6b).
- Una tanda corta de tarjetas de vocabulario (repaso tipo "lo sé / no lo sé").
- Un audio de escucha con el protocolo de tres pases (voz del navegador).
- Un ejercicio de Use of English.

## Non-Goals
- Planes de pago, suscripciones, pruebas gratuitas por tiempo o límites distintos según plan.
- Contraseñas, inicio de sesión con Google/Apple u otros proveedores.
- Guardar la muestra o "continuar la muestra" después de crear la cuenta (salvo el resultado del diagnóstico, AC-6b).
- IA en la landing.
- Cambiar el contenido de estudio (principio 7) o la forma del progreso guardado (principio 6).
- Panel de administración de usuarios nuevo (el admin actual sigue igual).
- Marketing: blog, precios, testimonios, SEO más allá de título y descripción.

## Open Questions
- [NEEDS CLARIFICATION: AC-13 — progreso local y de cuenta a la vez: preguntar o fusionar.]
- [NEEDS CLARIFICATION: AC-20 — al salir, borrar o conservar el progreso local.]
- [NEEDS CLARIFICATION: AC-22 — clave propia de DeepSeek: mantener o quitar.]

## Dependencies
- `specs/backend-separado/`: los endpoints de cuenta y progreso deben existir en Laravel (fase 4) antes de exigir cuenta en producción; mientras, la API Node.
- `specs/rediseno-limpio/`: la landing es una vista nueva del rediseño.
- `specs/harness-alumno/`: deja de tener caso "sin cuenta" (todo estudiante de la app tiene perfil).
- Constitución, principio 8 (enmendado por esta feature).
- Envío de correo (Mailpit en local, proveedor real en producción) para el enlace mágico.
