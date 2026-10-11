# Ruta B2 → C1

## Overview
La app tiene dos rutas (A2 → B1 y B1 → B2). Quien termina la segunda, o llega ya con un B2, no tiene por dónde seguir. Esta feature añade una tercera ruta, B2 → C1, par de las otras dos: mismo plan de 24 semanas y 120 sesiones, mismos módulos, mismo modo de elegirla y progreso propio. Apunta a Cambridge C1 Advanced (CAE) y a IELTS 7 o más.

El material C1 lo redacta una IA y a ese nivel los errores son sutiles (una explicación gramatical casi correcta, una colocación poco natural, una clave con dos respuestas defendibles). Por eso el contenido se entrega por tramos y cada tramo pasa por revisión humana antes de publicarse. El **tramo 1** (estructura completa de la ruta + semanas 1–4) es un alcance cerrado que se puede publicar solo; el **tramo 2** completa las semanas 5–24.

### Punto de partida medido (2026-10-10, sobre `src/data/`)

| Pieza | A2 → B1 | B1 → B2 | Objetivo B2 → C1 |
|---|---|---|---|
| Semanas / sesiones | 24 / 120 | 24 / 120 | 24 / 120 |
| Diagnóstico (ítems) | 25 | 30 | 30 |
| Unidades de gramática | 14 | 18 | 18 |
| Drills (mínimo por unidad) | 140 (10) | 180 (10) | 180 (10) |
| Mazos / tarjetas | 10 / 501 | 11 / 594 | 11 / 600 |
| Transformaciones | 85 | 100 | 100 |
| Clozes / huecos | 6 / 60 | 6 / 72 | 6 / 72 |
| Word formation | 77 | 90 | 90 |
| Tareas de writing | 12 | 14 | 14 |
| Partes de speaking | 8 | 8 | 8 |
| Lecturas / preguntas / palabras de media | 20 / 108 / 280 | 20 / 108 / 455 | 20 / 108 / 600–700 |
| Audios / preguntas | 8 / 40 | 8 / 40 | 8 / 40 |
| Estrategias / grupos de recursos / criterios de rúbrica | 4 / 5 / 4 | 4 / 5 / 4 | 4 / 5 / 4 |
| Simulacros (ítems por simulacro) | 4 (24) | 4 (32) | 4 (30) |
| Días de simulacro en el plan | semanas 6, 12, 18, 23 | semanas 6, 12, 18, 23 | semanas 6, 12, 18, 23 |

Las semanas 1–4 de las rutas actuales consumen: 4 unidades de gramática, 2 mazos (unas 125 tarjetas, ~205–215 pases de tarjeta), 7 días con transformaciones y 2–4 con cloze, 2 lecturas, 1–2 audios, 3 tareas de writing, 3 partes de speaking y ningún simulacro. De ahí sale el tamaño del tramo 1.

## User Stories
- Como estudiante con un B2, quiero una ruta que me lleve a C1 con la misma estructura que ya conozco, para seguir preparándome en la misma app.
- Como estudiante que terminó B1 → B2, quiero empezar B2 → C1 sin perder nada de lo que hice en las otras rutas.
- Como estudiante de A2 → B1 o B1 → B2 con datos móviles, no quiero que la app me descargue el contenido C1 si no lo he pedido.
- Como estudiante que elige una ruta todavía incompleta, quiero saber antes de empezar hasta qué semana llega y qué falta, para decidir si la empiezo ya.
- Como dueño de la app, quiero revisar el contenido C1 por tramos antes de que llegue a nadie, porque un error en material C1 enseña mal.
- Como estudiante sin conexión, quiero que la ruta C1 funcione igual que las otras una vez descargada.

## Acceptance Criteria

