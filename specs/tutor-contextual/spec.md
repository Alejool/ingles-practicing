# Tutor contextual

## Overview
Hoy la ayuda con IA está en un módulo aparte (Tutor, módulo 14): hay que salir del ejercicio, ir al chat, explicar de qué tema se trata y leer una respuesta larga. Quien no entiende el present perfect a mitad de una unidad no hace ese viaje; se queda sin entender.

Esta feature pone la ayuda donde surge la duda: un botón por tema o por ítem ("Explícamelo") que abre, sin salir del ejercicio, una explicación corta que ya sabe qué se está estudiando. Debajo hay preguntas sugeridas claras según el tipo de tema (otra forma de explicarlo, más ejemplos, comparación con el español, un mini ejercicio) y se puede escribir una pregunta propia. Todo breve: respuestas cortas y conversaciones cortas.

La ayuda aparece **solo si la IA está activa** para ese estudiante: servidor de IA configurado y alcanzable, o clave propia puesta, y cuota disponible. Sin eso la app se usa entera igual que hoy.

### Cómo es hoy (medido en el código, 2026-10-10)
- El Tutor tiene cuatro modos (conversación libre, entrevista, examinador de speaking, "explícame esta duda") y no recibe ningún contexto del ejercicio. El modo "explícame" pide regla, tres ejemplos, contraste con el español y un ejercicio: una respuesta larga.
- El servidor compone los prompts; el cliente solo manda un tipo de petición y datos acotados. No hay un tipo de petición para una explicación con contexto.
- Una llamada de tutor reserva 3 créditos (6 con el modelo que razona). Sin cuenta hay 15 créditos de prueba en total por defecto: unas 5 preguntas. Con cuenta, 60 al día. El límite de ritmo es de 6 llamadas por minuto.
- La app no sabe hoy si la IA está disponible antes de intentarlo: la función que debería decirlo (`aiReady`) devuelve siempre "sí" y no se usa. Lo único que refleja el estado es la etiqueta de cuota del lateral ("IA: 12 créditos", "IA: sin servidor", "IA: —") y la nota bajo cada botón de IA.
- Las respuestas en curso no se anuncian a lectores de pantalla y los botones de IA se reactivan a mitad de respuesta (hallazgos de la auditoría).

## User Stories
- Como estudiante que no ha entendido una regla, quiero un botón ahí mismo que me la explique de otra forma, sin salir de la unidad.
- Como estudiante que acaba de fallar una pregunta, quiero preguntar por qué mi respuesta está mal, sin tener que copiar la pregunta en un chat.
- Como estudiante que no sabe qué preguntar, quiero preguntas sugeridas claras para ese tema.
- Como estudiante con poco tiempo, quiero respuestas de pocas líneas, no una clase.
- Como estudiante con pocos créditos, quiero saber cuánto gasta una pregunta antes de hacerla.
- Como estudiante sin conexión, sin servidor de IA o sin créditos, quiero que la app funcione igual y que, si la ayuda no está, se me diga por qué solo cuando puedo hacer algo al respecto.
- Como estudiante en un simulacro, no quiero que la ayuda me dé la respuesta de una pregunta que aún no he contestado.
- Como estudiante que usa lector de pantalla, quiero que la explicación se anuncie cuando esté lista y poder cerrarla con el teclado.

## Acceptance Criteria

### Primera entrega (rebanada publicable): gramática y preguntas falladas
La primera entrega tiene solo dos puntos de entrada: (a) la regla de cada unidad de gramática y (b) las preguntas ya corregidas y falladas de drills de gramática, Use of English y prueba rápida. Para esos dos puntos se cumplen **todos** los criterios de este spec (AC-1 a AC-67), con dos excepciones que pasan a la segunda entrega: los puntos (c) a (g) de AC-1 y las sugeridas de AC-43. Incluye por tanto, completos, la regla de disponibilidad de la IA (AC-5 a AC-13), la brevedad, la cuota visible, la protección de respuestas (el simulacro y el diagnóstico no tienen punto de entrada en esta entrega, lo que cumple AC-35 y AC-38) y la accesibilidad. La primera entrega es publicable sola y no deja controles a medias en los módulos de la segunda.

