# Harness del alumno

> **Cambio 2026-11-05 — `specs/landing-y-acceso/`:** la app pasa a exigir cuenta (el principio 8 de la constitución está enmendado). Todo estudiante de la app tiene cuenta y perfil. Los criterios que hablan de "sin cuenta" (AC-3, la sección TUT, "Usuarios") quedan reducidos a: sin conexión, con el harness apagado o con clave propia (si se mantiene, AC-22 de esa spec). Se reescriben al planificar el harness, no antes.

## Overview
Hoy la IA de la app no sabe nada del estudiante. Cada llamada a `/api/ai/chat` es una petición suelta: el cliente manda un tipo (`writing`, `speaking`, `tutor`, `error`, `reading`, `test`) y unos datos acotados, el servidor compone el prompt y hace una sola llamada a DeepSeek. El progreso de quien tiene cuenta está en el servidor, pero como un único JSON opaco (`progress.data`) que ninguna parte del servidor lee. Resultado: el tutor explica igual a quien falla siempre el mismo tiempo verbal que a quien lo domina, nadie detecta errores que se repiten semana tras semana, el plan de 24 semanas no se adapta a nada, y los ejercicios generados (lecturas) no apuntan a lo que el estudiante necesita.

Esta feature añade al backend (ya separado, ver `specs/backend-separado/`) un **harness**: un bucle de agente sobre DeepSeek, con límites duros, que mantiene el conocimiento de cada estudiante con cuenta y lo usa en cuatro capacidades:

1. **Perfil del alumno en el servidor**, derivado de una tabla de eventos de solo inserción (ejercicios hechos, errores, observaciones): nivel por destreza, unidades de gramática débiles, errores recurrentes y vocabulario dominado.
2. **Tutor con contexto**: correcciones y explicaciones que tienen en cuenta ese perfil.
3. **Propuestas de ajuste del plan**: el harness propone, el estudiante acepta o rechaza en la app. El harness nunca cambia el plan por su cuenta y la estructura de 24 semanas no se toca.
4. **Ejercicios a medida** (drills, lecturas, guiones de escucha) dirigidos a los puntos débiles, validados contra un esquema JSON antes de llegar al cliente.

Todo es una **adición** para quien tiene cuenta y la IA del servidor activa. Sin cuenta, sin conexión o con clave propia de DeepSeek, la app funciona exactamente como hoy (constitución, principio 8).

### Cómo es hoy (medido en el código, 2026-11-05)
- `ai-chat.mts`: una llamada por petición, prompts compuestos en el servidor desde `shared/prompts.ts` (`buildMessages(kind, payload)`), reserva atómica de créditos en `ai_usage` antes de llamar (`reservar()`), anulación si falla (`anularReserva()`), coste real después (`recordUsage()`).
- Cuota por coste: 1 crédito = `QUOTA_CREDIT_MICROS` (500 millonésimas de dólar por defecto). Con cuenta: `QUOTA_USER_DAILY` 60 y `QUOTA_USER_MONTHLY` 900 créditos, más `daily_bonus` por usuario; tope global `QUOTA_GLOBAL_DAILY_USD` (3 USD). Una pregunta de tutor reserva 3 créditos (6 con el modelo que razona).
- `progress`: una fila por usuario con `data jsonb` (el estado de la app sin `ai` ni `theme`), versión y fecha. Dentro hay, por ruta: gramática por unidad (`gram`), Use of English (`uoe`), simulacros, writing, estadísticas por tipo (`stats`), tarjetas de repetición espaciada (`srs`), palabras propias (`mine`), pruebas rápidas; y, común, el cuaderno de errores (`errors`).
- El plan de 24 semanas está en `src/data/` (contenido que no se reescribe, principio 7) y lo que el estudiante marca está en su progreso.
- El Tutor (módulo 14) tiene cuatro modos (`general`, `interview`, `exam`, `explain`). `specs/tutor-contextual/` está especificado y planificado pero sin empezar el servidor.
- Las funciones serverless no permiten trabajo de varios pasos de decenas de segundos: por eso esta feature depende de `backend-separado`.

