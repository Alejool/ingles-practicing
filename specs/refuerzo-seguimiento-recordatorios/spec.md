# Refuerzo, seguimiento y recordatorios

## Overview
Hoy la app corrige, pero no acompaña: tras responder se ve un color y, a veces, una explicación; al terminar una tanda o una lectura no queda claro qué se aprendió ni qué repasar; el avance vive en un panel que hay que ir a buscar; y nada trae al estudiante de vuelta al día siguiente.

Esta feature hace que la app le hable al estudiante en el momento: una línea de refuerzo específica tras cada respuesta, un cierre al terminar cada tanda o lectura, un resumen semanal del avance y recordatorios opcionales. El tono es cercano y concreto, nunca infantil ni genérico, y nunca regaña.

## User Stories
- Como estudiante que acaba de responder, quiero saber en una línea por qué acerté o cuál es la regla que fallé, para fijar la idea antes de pasar a la siguiente.
- Como estudiante que usa lector de pantalla, quiero que la corrección se anuncie sola, para no tener que buscarla.
- Como estudiante que termina una tanda o una lectura, quiero ver qué dominé y qué se me resistió, y poder repasar justo eso con un botón.
- Como estudiante que vuelve tras unos días, quiero ver cómo fue mi semana y qué toca hoy, para retomar sin pensar.
- Como estudiante con poco tiempo, quiero un recordatorio a la hora que yo elija, para no romper la racha por olvido.
- Como estudiante que no quiere avisos, quiero que nada me notifique si no lo activo.

## Acceptance Criteria

### Refuerzo por respuesta
- [ ] AC-1: Tras cada respuesta corregida en gramática, Use of English, prueba rápida, vocabulario, mis palabras, lectura, escucha, dictado, diagnóstico y pasos del plan, aparece una línea de refuerzo junto a la corrección.
- [ ] AC-2: En un fallo, la línea dice la respuesta correcta y la razón (la explicación que ya trae el ítem); si el ítem no trae explicación, dice la respuesta correcta sin inventar una razón.
- [ ] AC-3: En un acierto, la línea confirma y, si el ítem trae explicación, la muestra; no se repite la misma frase de ánimo dos veces seguidas.
- [ ] AC-4: Ningún texto de refuerzo culpa o ridiculiza ("mal", "fallaste otra vez"). Los fallos repetidos del mismo ítem cambian el mensaje para señalar que es un punto a repasar.
- [ ] AC-5: La corrección y su refuerzo se anuncian a tecnologías de apoyo sin mover el foco, y el estado correcto/incorrecto no depende solo del color.
- [ ] AC-6: En el simulacro no hay refuerzo durante la prueba; aparece solo en la revisión final.

### Cierre de tanda y de lectura
- [ ] AC-7: Al terminar una tanda de ejercicios o tarjetas, o las preguntas de una lectura o un audio, se muestra un cierre con: aciertos sobre total, hasta tres puntos dominados y hasta tres que se resistieron.
- [ ] AC-8: Si hubo fallos, el cierre ofrece un botón que inicia un repaso solo con los ítems fallados de esa tanda.
- [ ] AC-9: Si no hubo fallos, el cierre lo dice y propone el siguiente paso del día.
- [ ] AC-10: El cierre se puede descartar y no bloquea la navegación.

### Seguimiento
- [ ] AC-11: El panel muestra un resumen de los últimos 7 días: minutos estudiados, días activos, aciertos por destreza y los puntos débiles que más se repiten.
- [ ] AC-12: El resumen dice qué toca hoy y enlaza a ello.
- [ ] AC-13: Con menos de un día de datos, el resumen muestra un estado vacío que explica qué aparecerá ahí, no ceros.
- [ ] AC-14: Los datos previos del estudiante se conservan y se leen igual tras actualizar; un progreso guardado antes de esta feature carga sin errores.

### Recordatorios
- [ ] AC-15: Los recordatorios están apagados por defecto y se activan desde Ajustes; el permiso del navegador se pide solo al activarlos.
- [ ] AC-16: El estudiante elige la hora del recordatorio diario y puede activar por separado el aviso de tarjetas vencidas.
- [ ] AC-17: Si ya estudió ese día, el recordatorio diario no se muestra.
- [ ] AC-18: Si el navegador no soporta notificaciones o el permiso fue denegado, Ajustes lo explica con texto y dice qué hacer; no falla en silencio.
- [ ] AC-19: Al abrir la app sin haber estudiado hoy, se muestra el mismo recordatorio dentro de la app aunque las notificaciones estén apagadas o no soportadas.
- [ ] AC-20: Tocar una notificación abre la app en lo que toca hoy.

### Transversal
- [ ] AC-21: Todo funciona sin conexión y sin cuenta.
- [ ] AC-22: Todo lo nuevo se ve correcto en tema claro y oscuro, a 320 px de ancho y con teclado.

## Non-Goals
- Notificaciones push desde servidor (sin tabla nueva, sin claves VAPID, sin migraciones).
- Refuerzo generado por IA; todo el texto es fijo y funciona offline.
- Cambiar o reescribir el contenido de estudio existente.
- Cambiar el algoritmo de repetición espaciada, la puntuación o el plan de 24 semanas.
- Contenido nuevo (lecturas, tarjetas, audios): queda fuera hasta que se defina cuál.
- Correo o SMS de recordatorio.
- Rankings, comparación con otros usuarios o funciones sociales.
- Arreglar el resto de hallazgos de la auditoría de accesibilidad (van aparte), salvo los que AC-5 exige.

## Open Questions
- [NEEDS CLARIFICATION: "más contenidos" — ¿qué material quieres añadir (lecturas, tarjetas, audios, otra destreza) y para qué ruta?]
- [NEEDS CLARIFICATION: en iPhone las notificaciones solo existen con la app instalada en la pantalla de inicio, y ningún navegador garantiza un aviso puntual con la app cerrada varios días sin servidor. ¿Aceptas ese límite, sabiendo que AC-19 lo cubre al abrir la app?]
- [NEEDS CLARIFICATION: ¿el resumen semanal debe sincronizarse entre dispositivos con la cuenta, o basta con que se calcule en cada dispositivo a partir del progreso ya sincronizado?]

## Dependencies
- Paleta nueva de la rama `redesign/ui` (fichas de color) ya aplicada.
- Explicaciones por ítem que ya existen en `src/data/`.
- API de notificaciones del navegador y service worker ya registrado.
- Una suite de tests, que hoy no existe: montarla es la primera tarea.