### Puntos de entrada
- [ ] AC-1: La ayuda se puede abrir desde: (a) cada unidad de gramática, junto a la regla; (b) cada pregunta ya corregida y fallada en drills de gramática, Use of English y prueba rápida; (c) cada pregunta ya corregida de una lectura o de un audio; (d) una tarjeta de vocabulario o de "Mis palabras" con su cara de respuesta ya visible; (e) cada paso del plan diario que enseña una regla o corrige una respuesta; (f) cada ítem del repaso de un simulacro ya entregado; (g) cada entrada del cuaderno de errores.
- [ ] AC-2: En todos esos sitios el control tiene el mismo nombre visible y el mismo aspecto, y es una acción secundaria: no compite con la acción principal de la vista.
- [ ] AC-3: Hay como máximo un punto de entrada por tema o ítem; en una lista de preguntas falladas, cada una tiene el suyo y abre la ayuda de esa pregunta, no de otra.
- [ ] AC-4: El control no aparece en una pregunta que todavía no se ha contestado, salvo el de la regla de la unidad, que es anterior a las preguntas.

### Solo si la IA está activa
- [ ] AC-5: La app determina si la IA está disponible para el estudiante con una única regla, usada por todos los puntos de entrada: hay clave propia configurada, o bien el servidor de IA existe, respondió a la última comprobación y quedan créditos suficientes para una pregunta.
- [ ] AC-6: Publicada sin servidor de IA y sin clave propia, el punto de entrada no se muestra en ningún sitio: ni botón, ni hueco reservado, ni mensaje. El estudio es idéntico al de hoy.
- [ ] AC-7: Sin conexión y sin clave propia, el punto de entrada se muestra desactivado con el motivo en texto ("Sin conexión: la explicación necesita internet") y no gasta nada al pulsarlo.
- [ ] AC-8: Con el servidor disponible pero sin créditos suficientes, el punto de entrada se muestra desactivado o abre un aviso, sin llamar a la IA, que dice el motivo y qué hacer según el caso: entrar con el correo (si hay cuentas y no se ha entrado), esperar a la renovación con su hora (cuota diaria), o poner una clave propia en Ajustes.
- [ ] AC-9: Cuando se ha alcanzado el presupuesto diario compartido de la app, el motivo mostrado es ese y no "te has quedado sin créditos".
- [ ] AC-10: Mientras la app aún no sabe si hay servidor (primera comprobación en curso), el punto de entrada no se muestra como disponible; aparece cuando la comprobación responde, sin mover el contenido que el estudiante está leyendo.
- [ ] AC-11: La disponibilidad se vuelve a evaluar, sin recargar la página, cuando cambia la sesión (entrar o salir), cuando cambia la cuota (tras cada respuesta de IA, propia de esta feature o de otra), cuando se pone o se quita la clave propia, y cuando el navegador pasa de con conexión a sin conexión o al revés. Los puntos de entrada ya pintados reflejan el cambio.
- [ ] AC-12: Un estado desactivado comunica su motivo con texto visible y accesible, no solo con un texto emergente ni con opacidad; el motivo es alcanzable con teclado y lector de pantalla.
- [ ] AC-13: En ningún módulo de estudio queda una función bloqueada, oculta o degradada por no tener IA; el único efecto de no tenerla es la ausencia o el estado desactivado de este control.

### Abre en el sitio y no se pierde nada
- [ ] AC-14: Abrir la ayuda no cambia de módulo ni recarga la vista; el ejercicio sigue en pantalla o inmediatamente recuperable al cerrarla.
- [ ] AC-15: Al cerrar la ayuda, el ejercicio está exactamente como estaba: pregunta actual, respuestas dadas, texto escrito en campos, posición en la tanda, posición de lectura, audio y reloj.
- [ ] AC-16: Mientras la ayuda está abierta, los relojes de práctica no cronometrada no penalizan; en vistas con reloj de examen la ayuda no está disponible hasta entregar (ver AC-35).
- [ ] AC-17: Cerrar la ayuda a mitad de una respuesta la cancela; lo ya escrito por la IA se conserva si se reabre la misma ayuda en esa sesión.
- [ ] AC-18: Reabrir la ayuda del mismo tema o ítem durante la misma visita muestra la conversación anterior sin gastar créditos de nuevo.
- [ ] AC-19: Solo hay una ayuda abierta a la vez; abrir otra cierra la anterior.