## Usuarios
- **Estudiante con cuenta** (enlace mágico) y la IA del servidor activa: el único que usa el harness.
- **Estudiante sin cuenta o con clave propia**: no ve nada nuevo; la app no cambia para él.
- **Dueño/administrador**: configura los límites por entorno y revisa las ejecuciones (`harness_runs`) para controlar gasto y calidad.

## User Stories
- Como estudiante con cuenta, quiero que el tutor sepa qué me cuesta, para que me explique a partir de mis errores reales y no en abstracto.
- Como estudiante que repite el mismo error, quiero que alguien lo note y me lo diga.
- Como estudiante que va atrasado o adelantado, quiero recibir una propuesta concreta de ajuste del plan y decidir yo si la acepto.
- Como estudiante, quiero ejercicios extra sobre lo que fallo, del mismo tipo que los de la app.
- Como estudiante, quiero poder ver y descargar todo lo que el servidor sabe de mí.
- Como dueño, quiero que ninguna ejecución pueda gastar más de lo fijado ni durar más de lo fijado, y poder ver qué hizo cada una.

## Acceptance Criteria

### Acceso y activación
- [ ] AC-1: Todos los endpoints del harness exigen sesión válida (`Authorization: Bearer`). Sin sesión, con sesión caducada o con usuario bloqueado: 401/403 con el mismo formato de error que el resto de la API, sin llamar al modelo ni escribir nada.
- [ ] AC-2: El harness se activa con una variable de entorno (`HARNESS_ENABLED`, por defecto apagado). Apagado, sus endpoints responden un error explícito de "no disponible" y la app no muestra ninguno de sus puntos de entrada.
- [ ] AC-3: Sin cuenta, sin conexión, sin servidor o con clave propia de DeepSeek, la app se comporta exactamente como antes de esta feature: ningún punto de entrada nuevo visible, ningún error nuevo, ninguna petición nueva al servidor.
- [ ] AC-4: Cada consulta, lectura de perfil, escritura de evento y ejecución está acotada al `user_id` de la sesión. Ninguna herramienta ni endpoint acepta un identificador de usuario del cliente ni del modelo. Test: con dos usuarios, ninguna operación del usuario A devuelve ni escribe datos del B.