### Tramo 1 — estructura y semanas 1–4 (publicable por sí solo)
- [ ] AC-1: Existe una tercera ruta con identificador propio, nombre "B2 → C1", una línea de "para quién es" y el examen al que apunta (Cambridge C1 Advanced, IELTS 7+), y aparece en todos los sitios donde hoy aparecen las otras dos: bienvenida, selector de ruta, diagnóstico (recomendación de subir o bajar de ruta) y documento exportado del plan.
- [ ] AC-2: La ruta cumple el mismo contrato de datos que las otras dos (todas las piezas de `Track`), sin piezas nuevas ni ausentes; el chequeo de tipos del proyecto pasa.
- [ ] AC-3: El diagnóstico de la ruta está completo en el tramo 1: 30 ítems que discriminan entre B2 y C1, cada uno con explicación en español.
- [ ] AC-4: Están completas las piezas que no dependen de la semana: las 4 estrategias de examen, la rúbrica de writing con los criterios de C1 Advanced, los 5 grupos de recursos y el formato del examen que muestra el documento del plan.
- [ ] AC-5: Las semanas 1–4 (sesiones 1–20) están completas: cada una con su objetivo, su unidad y mazo dominantes y exactamente cinco días, cada día con título, foco y tarea de producción.
- [ ] AC-6: Todo lo que esas 20 sesiones abren existe y está completo: al menos 4 unidades de gramática (regla, trampa típica del hispanohablante y ≥10 drills con explicación cada una), al menos 2 mazos con ≥60 tarjetas cada uno (término, transcripción, significado, ejemplo), las transformaciones y los clozes que necesitan sus días de gramática, al menos 2 lecturas con sus preguntas, al menos 1 audio con guion y 5 preguntas, al menos 3 tareas de writing con modelo y al menos 3 partes de speaking.
- [ ] AC-7: Ninguna sesión de las semanas 1–4 lleva a un módulo vacío, a un ítem inexistente ni a contenido de otra ruta: recorriendo las 20 sesiones, cada paso abre material C1 real.
- [ ] AC-8: El estudiante de la ruta incompleta ve, antes de elegirla y dentro de ella, que está en construcción y hasta qué semana llega (ver "Ruta incompleta").
- [ ] AC-9: Todo el contenido del tramo 1 tiene registro de revisión humana aprobada (ver "Calidad del contenido") antes de publicarse.
- [ ] AC-10: Con el tramo 1 publicado, `npm run test:plan` termina con éxito y sin excepciones silenciosas: comprueba las dos rutas completas con todas las reglas de hoy y, de la ruta incompleta, todo lo comprobable sobre las semanas publicadas (cinco días por semana, unidades y mazos existentes, día de gramática con bloque de Use of English, lecturas y audios dentro de rango, audios con guion y respuestas válidas).

### Paridad de contenido (ruta completa, tramo 2)
- [ ] AC-11: La ruta completa alcanza los objetivos de la tabla del Overview; ninguna pieza queda por debajo de la cifra de B1 → B2.
- [ ] AC-12: El plan tiene 24 semanas y 120 sesiones, con simulacro en cuatro semanas, al menos 10 días de lectura y al menos 6 de escucha; todas las unidades se enseñan algún día y todos los mazos se programan alguna semana.
- [ ] AC-13: Los 4 simulacros reproducen las partes 1–4 de Reading and Use of English de C1 Advanced (cloze de opción múltiple, open cloze, word formation, transformaciones con palabra clave de 3 a 6 palabras), van de menos a más difíciles y cada ítem trae su explicación.
- [ ] AC-14: Con la ruta completa, `npm run test:plan` aplica a las tres rutas exactamente las mismas reglas, sin trato especial para ninguna, y termina con éxito.
- [ ] AC-15: Al completarse, la ruta deja de mostrarse como "en construcción" y quien ya la estudiaba conserva su progreso de las semanas 1–4 y continúa en la 5.