### Ya sabe de qué se trata
- [ ] AC-20: La primera explicación trata del tema o ítem desde el que se abrió sin que el estudiante escriba nada: para una unidad, su regla y su trampa típica; para una pregunta fallada, el enunciado, la respuesta del estudiante, la correcta y la explicación que ya trae el ítem.
- [ ] AC-21: La cabecera de la ayuda dice sobre qué es ("Present perfect vs. past simple", "Pregunta 4 · tu respuesta: *have went*"), para que el estudiante compruebe que la IA mira lo que él mira.
- [ ] AC-22: La explicación de la IA no contradice la respuesta correcta ni la explicación del ítem; si el estudiante afirma que la clave está mal, la IA explica la clave y no la cambia.
- [ ] AC-23: El nivel de la explicación corresponde a la ruta activa (A2 → B1, B1 → B2 y, cuando exista, B2 → C1): los ejemplos no usan estructuras por encima del nivel que la ruta enseña.
- [ ] AC-24: El contexto que sale hacia la IA se limita al tema o ítem y a la conversación de esa ayuda: no incluye correo, progreso, historial de otras ayudas ni textos de writing del estudiante.

### Brevedad
- [ ] AC-25: Todo punto de entrada abre con una primera explicación generada sin que el estudiante escriba, salvo que el dueño decida lo contrario (ver Open Questions sobre gasto al abrir).
- [ ] AC-26: La primera explicación tiene como máximo 80 palabras de explicación en español más un máximo de 2 ejemplos en inglés de una frase cada uno.
- [ ] AC-27: Cada respuesta posterior tiene como máximo 120 palabras en total, con un máximo de 3 ejemplos; un mini ejercicio es una sola frase con un hueco.
- [ ] AC-28: Las respuestas no llevan saludos, elogios de relleno, despedidas ni la estructura de tres secciones de las correcciones; van directas a la explicación.
- [ ] AC-29: El límite de longitud se cumple aunque el estudiante pida "explícamelo todo" o "más largo": la respuesta sigue siendo breve y ofrece seguir con otra pregunta.
- [ ] AC-30: Una conversación admite como máximo 6 preguntas del estudiante. Al llegar, la ayuda lo dice, deja leer todo lo anterior y ofrece dos salidas: empezar una ayuda nueva sobre el mismo tema o ir al módulo Tutor.
- [ ] AC-31: La pregunta libre del estudiante admite como máximo 300 caracteres; el límite se ve mientras escribe y no se envía nada por encima de él.
- [ ] AC-32: Una respuesta en curso se puede detener; mientras se genera no se puede enviar otra pregunta ni pulsar una sugerida (no se gasta dos veces por un doble clic).

### Idioma
- [ ] AC-33: Las explicaciones van en español; los ejemplos, las formas y los términos estudiados van en inglés y se distinguen visualmente del texto en español.
- [ ] AC-34: El inglés que aparece en la ayuda está marcado como inglés para tecnologías de apoyo, de modo que un lector de pantalla no lo pronuncie con fonética española.

### No revela respuestas
- [ ] AC-35: Durante un simulacro en curso no hay ningún punto de entrada, ni en los ítems ni en la cabecera; la ayuda existe solo en el repaso tras entregar.
- [ ] AC-36: En cualquier ejercicio con corrección (drills, Use of English, prueba rápida, preguntas de lectura y de audio, diagnóstico, pasos del plan), la ayuda de un ítem solo está disponible cuando ese ítem ya está corregido.
- [ ] AC-37: La ayuda abierta desde la regla de una unidad, con una tanda de esa unidad a medias, no da la solución de ninguna pregunta aún sin contestar de la tanda, ni siquiera si el estudiante la pega en la pregunta libre: explica la regla y propone un ejemplo distinto.
- [ ] AC-38: En el diagnóstico no hay ayuda hasta que el diagnóstico está terminado.