### Límites duros (configurables por entorno; valores por defecto)
- [ ] AC-5: **Pasos.** Una ejecución hace como mucho `HARNESS_MAX_STEPS` = 6 llamadas a herramientas. Al alcanzar el tope el bucle se detiene, devuelve lo que tenga (o un aviso si no tiene nada válido) y registra el motivo `max_pasos`. Test con un modelo simulado que pide herramientas sin parar.
- [ ] AC-6: **Tiempo.** Una ejecución dura como mucho `HARNESS_MAX_SECONDS` = 45 s de reloj, contando llamadas al modelo y a herramientas. Al vencer, se aborta la llamada en curso, se devuelve el resultado parcial válido que haya y se registra el motivo `tiempo`. Test con un modelo simulado lento.
- [ ] AC-7: **Créditos por ejecución.** Una ejecución gasta como mucho `HARNESS_MAX_CREDITS` = 3 créditos (en la misma unidad que la cuota actual). Antes de cada llamada al modelo se comprueba que el coste acumulado más el estimado de la siguiente no pase del tope; si pasaría, se para con motivo `presupuesto`. Test con costes simulados.
- [ ] AC-8: **Cuota existente.** Todo el gasto del harness se reserva y se registra en `ai_usage` con el mismo mecanismo atómico que `/api/ai/chat` (`reservar()` antes, coste real después, anulación si falla) y cuenta contra los topes diario, mensual y global de siempre. Sin créditos suficientes para una ejecución completa (3 por defecto) la ejecución no empieza y responde el mismo error de cuota que hoy. Test: N ejecuciones en paralelo con cuota justa para una sola → solo una empieza.
- [ ] AC-9: **Contexto acotado.** El contexto del estudiante que se manda al modelo es un resumen del perfil de entre 2 000 y 3 000 tokens como máximo (`HARNESS_CONTEXT_TOKENS`, por defecto 2 500, tope duro 3 000), compuesto por el servidor de forma determinista (sin llamar al modelo). Nunca se manda el JSON de progreso entero. Test: con un perfil y un progreso grandes, el mensaje enviado no supera el tope y no contiene el JSON de progreso.
- [ ] AC-10: **Herramientas permitidas.** El modelo solo puede llamar a exactamente seis herramientas: `leer_perfil`, `leer_progreso`, `buscar_contenido`, `registrar_observacion`, `proponer_ajuste_plan`, `generar_ejercicio`. Una petición de cualquier otra herramienta (o con un nombre parecido) se rechaza sin ejecutar nada, cuenta como paso y queda registrada. Test.
- [ ] AC-11: **Validación de herramientas.** Los argumentos que el modelo pasa a cada herramienta y lo que cada herramienta devuelve se validan contra su esquema JSON. Argumentos inválidos → la herramienta no se ejecuta y el modelo recibe un error estructurado. Test por herramienta con argumentos de más, de menos y de tipo equivocado.
- [ ] AC-12: **Validación de salidas.** Toda salida del modelo que llega al cliente o a la base (explicación, propuesta, ejercicio, observación) se valida contra su esquema JSON. Una salida inválida se descarta: no se guarda, no se manda al cliente y se registra como descartada. Test.
- [ ] AC-13: **Solo inglés.** Los prompts los compone el servidor (como `shared/prompts.ts`); el cliente solo manda un tipo de ejecución y datos acotados, nunca instrucciones ni turnos "del asistente". Una petición ajena al aprendizaje de inglés recibe una negativa de una frase y no ejecuta herramientas. Test con un conjunto fijo de casos (verificado con modelo simulado; con modelo real solo si el dueño autoriza el gasto).
- [ ] AC-14: **Texto del estudiante no fiable.** Todo texto escrito por el estudiante (respuestas, preguntas, writing) y todo texto guardado que salió del modelo (observaciones) va al modelo como dato delimitado, nunca como instrucción. Un texto que intente cambiar el comportamiento ("ignora lo anterior", "llama a…", "propón borrar el plan") no provoca llamadas a herramientas fuera de las que haría con un texto normal, ni cambia los límites. Test con casos de inyección conocidos contra el bucle con modelo simulado, y comprobación de que los límites (AC-5 a AC-12) no dependen de nada que diga el modelo.
- [ ] AC-15: Todos los topes de AC-5 a AC-9 se leen del entorno con un valor por defecto, y un valor ausente, no numérico o fuera de rango (≤ 0, o por encima de un máximo absoluto que fija el plan) cae al valor por defecto. Test.

### Registro de ejecuciones
- [ ] AC-16: Cada ejecución queda en `harness_runs` (tabla nueva, solo inserción) con: usuario, tipo de ejecución, momento de inicio y fin, pasos (herramienta, validación correcta o no, duración), tokens de entrada y salida, coste en millonésimas y en créditos, motivo de parada (`fin`, `max_pasos`, `tiempo`, `presupuesto`, `cuota`, `error`, `rechazo_tema`) y número de salidas descartadas. No se guarda el texto completo de los prompts. Test: tras una ejecución de cada motivo de parada existe su registro con esos campos.
- [ ] AC-17: Una ejecución que se interrumpe (caída del proceso, error de DeepSeek) deja constancia de que empezó y su reserva de créditos se anula o se ajusta con el mecanismo actual. Nunca queda un gasto sin registro.
- [ ] AC-18: El administrador puede consultar las ejecuciones (filtro por usuario y fecha, totales de coste y motivos de parada) desde el panel de admin existente, con el token de admin actual.