### Adecuación al nivel
- [ ] AC-16: Cada unidad de gramática trata un punto del inventario C1 (por ejemplo inversión, cleft sentences, condicionales mixtos y formales, pasivas impersonales, subjuntivo, participle clauses, modales de especulación en pasado, hedging) y está marcada con su nivel; ninguna unidad repite el alcance de una unidad de B1 → B2.
- [ ] AC-17: El vocabulario es de banda C1: colocaciones, phrasal verbs de registro, expresiones idiomáticas y léxico académico y formal. Cada tarjeta lleva un ejemplo que suena natural a un hablante nativo culto.
- [ ] AC-18: Las lecturas tienen de media 600–700 palabras y registro de prensa de calidad o divulgación; sus preguntas incluyen inferencia, actitud del autor y vocabulario en contexto, no solo localización de datos.
- [ ] AC-19: Los audios reproducen tipos de tarea de C1 Advanced (entrevista larga, varios hablantes con opiniones, monólogo informativo) y sus preguntas piden opinión, actitud o propósito además de datos.
- [ ] AC-20: Las tareas de writing son los géneros de C1 Advanced (essay obligatorio; proposal, report, review, letter/email formal) con el rango de palabras del examen, y las partes de speaking siguen las cuatro partes del examen.
- [ ] AC-21: Los textos que la app muestra según la ruta (nivel estimado del diagnóstico, escala y comentario del simulacro, nivel de las lecturas generadas, tope de palabras de las transformaciones) son correctos para C1 cuando la ruta activa es B2 → C1 y no cambian para las otras dos.
- [ ] AC-22: Las correcciones con IA (writing, speaking, tutor, lecturas generadas) trabajan al nivel C1 cuando la ruta activa es B2 → C1: la versión modelo es de nivel C1 y el speaking se evalúa con los criterios de C1 Advanced. En las otras dos rutas se comportan igual que hoy.

### Calidad del contenido
- [ ] AC-23: Toda explicación gramatical es correcta según una gramática de referencia (por ejemplo Cambridge Grammar of English, Swan o Hewings): un revisor humano con nivel C2 la ha leído y aprobado, y queda constancia de quién y cuándo por archivo de contenido.
- [ ] AC-24: Toda clave de respuesta está verificada: cada ítem de opción múltiple tiene exactamente una opción correcta y distractores realmente incorrectos; cada ítem de respuesta escrita lista todas las variantes aceptables; ninguna explicación contradice su clave.
- [ ] AC-25: Ningún ítem de la ruta C1 (tarjeta, drill, transformación, cloze, word formation, lectura, audio, tarea, ítem de simulacro o de diagnóstico) reutiliza un ítem de A2 → B1 o B1 → B2. Una comprobación automática lo demuestra para términos de tarjetas, enunciados de ítems y títulos de lecturas y audios.
- [ ] AC-26: Ningún término de vocabulario se repite entre mazos de la propia ruta y ningún ítem se repite entre simulacros o entre simulacro y práctica.
- [ ] AC-27: Las lecturas y los audios no contienen estadísticas precisas inventadas, ni citas atribuidas a personas reales, ni texto copiado de material protegido de examen.
- [ ] AC-28: Los hallazgos de la revisión del tramo 1 (tipos de error encontrados) quedan escritos y se aplican como lista de control al tramo 2.

### Ruta incompleta
- [ ] AC-29: En el selector, en la bienvenida y en el documento del plan, la ruta incompleta lleva una marca visible con texto (no solo color) que dice que está en construcción y cuántas semanas tiene disponibles.
- [ ] AC-30: Al llegar al final de lo publicado (sesión 20), el plan dice con claridad que el resto está en preparación y propone qué hacer mientras tanto (repaso de tarjetas vencidas, errores, prueba rápida); no muestra semanas vacías, días rotos ni un "has terminado la ruta".
- [ ] AC-31: Los módulos que dependen de contenido aún no entregado (por ejemplo Simulacro) muestran un estado vacío que explica qué habrá y cuándo se desbloquea, no un error ni una pantalla en blanco.
- [ ] AC-32: Los totales y porcentajes de avance de una ruta incompleta se calculan sobre lo publicado y lo dicen ("semana 3 de 4 disponibles"), no sobre 24 semanas.
- [ ] AC-33: La recomendación automática de pasar de B1 → B2 a B2 → C1 (bienvenida y diagnóstico) avisa de que la ruta está incompleta mientras lo esté.