### Preguntas sugeridas
- [ ] AC-39: Bajo cada respuesta hay entre 2 y 4 preguntas sugeridas, pulsables, que se envían tal cual; siempre queda además el campo de pregunta libre.
- [ ] AC-40: Las sugeridas son fijas por tipo de tema (no las inventa la IA en cada respuesta), están redactadas en español claro y en primera persona, y cada una cabe en una línea a 320 px.
- [ ] AC-41: Para una **regla de gramática**: "Explícamelo de otra forma", "Dame 3 ejemplos más", "¿Cómo se dice en español y en qué cambia?", "¿Cuál es el error típico?", "Ponme un mini ejercicio".
- [ ] AC-42: Para una **pregunta fallada**: "¿Por qué mi respuesta está mal?", "¿Qué regla hay detrás?", "Dame otro ejemplo igual", "Ponme una parecida para probar".
- [ ] AC-43: Para una **tarjeta de vocabulario**: "Dame 3 frases con esta palabra", "¿Con qué palabras suele ir?", "¿En qué se diferencia de…?" (con una palabra cercana), "¿Es formal o informal?". Para una **pregunta de lectura o de audio**: "¿Dónde está la pista en el texto?", "¿Por qué no vale la opción que elegí?", "¿Qué significa esta frase?". Para una **entrada del cuaderno de errores**: "¿Por qué está mal?", "Dame 2 frases correctas iguales", "Ponme un mini ejercicio".
- [ ] AC-44: Una sugerida ya usada en esa conversación no se vuelve a ofrecer; cuando no quedan, solo se muestra el campo libre.
- [ ] AC-45: La respuesta a "Ponme un mini ejercicio" no incluye la solución; aparece una sugerida "Ver la solución" que la da.

### Cuota: se ve antes de gastarla
- [ ] AC-46: Antes de la primera llamada de una ayuda se ve cuántos créditos quedan y cuánto gasta aproximadamente una pregunta ("Te quedan 12 créditos · cada pregunta gasta 1"), junto al control que la lanza.
- [ ] AC-47: El saldo mostrado se actualiza tras cada respuesta sin recargar, y coincide con el de la etiqueta de cuota del lateral.
- [ ] AC-48: Con clave propia, en lugar del saldo se dice que se usa la clave del estudiante y que no gasta la cuota compartida.
- [ ] AC-49: Si a mitad de una conversación los créditos no alcanzan para otra pregunta, las sugeridas y el campo libre se desactivan con el motivo y la salida correspondiente (AC-8); lo ya respondido sigue legible.
- [ ] AC-50: Una pregunta de esta ayuda gasta como máximo la mitad de créditos que una pregunta del módulo Tutor de hoy, con el modelo rápido.
- [ ] AC-51: Una respuesta cancelada por el estudiante o cortada por un error de red no se cobra dos veces al reintentar la misma pregunta dentro del mismo minuto.

### Errores
- [ ] AC-52: Cada fallo (sin red, servidor de IA caído, sin saldo del proveedor, demasiado rápido, sesión caducada, respuesta vacía) muestra dentro de la ayuda un mensaje en español que dice qué pasó y qué hacer, con un botón de reintentar cuando reintentar tiene sentido; nunca un cuadro de alerta del navegador ni un fallo silencioso.
- [ ] AC-53: Un error en la ayuda no afecta al ejercicio: se puede cerrar y seguir.
- [ ] AC-54: Si la respuesta se corta a mitad, se conserva lo recibido, marcado como incompleto, y se ofrece reintentar.
- [ ] AC-55: Una pregunta de esta ayuda no se guarda en la cola de reintento sin conexión: si no hay red, se dice y no queda nada pendiente que gaste créditos después sin que el estudiante lo vea.