### (a) Perfil del alumno
- [ ] AC-19: Existe una tabla de eventos del estudiante de **solo inserción**: ningún código hace UPDATE ni DELETE sobre ella (lo comprueba un test que busca esas sentencias en el código del backend para las tablas nuevas). Tipos de evento: ejercicio hecho (unidad o ítem, tipo, acierto), error (ítem, categoría, respuesta dada recortada), observación del harness. Cada evento lleva usuario, ruta, momento y versión de esquema.
- [ ] AC-20: El cliente con cuenta envía eventos de ejercicio y de error al servidor en lotes, validados en el servidor (tipos, tamaños, ítems que existen en el contenido de la ruta). Un lote inválido se rechaza entero con 422. Sin conexión, los eventos esperan y se envían después, sin duplicarse (identificador por evento, inserción idempotente).
- [ ] AC-21: Para quien ya tiene progreso en el servidor antes de esta feature, la primera vez se deriva un punto de partida del progreso guardado (`leer_progreso`) sin modificar la fila de `progress`.
- [ ] AC-22: El perfil se deriva de los eventos de forma determinista (sin modelo) y contiene: nivel estimado por destreza (gramática, vocabulario, lectura, escucha, writing, speaking, Use of English), unidades de gramática débiles, errores recurrentes (misma categoría o ítem fallado al menos N veces en una ventana; N lo fija el plan) y vocabulario dominado. Dados los mismos eventos, el perfil es siempre el mismo. Tests unitarios de la derivación.
- [ ] AC-23: Las observaciones que registra el harness (`registrar_observacion`) son estructuradas: categoría de una lista cerrada, referencia a unidad o ítem si la hay, y un texto de 200 caracteres como máximo. Una observación que no cumple el esquema no se guarda.
- [ ] AC-24: El estudiante puede ver su perfil en la app (resumen legible: destrezas, puntos débiles, errores recurrentes, vocabulario dominado) con estados de carga, vacío ("aún no hay datos suficientes") y error.

### (b) Tutor con contexto
- [ ] AC-25: Cuando un estudiante con cuenta pide una explicación o corrección desde los puntos de entrada del tutor (ver "Relación con otras features"), la respuesta tiene en cuenta su perfil: si el tema coincide con un error recurrente o una unidad débil, la explicación lo menciona y usa un ejemplo relacionado con su error. Verificado con un conjunto fijo de casos.
- [ ] AC-26: El tutor con contexto respeta las reglas del tutor contextual: brevedad, idioma, y no revelar respuestas de preguntas aún no contestadas ni ayudar durante un simulacro en curso.
- [ ] AC-27: Si el harness falla, excede un límite o no está activo, el estudiante recibe la explicación sin contexto de siempre (o el mensaje de error de siempre), nunca una pantalla rota.

### (c) Propuestas de ajuste del plan
- [ ] AC-28: El harness solo puede **proponer** (`proponer_ajuste_plan`). Una propuesta tiene un tipo de una lista cerrada (p. ej. añadir un bloque de refuerzo a un día próximo, repetir una unidad, mover un repaso dentro de la misma semana), su motivo en una o dos frases en español, y su efecto exacto. La lista cerrada la fija el plan; ningún tipo quita días, semanas ni contenido, ni cambia la fecha de examen.
- [ ] AC-29: Una propuesta no cambia nada hasta que el estudiante la acepta en la app. Test: tras generar una propuesta, el progreso y el plan que ve el estudiante son idénticos byte a byte.
- [ ] AC-30: El estudiante ve cada propuesta pendiente con su motivo y su efecto, y la acepta o la rechaza con una acción explícita. Aceptar o rechazar se registra como un evento nuevo (no se modifica la propuesta). Una propuesta decidida no vuelve a aparecer.
- [ ] AC-31: Una propuesta aceptada se aplica como capa añadida sobre el plan, guardada en claves nuevas y opcionales del progreso (principio 6): el contenido de `src/data/` no se toca, la estructura de 24 semanas (días y semanas) se conserva, y sin esa capa el plan es el de siempre. Test: progreso anterior a la feature carga igual; progreso con capa en un cliente viejo no se rompe.
- [ ] AC-32: Hay como máximo `HARNESS_MAX_PROPOSALS_PENDING` (por defecto 3) propuestas pendientes a la vez; el harness no genera más mientras haya ese número sin decidir.