### Progreso y datos guardados
- [ ] AC-34: El progreso de B2 → C1 se guarda aparte del de las otras rutas; estudiar en una no cambia nada de las demás.
- [ ] AC-35: Un estado guardado antes de esta feature (dos rutas, o el formato antiguo de una sola) carga sin errores y conserva sin cambios el progreso, la ruta activa, la racha, los errores y los ajustes.
- [ ] AC-36: El progreso de B2 → C1 sobrevive a recargar, a exportar e importar la copia desde Ajustes y a sincronizar con la cuenta entre dos dispositivos, igual que el de las otras rutas.
- [ ] AC-37: Un dispositivo con una versión anterior de la app (sin la tercera ruta) que sincroniza con la misma cuenta no borra el progreso de B2 → C1 guardado en el servidor.
- [ ] AC-38: La biblioteca de lecturas compartidas y el latido anónimo distinguen la tercera ruta: las lecturas generadas en C1 no aparecen en otras rutas ni al revés, y el panel de administración cuenta a sus estudiantes como ruta propia.

### Carga, tamaño y sin conexión
- [ ] AC-39: Quien estudia A2 → B1 o B1 → B2 y nunca elige B2 → C1 no descarga el contenido C1 por el uso normal de la app: tras 60 segundos de sesión no hay ninguna petición de red a los archivos de contenido de esa ruta.
- [ ] AC-40: El contenido C1 solo se descarga cuando el estudiante elige esa ruta o pulsa "Descargar todo para sin conexión" en Ajustes.
- [ ] AC-41: El peso de lo que se descarga al abrir la app (antes de elegir ruta) no aumenta más de 2 KB comprimidos respecto a la línea base previa a esta feature.
- [ ] AC-42: Con la ruta C1 ya descargada, todo su estudio funciona sin conexión y sin cuenta, incluidas lecturas y audios (con la voz del navegador).
- [ ] AC-43: Si se elige la ruta C1 sin conexión y sin haberla descargado, la app lo dice, mantiene la ruta anterior activa y no queda en un estado a medias.
- [ ] AC-44: Tras actualizar la app, quien tenía una ruta guardada para uso sin conexión sigue pudiendo abrirla sin conexión.

### Documento del plan
- [ ] AC-45: `npm run plan:export` genera `docs/plan-de-estudio.html` con las tres rutas, cada una con sus semanas, el material de cada día, el formato del examen y las metas de cada simulacro.
- [ ] AC-46: Mientras la ruta C1 esté incompleta, el documento muestra sus semanas publicadas y marca el resto como "en preparación"; no muestra semanas inventadas.
- [ ] AC-47: El documento permite cambiar entre las tres rutas con teclado y recuerda la última vista, como hoy con dos.

### Transversal
- [ ] AC-48: Todo lo nuevo se ve correcto en tema claro y oscuro, a 320 px de ancho y con teclado; el nombre y la descripción de la ruta se leen también en móvil.
- [ ] AC-49: El README y los textos de la app que hablan de "dos rutas" o de "B1/B2" como techo quedan al día.

## Non-Goals
- Preparar C2 Proficiency, o un nivel C1 de otros exámenes con formato propio (TOEFL iBT, Aptis Advanced) más allá de mencionarlos.
- Las partes 5–8 de Reading and Use of English de C1 Advanced dentro del simulacro (textos largos con opción múltiple, cross-text, gapped text, multiple matching): el simulacro mantiene las cuatro partes que ya tiene.
- Grabaciones de audio reales: la escucha sigue con la voz del navegador.
- Editar, mover o reescribir contenido de A2 → B1 o B1 → B2.
- Cambiar el contrato de datos de una ruta, el algoritmo de repetición espaciada, la construcción del plan diario o la puntuación.
- Cambiar la forma o las claves de lo ya guardado (localStorage, base de datos): la ruta nueva entra como dato adicional.
- Generar contenido C1 en tiempo de ejecución con IA: todo el material de la ruta es fijo y revisado.
- Rediseñar el selector de ruta (va en `specs/selector-de-ruta/`).
- Traspasar progreso de una ruta a otra (por ejemplo, dar por sabidas tarjetas de B1 → B2).