### Accesibilidad
- [ ] AC-56: Al abrir la ayuda, el foco va a ella; al cerrarla, vuelve al control que la abrió (o, si ese control ya no existe, al ejercicio en el mismo punto). Se cierra con Escape y con un botón de cerrar con nombre accesible.
- [ ] AC-57: La ayuda tiene nombre accesible que incluye el tema; mientras esté abierta, el teclado no se pierde por detrás de ella.
- [ ] AC-58: El inicio de una respuesta se anuncia ("Escribiendo la explicación…") y la respuesta se anuncia completa una sola vez al terminar; el texto que va llegando no se anuncia fragmento a fragmento.
- [ ] AC-59: La conversación se expone como un registro de mensajes en el que se distingue quién habla (estudiante o tutor) sin depender del color ni de la alineación.
- [ ] AC-60: Las preguntas sugeridas son botones reales, alcanzables en orden con Tab y activables con Enter y Espacio; el campo libre tiene etiqueta y se envía con Enter.
- [ ] AC-61: Los estados desactivados, el contador de caracteres, el saldo de créditos y los errores se anuncian cuando cambian, sin mover el foco.
- [ ] AC-62: Las dianas táctiles miden al menos 44 × 44 px; con `prefers-reduced-motion` la apertura no tiene animación.

### Transversal
- [ ] AC-63: Se ve correcto en tema claro y oscuro, con contraste AA, usando solo los colores de la paleta del proyecto.
- [ ] AC-64: A 320 px de ancho la ayuda no produce desplazamiento horizontal, el campo de texto no queda tapado por el teclado en pantalla y el botón de cerrar está siempre a la vista.
- [ ] AC-65: En móvil, con una tanda a pantalla completa, la ayuda se puede abrir y cerrar sin salir de la pantalla completa.
- [ ] AC-66: El progreso guardado antes de esta feature carga igual; las conversaciones de la ayuda no se guardan en el progreso sincronizado.
- [ ] AC-67: El endpoint de IA sigue sin aceptar instrucciones del cliente: la ayuda contextual no permite usarlo como chat de propósito general, y una pregunta ajena al inglés recibe una negativa de una frase.

## Non-Goals
- Generar ejercicios, lecturas o planes de estudio nuevos desde la ayuda, más allá del mini ejercicio de una frase.
- Explicaciones sin conexión generadas en el dispositivo; sin IA disponible, la explicación es la que ya trae cada ítem.
- Guardar el historial de conversaciones entre visitas, o sincronizarlo con la cuenta.
- Voz: ni dictar la pregunta ni leer la respuesta en alto.
- Corregir writing o speaking desde la ayuda (ya tienen su corrección propia).
- Ayuda durante un simulacro en curso o antes de contestar una pregunta, bajo ningún modo.
- Que la IA modifique el progreso, las estadísticas, el cuaderno de errores o la repetición espaciada.
- Cambiar los límites de cuota existentes, los precios o el modelo de créditos; solo se define cuánto gasta este tipo de pregunta.
- Arreglar los fallos de cuota y seguridad de la auditoría: son requisito previo, no parte de esta feature.
- Eliminar o rediseñar el módulo Tutor (ver Open Questions).
- Añadir analítica nueva sobre qué se pregunta.