### (d) Ejercicios a medida
- [ ] AC-33: `generar_ejercicio` produce drills, lecturas o guiones de escucha con **la misma forma** que el contenido de la app (los tipos de `src/data/types.ts`), de modo que se muestran con los reproductores existentes sin un renderizador nuevo.
- [ ] AC-34: Cada ejercicio generado se valida contra el esquema JSON de su tipo (campos, longitudes, número de opciones, una sola respuesta correcta por pregunta, respuesta correcta presente entre las opciones, nivel de la ruta) antes de llegar al cliente. Inválido → descartado y registrado (AC-12); el estudiante ve "no se pudo generar, inténtalo más tarde" y no se gastan más créditos que los ya consumidos.
- [ ] AC-35: Cada ejercicio declara a qué punto débil del perfil apunta (unidad, categoría de error o palabras), y ese punto existe en el perfil del estudiante. Test.
- [ ] AC-36: Los textos generados pasan por el mismo saneado que las lecturas (`shared/sanitize.ts`) antes de mostrarse.
- [ ] AC-37: Los ejercicios generados son del estudiante: no entran en la biblioteca compartida de lecturas (`shared_readings`) ni los ve nadie más.
- [ ] AC-38: `buscar_contenido` solo busca en el contenido de estudio de la ruta activa del estudiante (gramática, vocabulario, lecturas, escucha del plan), nunca en la web, en datos de otros usuarios ni en la base fuera de esa ruta.

### Datos y privacidad
- [ ] AC-39: El estudiante puede descargar en JSON todo lo que el harness guarda de él: eventos, perfil derivado, observaciones, propuestas y decisiones, ejercicios generados y el resumen de sus ejecuciones (sin prompts).
- [ ] AC-40: Las tablas nuevas referencian `users(id)` con borrado en cascada, como `progress` y `sessions`: si el administrador borra una cuenta por la vía existente, sus datos del harness desaparecen con ella. No hay ningún otro borrado.
- [ ] AC-41: No se guarda en las tablas nuevas el correo, la IP ni el texto completo de writing o speaking; de las respuestas falladas solo se guarda un recorte de longitud máxima fijada en el plan.
- [ ] AC-42: Ningún log del servidor contiene tokens de sesión, el texto del estudiante ni el contenido de los prompts.

### Transversal
- [ ] AC-43: Esquema nuevo solo por adición (`create table if not exists`, índices nuevos) en `db/schema.sql`, idempotente. Ninguna tabla o columna existente cambia, y no hay UPDATE ni DELETE de filas existentes.
- [ ] AC-44: Los puntos de entrada nuevos en la app (perfil, propuestas, ejercicios) usan los componentes y patrones existentes (`dialogo.ts`, `anunciar()`, reproductores de ejercicios, tokens de color): sin rediseño. Teclado, lector de pantalla, contraste AA, tema claro y oscuro, 320 px sin desplazamiento horizontal.
- [ ] AC-45: El harness usa DeepSeek (el proveedor ya configurado) con el modelo rápido; no se añade ningún proveedor de pago nuevo.
- [ ] AC-46: `npm test` en verde con el modelo simulado (ninguna prueba automática gasta llamadas reales); build del front y del back sin errores.

## Non-Goals
- Chat libre con el harness, o cualquier uso como asistente general. El Tutor (módulo 14) sigue como está.
- Que el harness cambie el plan, el progreso, las estadísticas, la repetición espaciada o el cuaderno de errores por su cuenta. Solo propone.
- Cambiar la estructura de 24 semanas, quitar contenido o reescribir `src/data/`.
- Acceso anónimo, o el harness con la clave propia del estudiante en el navegador.
- UPDATE o DELETE de filas existentes, o cambios en tablas existentes. Las tablas nuevas son de solo inserción.
- Un proveedor de IA nuevo o de pago, o un modelo local.
- Rediseño de la UI. Solo puntos de entrada mínimos con los componentes que ya existen.
- Cambiar los límites de cuota existentes, los precios o el valor del crédito.
- Ejecuciones programadas en segundo plano (cron) o notificaciones push: el harness solo corre cuando el estudiante lo pide.
- Herramientas más allá de las seis listadas: ni web, ni correo, ni escritura en el progreso.
- Recomendaciones de examen, de academia o de producto.
- Analítica agregada entre estudiantes a partir de los eventos.