## Open Questions
- [NEEDS CLARIFICATION: ¿quién hace la revisión humana del contenido C1 y con qué criterio de aprobado? El spec asume una persona con nivel C2 o docente de inglés; si la revisa el propio dueño, AC-23 se cumple con su firma, pero conviene decirlo.]
- [NEEDS CLARIFICATION: ¿el tramo 1 se publica a todos los usuarios marcado "en construcción", o se queda oculto (visible solo para el dueño) hasta que la ruta esté completa? El spec asume publicado y marcado. Si se oculta, AC-29 a AC-33 solo aplican a la vista del dueño.]
- [NEEDS CLARIFICATION: ¿el tramo 2 se entrega de una vez (semanas 5–24) o en bloques de 4–6 semanas, cada uno con su revisión? Cambia cuántas veces se pasa por AC-9.]
- [NEEDS CLARIFICATION: objetivos de la tabla — se propone igualar B1 → B2 (18 unidades, ~600 tarjetas). ¿Es suficiente, o C1 debe tener más vocabulario (por ejemplo 700–800 tarjetas), dado que a ese nivel el léxico pesa más que la gramática?]
- [NEEDS CLARIFICATION: simulacro de 30 ítems (8+8+8+6, como el examen real) o de 32 como B1 → B2. Se propone 30.]
- [NEEDS CLARIFICATION: nombre visible del examen. Se propone "Cambridge C1 Advanced, IELTS 7–8, TOEFL 95–110". ¿Se confirman esos rangos?]
- [NEEDS CLARIFICATION: el nombre de la app y del README es "Ruta B1 → B2". ¿Se cambia ahora que hay una ruta C1, o queda fuera? El spec no lo incluye salvo los textos de AC-49.]
- [NEEDS CLARIFICATION: hoy, con el formato real de C1 Advanced, la escucha tiene preguntas de 3 y de 4 opciones; el contrato actual documenta "tres opciones". Se asume que se mantiene lo que el contrato ya permite, sin cambiarlo.]
- [NEEDS CLARIFICATION: AC-39 exige que la app deje de descargar las otras rutas en segundo plano. Hoy lo hace siempre a los 1,5 s para que cambiar sea instantáneo. ¿Se acepta que el primer cambio a una ruta nunca abierta tarde lo que tarde su descarga, también entre A2 → B1 y B1 → B2?]
- [NEEDS CLARIFICATION: la insignia "diagnóstico en las dos rutas" existe hoy. Con tres rutas, ¿sigue pidiendo esas dos, pide las tres, o se añade otra? Se asume que no se toca.]

## Dependencies
- `specs/selector-de-ruta/`: el selector debe admitir tres rutas y una incompleta (AC-1, AC-29). Si se implementa después, el tramo 1 necesita al menos que el selector actual muestre la tercera ruta y su marca.
- Revisor humano de contenido disponible antes de cerrar cada tramo (AC-9, AC-23).
- Arreglos de seguridad en curso sobre la biblioteca compartida (hallazgo S1 de la auditoría): AC-38 toca el mismo punto.
- Hallazgo de rendimiento de la auditoría sobre la precarga de la otra ruta (`tracks.ts`, `track.ts`): AC-39 lo resuelve o depende de que se resuelva.
- Infraestructura de tests, que hoy no existe (solo `npm run test:plan`): las comprobaciones de AC-25, AC-26, AC-35 y AC-37 la necesitan; montarla es la primera tarea.
- Hechos del código que condicionan el alcance: la lista de rutas está escrita a mano en más sitios que los que cita el README (estado guardado y su migración, fusión de la sincronización, latido, biblioteca compartida, precache del service worker, exportador del plan, textos de nivel del diagnóstico y del simulacro, prompts de IA). AC-21, AC-22 y AC-34 a AC-38 existen por eso.