## Open Questions
- [NEEDS CLARIFICATION: relación con el módulo Tutor (14). El código no lo decide. Se asume que el Tutor se queda como está, con sus cuatro modos, y que la ayuda contextual es una pieza nueva que enlaza a él al llegar al límite (AC-30). Alternativas: (a) quitar el modo "Explícame esta duda" del Tutor porque esta feature lo sustituye; (b) que el Tutor herede la brevedad. ¿Cuál?]
- [NEEDS CLARIFICATION: gasto al abrir. El spec asume que abrir la ayuda lanza ya la primera explicación (AC-25) y, por tanto, gasta créditos con un solo toque, mostrando antes el saldo y el coste junto al botón (AC-46). Alternativa: abrir no gasta nada y muestra solo las sugeridas; la primera explicación llega al pulsar una. Es más barato y evita gastos por toque accidental, pero añade un paso. ¿Cuál se prefiere?]
- [NEEDS CLARIFICATION: ocultar o desactivar cuando no hay IA. El spec decide por caso: sin servidor y sin clave → oculto (AC-6); sin conexión → desactivado con motivo (AC-7); sin créditos → desactivado o aviso con salida (AC-8); comprobación pendiente → no se muestra (AC-10). Alternativa única: ocultar siempre que no esté disponible, lo que deja la pantalla más limpia pero esconde al estudiante que entrando con su correo tendría más créditos. ¿Se confirma el reparto por casos?]
- [NEEDS CLARIFICATION: "sin servidor" y "sin clave" → oculto del todo. ¿O se prefiere un único aviso discreto, una sola vez, que diga que con una clave propia en Ajustes se activan las explicaciones?]
- [NEEDS CLARIFICATION: coste. Sin cuenta hay 15 créditos de prueba en total por defecto; al precio de hoy (3 por pregunta de tutor) son 5 preguntas en toda la vida del dispositivo. AC-50 propone que esta ayuda gaste como mucho la mitad. ¿Se quiere además subir los créditos de prueba, o una asignación aparte para esta ayuda? Cambiar límites está fuera de este spec.]
- [NEEDS CLARIFICATION: límites propuestos — 80 palabras + 2 ejemplos en la primera explicación, 120 palabras por respuesta, 6 preguntas por conversación, 300 caracteres por pregunta. ¿Son los que el dueño entiende por "corto y conciso"?]
- [NEEDS CLARIFICATION: ¿la ayuda usa siempre el modelo rápido, o respeta el modelo elegido en Ajustes (el que razona cuesta el doble y tarda más)? Se asume siempre el rápido.]
- [NEEDS CLARIFICATION: tarjetas de vocabulario. Se asume que la ayuda aparece solo con la respuesta ya visible (AC-1 d), para no convertirla en una forma de ver la solución. ¿De acuerdo?]
- [NEEDS CLARIFICATION: ¿debe poder guardarse una explicación útil (por ejemplo en el cuaderno de errores)? El spec lo deja fuera.]
- [NEEDS CLARIFICATION: texto visible del botón. Se propone "Explícamelo"; "No lo entiendo" o "Preguntar al tutor" son alternativas.]
- [NEEDS CLARIFICATION: AC-37 (no resolver preguntas sin contestar pegadas en el campo libre) depende del comportamiento del modelo y no se puede garantizar al 100 %. ¿Se acepta como "mejor esfuerzo verificado con un conjunto de casos de prueba", o se prefiere desactivar el campo libre mientras haya una tanda de esa unidad a medias?]
- [NEEDS CLARIFICATION: orden de la segunda entrega. Se propone lectura/audio y vocabulario primero, luego plan diario, repaso de simulacro y cuaderno de errores.]

## Dependencies
- **Bloqueante — arreglos de seguridad de la cuota.** La auditoría encontró que la cuota de IA se puede saltar: la IP es falsificable por cabecera (se saltan cuota anónima y límite por minuto y se agota el presupuesto diario) y hay una carrera entre comprobar y reservar que deja pasar peticiones paralelas por encima de todos los topes. Esta feature multiplica los puntos desde los que se llama a la IA, así que **no se publica antes de que esos arreglos estén desplegados** (tarea F1).
- Otros hallazgos de la auditoría que esta feature necesita resueltos o resuelve en su ámbito: respuestas de IA sin anuncio para lectores de pantalla; botones de IA que se reactivan a mitad de respuesta; el tutor acepta turnos "del asistente" enviados por el cliente (afecta a AC-22 y AC-67); `X-Quota-Remaining` resta uno de más (afecta a AC-47); todo el inglés bajo `lang="es"` (AC-34); cada respuesta repinta la vista y destruye el botón enfocado (AC-56).
- Un tipo de petición nuevo en el servidor de IA con sus topes de entrada, su coste estimado y su prompt, porque el modo "explícame" actual no admite contexto ni es breve. El cómo se decide en el plan.
- Una regla real de "IA disponible" en el cliente: hoy no existe (AC-5, AC-11).
- Las explicaciones por ítem que ya existen en `src/data/` (AC-20, AC-22).
- `specs/refuerzo-seguimiento-recordatorios/`: su línea de refuerzo tras cada respuesta es el lugar natural del punto de entrada (b); conviene definir juntos dónde va el botón.
- `specs/ruta-b2-c1/`: el nivel de las explicaciones para esa ruta (AC-23) y que el prompt base hoy limita el nivel a "B2 fuerte".
- Paleta de la rama `redesign/ui` ya aplicada.
- Una suite de tests, que hoy no existe: montarla es la primera tarea.