## Datos y privacidad
- **Qué se guarda (nuevo):** eventos del estudiante (ejercicio, error, observación, decisión sobre propuesta), propuestas de ajuste, ejercicios generados y registro de ejecuciones. El perfil se deriva de los eventos; si el plan decide guardar instantáneas para no recalcular, también son de solo inserción.
- **Qué no se guarda:** correo o IP en tablas nuevas, prompts completos, texto completo de writing o speaking, conversaciones del tutor.
- **Aislamiento:** todo por `user_id` de la sesión (AC-4). El modelo nunca ve datos de otro estudiante ni identificadores de usuario.
- **Exportación:** AC-39. **Borrado:** solo el existente, por cuenta, en cascada (AC-40).
- **Envío a terceros:** a DeepSeek solo va el resumen acotado del perfil (AC-9), el contenido de la ruta que haga falta y el texto del estudiante necesario para la petición, igual que hoy con el tutor. Conviene decirlo en la app (ver Open Questions).

## Relación con otras features

### `specs/tutor-contextual/` (TUT)
**Recomendación: mantener TUT, pausar solo su parte de servidor hasta que exista `backend-separado`, y que el harness la reutilice en vez de duplicarla.** No se editan sus archivos; esto queda aquí para que el dueño lo decida.

- **Lo que el harness reutiliza de TUT (no lo vuelve a construir):** los puntos de entrada "Explícamelo" en la regla de cada unidad y en las preguntas falladas; la regla única de disponibilidad de IA (`ia-disponible.ts`); el diálogo, el anuncio a lector de pantalla y el manejo de foco; los límites de brevedad, idioma y "no revela respuestas" (AC-26 de este spec); el nuevo tipo de petición contextual de `ai-chat.mts` con sus topes de entrada y su coste.
- **Lo que el harness añade sobre TUT:** si el estudiante tiene cuenta y el harness está activo, esa misma petición se sirve con el resumen del perfil como contexto (capacidad b). Sin cuenta, sin harness o con clave propia, TUT funciona exactamente como su spec dice. Así se mantiene el principio 8 (la ayuda sigue existiendo sin cuenta) y el harness no crea un segundo tutor.
- **Lo que el harness no sustituye:** nada de TUT queda obsoleto. TUT es la superficie (cliente, accesible, para todos); el harness es una capa de contexto en el servidor para quien tiene cuenta.
- **Conflictos que hay que resolver al planificar:**
  - TUT excluye "generar ejercicios" y "que la IA modifique el progreso"; el harness genera ejercicios y propone ajustes, pero **desde sus propios puntos de entrada**, nunca desde la ayuda contextual. Las dos exclusiones de TUT siguen siendo ciertas dentro de TUT.
  - TUT 1.x y 2.x (servidor: reserva, nuevo tipo en `ai-chat.mts`, `shared/prompts.ts`) tocan los archivos que `backend-separado` mueve. Hacerlas antes del movimiento es posible pero obliga a rehacer rutas; se recomienda hacerlas **después** de `backend-separado`. TUT fase 3 (lógica pura de cliente) puede seguir en cualquier momento, con el coste de actualizar rutas tras el movimiento.
  - TUT AC-67 (el endpoint no acepta instrucciones del cliente, negativa de una frase fuera de tema) es el mismo principio que AC-13 y AC-14 de este spec: una sola implementación de la negativa y del tratamiento del texto del estudiante.
  - Coste: TUT propone que su pregunta gaste como mucho la mitad de una de tutor; el harness añade el resumen del perfil (2–3k tokens de entrada), que sube el coste de esa misma pregunta para quien tiene cuenta. El plan tiene que medirlo y decidir si sigue cabiendo en el tope de TUT o si la versión con contexto tiene su propio coste.

### `specs/backend-separado/`
Requisito bloqueante: ejecuciones de hasta 45 s y varios pasos no caben en una función serverless, y las tablas y endpoints nuevos se escriben una sola vez en el backend único.

### `specs/ruta-b2-c1/`
El harness debe funcionar con las tres rutas (`a2b1`, `b1b2`, `b2c1`) y con una ruta incompleta: `buscar_contenido` y la validación de eventos usan la lista única de rutas (`shared/tracks.ts`, C1 fase 1). Los niveles de los ejercicios generados siguen el nivel de la ruta.

### `specs/refuerzo-seguimiento-recordatorios/`
Su "seguimiento" y el perfil del harness miden cosas parecidas. El perfil del servidor no sustituye al seguimiento local (que funciona sin cuenta); al planificar, el seguimiento puede ser una de las fuentes de eventos.

## Open Questions
- [NEEDS CLARIFICATION: presupuesto de 3 créditos por ejecución. Con el crédito actual (500 millonésimas) son 0,0015 USD × 3. Un resumen de 2,5k tokens enviado en cada uno de hasta 6 pasos, más las salidas, puede no caber en 3 créditos con los precios de DeepSeek: el harness pararía a menudo por `presupuesto` antes de terminar. ¿Se acepta medirlo en el plan con un modelo de costes y, si no cabe, subir el tope por ejecución o reducir el resumen? Hoy una sola pregunta de tutor ya reserva 3.]
- [NEEDS CLARIFICATION: ¿qué dispara una ejecución? Se asume que solo el estudiante: al pedir una explicación (b), al pulsar "revisar mi plan" (c) y al pedir "ejercicios para mis puntos débiles" (d). Alternativa: una ejecución automática al cerrar la semana, que gasta créditos sin pedirlo.]
- [NEEDS CLARIFICATION: tipos permitidos de ajuste del plan. Se propone una lista cerrada solo aditiva: añadir un bloque de refuerzo a un día de los próximos 7, repetir una unidad de gramática, mover un repaso dentro de la misma semana. ¿Alguno más, o alguno de estos sobra?]
- [NEEDS CLARIFICATION: ¿los ejercicios generados se guardan para volver a abrirlos (en el servidor, por estudiante) o son de un solo uso? Se asume que se guardan en el servidor y que el estudiante puede reabrirlos.]
- [NEEDS CLARIFICATION: fuente de eventos. Se asume envío en lote desde el cliente al responder (más preciso). Alternativa sin tocar el cliente: derivar eventos comparando versiones sucesivas del progreso sincronizado (menos preciso, más barato de construir).]
- [NEEDS CLARIFICATION: ¿hace falta un aviso en la app de que, con cuenta, un resumen del perfil se envía a DeepSeek? Se recomienda que sí, una vez, en Ajustes o al activar la primera ejecución.]
- [NEEDS CLARIFICATION: derecho de supresión. El diseño de solo inserción no permite borrar eventos sueltos; el único borrado es el de la cuenta entera. ¿Basta, o el estudiante debe poder borrar su perfil sin borrar la cuenta (lo que exigiría una excepción explícita a "sin DELETE")?]
- [NEEDS CLARIFICATION: validación con esquema JSON. ¿Se permite una dependencia nueva para validar (p. ej. un validador de JSON Schema) o se escriben validadores a mano como `readings-validar`? La constitución pide justificar cada dependencia.]
- [NEEDS CLARIFICATION: ¿el harness usa siempre el modelo rápido o respeta el elegido en Ajustes? Se asume siempre el rápido (el que razona dobla el coste y no cabe en 3 créditos).]
- [NEEDS CLARIFICATION: permiso para gastar llamadas reales a DeepSeek en un conjunto pequeño de casos (tema, inyección, calidad de ejercicios), como en TUT 7.4. Sin él, AC-13, AC-14 y AC-25 quedan verificados solo con modelo simulado.]

## Dependencies
- **Bloqueante:** `specs/backend-separado/` terminado (servidor único en Docker).
- Arreglos de seguridad ya confirmados (reserva atómica, IP no falsificable, saneado): el harness los reutiliza.
- `shared/tracks.ts` (lista única de rutas, `ruta-b2-c1` fase 1) para validar rutas y buscar contenido.
- Acceso del backend al contenido de estudio de cada ruta (`src/data/`, que tras la separación vive en el front): el plan decide cómo (exportación en el build, paquete compartido…), sin duplicar a mano ni reescribir el contenido.
- `specs/tutor-contextual/` para la superficie de la capacidad (b) (ver arriba).
- DeepSeek con la cuota actual; ninguna clave o proveedor nuevo.
