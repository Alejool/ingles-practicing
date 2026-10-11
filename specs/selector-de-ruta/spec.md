# Selector de ruta

## Overview
Hoy la ruta se cambia con un solo clic sobre una tarjeta del lateral. No hay confirmación ni explicación: un toque sin querer cambia todo el contenido de la app, y quien no sabe que el progreso va por ruta cree que lo ha perdido. En móvil las tarjetas ocupan una franja fija encima del contenido y lo empujan hacia abajo, y la descripción de cada ruta solo existe como texto emergente, que en pantalla táctil no se ve.

Esta feature hace que la ruta activa esté siempre a la vista, pero que cambiarla sea un acto deliberado: se abre un selector, se elige, se lee qué pasa con el progreso y se confirma. Tiene que servir para tres rutas, una de ellas incompleta, funcionar con teclado y lector de pantalla, y no gastar la parte alta de la pantalla del móvil.

## User Stories
- Como estudiante, quiero ver siempre en qué ruta estoy, para no dudar de qué contenido tengo delante.
- Como estudiante que toca la pantalla con prisa, no quiero cambiar de ruta por un toque accidental.
- Como estudiante que duda entre dos rutas, quiero saber antes de cambiar que no pierdo nada y que puedo volver.
- Como estudiante en móvil, quiero que el contenido empiece arriba, sin una franja de rutas ocupando sitio.
- Como estudiante que usa teclado o lector de pantalla, quiero poder ver la ruta activa y cambiarla sin ratón.
- Como estudiante a mitad de un simulacro, no quiero que un cambio de ruta me lo tire sin avisar.

## Acceptance Criteria

### Ruta activa a la vista
- [ ] AC-1: En cualquier módulo, en escritorio y en móvil, se ve el nombre de la ruta activa (por ejemplo "B1 → B2") sin abrir nada.
- [ ] AC-2: El indicador de ruta activa no cambia de ruta al pulsarlo: abre el selector.
- [ ] AC-3: El lector de pantalla anuncia el indicador con su función y su valor (por ejemplo "Ruta actual: B1 → B2. Cambiar de ruta"), no solo el nombre.

### Cambio deliberado y confirmado
- [ ] AC-4: Cambiar de ruta requiere como mínimo tres acciones distintas: abrir el selector, elegir una ruta y confirmar. Ningún clic, toque o tecla suelta sobre la interfaz en reposo cambia la ruta.
- [ ] AC-5: El selector muestra todas las rutas con nombre, para quién es y examen al que apunta, en texto visible (no en un texto emergente), y marca cuál es la activa con algo más que color.
- [ ] AC-6: Elegir la ruta que ya está activa no pide confirmación ni cambia nada.
- [ ] AC-7: Antes de confirmar se lee, en texto, qué va a pasar: a qué ruta se cambia, que el progreso de la ruta actual se conserva tal cual, que cada ruta lleva su propio progreso y que se puede volver cuando se quiera.
- [ ] AC-8: Junto a cada ruta se ve un resumen de su progreso guardado (por ejemplo "día 37 de 120" o "sin empezar"), para que conste que no se pierde.
- [ ] AC-9: La acción de confirmar nombra el destino ("Cambiar a B2 → C1"), no es un "Aceptar" genérico; la de cancelar deja todo como estaba y es la que se activa con Escape.
- [ ] AC-10: Tras confirmar, la app muestra el contenido de la nueva ruta, el indicador se actualiza y se anuncia el cambio a tecnologías de apoyo ("Ruta: B2 → C1").
- [ ] AC-11: Tras cambiar, el progreso de la ruta anterior es idéntico al de antes del cambio (días hechos, tarjetas, simulacros, textos de writing); volver a ella lo muestra igual.
- [ ] AC-12: Lo que es común a todas las rutas (racha, cuaderno de errores, ajustes, tema) no cambia al cambiar de ruta, y la confirmación no afirma lo contrario.

### Tres rutas y ruta incompleta
- [ ] AC-13: El selector funciona con dos, tres o más rutas sin recortar texto ni desbordar a 320 px de ancho.
- [ ] AC-14: Una ruta incompleta lleva una marca con texto ("En construcción · 4 de 24 semanas") y, al elegirla, la confirmación repite ese aviso antes de cambiar.
- [ ] AC-15: Una ruta incompleta se puede elegir igual que las demás; el aviso informa, no bloquea.

### Carga y errores
- [ ] AC-16: Si el contenido de la ruta elegida hay que descargarlo, tras confirmar se ve un estado de carga con texto, se anuncia, y no se puede lanzar un segundo cambio mientras dura.
- [ ] AC-17: Si la descarga falla o no hay conexión, se muestra el motivo en texto dentro de la app (no en un cuadro de alerta del navegador), la ruta anterior sigue activa y completa, y se puede reintentar.
- [ ] AC-18: Sin conexión, las rutas que no están descargadas aparecen como no disponibles sin conexión antes de intentar elegirlas.

### Cambio a mitad de sesión
- [ ] AC-19: Con un simulacro en curso, intentar cambiar de ruta avisa de que el simulacro se perderá y exige una confirmación explícita aparte; cancelar devuelve al simulacro con el reloj y las respuestas intactos.
- [ ] AC-20: Con una tanda en curso (tarjetas, drills, Use of English, prueba rápida, lectura o audio con preguntas a medias, sesión del plan) pasa lo mismo: aviso de que la tanda se interrumpe y qué se conserva (lo ya respondido y guardado) y qué no.
- [ ] AC-21: Con texto sin guardar o una respuesta de IA en curso (writing, speaking, tutor), el aviso lo menciona; confirmar no pierde el texto ya guardado de la ruta anterior.
- [ ] AC-22: Tras confirmar un cambio a mitad de sesión no queda nada de la ruta anterior en marcha: ni reloj, ni audio sonando, ni pantalla completa de sesión, ni ítems de la otra ruta en pantalla.
- [ ] AC-23: Mientras una tanda o un simulacro ocupa la pantalla completa en móvil, la ruta activa sigue siendo identificable y el cambio sigue las reglas de AC-19 y AC-20; no existe un camino que lo evite.

### Otros puntos donde se cambia de ruta
- [ ] AC-24: Los demás caminos que hoy cambian de ruta (la recomendación tras el diagnóstico y la bienvenida) muestran la misma explicación sobre el progreso antes de cambiar; ninguno cambia de ruta sin que el estudiante lo haya pedido de forma explícita.
- [ ] AC-25: Tras elegir ruta en la bienvenida de la primera visita, no se pide una confirmación adicional: ahí todavía no hay progreso que proteger.

### Móvil
- [ ] AC-26: En pantallas de menos de 960 px, el indicador de ruta no ocupa una franja propia encima del contenido: comparado con la versión actual, el contenido de cada módulo empieza más arriba, y la altura fija dedicada a la ruta no supera una línea compartida con otros elementos.
- [ ] AC-27: Abrir el selector en móvil no desplaza el contenido de debajo; al cerrarlo, la posición de lectura es la misma.
- [ ] AC-28: Todas las dianas táctiles del indicador y del selector miden al menos 44 × 44 px y la descripción de cada ruta se lee completa en móvil.

### Accesibilidad
- [ ] AC-29: Todo el flujo (abrir, recorrer rutas, elegir, confirmar, cancelar) se hace solo con teclado; el foco entra en el selector al abrirlo, no se escapa detrás mientras está abierto y vuelve al indicador al cerrarlo.
- [ ] AC-30: El selector y la confirmación tienen nombre accesible y rol adecuado; la ruta activa, la elegida y las no disponibles se exponen como estados, no solo visualmente.
- [ ] AC-31: Los avisos (qué pasa con el progreso, ruta en construcción, sesión en curso, error de carga) forman parte del contenido que el lector de pantalla lee antes de llegar al botón de confirmar.
- [ ] AC-32: El foco es visible en todos los controles; contraste AA en tema claro y oscuro; con `prefers-reduced-motion` no hay animación de apertura.

### Transversal
- [ ] AC-33: Funciona sin conexión y sin cuenta para las rutas ya descargadas.
- [ ] AC-34: Se ve correcto en tema claro y oscuro y a 320 px de ancho.
- [ ] AC-35: El progreso guardado antes de esta feature carga igual; no se añade ni se cambia ningún dato guardado obligatorio.

## Non-Goals
- Crear la ruta B2 → C1 o su contenido (va en `specs/ruta-b2-c1/`).
- Traspasar, copiar o fusionar progreso entre rutas.
- Estudiar dos rutas a la vez o mezclar contenido de varias en una vista.
- Reiniciar el progreso de una ruta desde el selector (el botón "Reiniciar" y su semántica van aparte; hallazgo B1 de la auditoría).
- Guardar una sesión interrumpida para retomarla después: un simulacro o una tanda que se abandona por cambiar de ruta se pierde igual que hoy al salir.
- Rediseñar la navegación de módulos del lateral o su versión móvil, salvo lo imprescindible para AC-26.
- Recomendar ruta de forma automática con criterios nuevos; las recomendaciones existentes solo adoptan la explicación de AC-24.
- Bloquear una ruta según el resultado del diagnóstico.

## Open Questions
- [NEEDS CLARIFICATION: la frase del dueño, "que no sea un click para cambiar", se ha leído como "que cambiar de ruta no ocurra con un solo clic: que sea una acción deliberada y confirmada". Es una interpretación. Otras lecturas posibles: (a) que no haga falta ni un clic, es decir, que la app elija la ruta sola según el diagnóstico; (b) que el control no sea un botón en el lateral sino una opción dentro de Ajustes. ¿Se confirma la lectura de este spec?]
- [NEEDS CLARIFICATION: ¿dónde vive el indicador de ruta en móvil? El spec solo exige el resultado (AC-26: visible y sin franja propia). La ubicación concreta se decide en el diseño; si el dueño tiene preferencia —junto al título, dentro del menú de módulos— conviene saberlo antes.]
- [NEEDS CLARIFICATION: ¿la confirmación debe aparecer siempre, o solo cuando la ruta actual tiene progreso o hay una sesión en curso? El spec asume siempre (AC-4), por ser lo más cercano a "que no sea un click".]
- [NEEDS CLARIFICATION: ¿"en curso" incluye un texto de writing empezado pero ya guardado automáticamente? El spec asume que no cuenta como sesión que se pierde, y que solo se menciona (AC-21).]
- [NEEDS CLARIFICATION: en la bienvenida de la primera visita se elige ruta con un solo toque sobre una tarjeta. El spec asume que ahí se mantiene sin confirmación (AC-25). ¿De acuerdo?]
- [NEEDS CLARIFICATION: AC-8 muestra el progreso de cada ruta en el selector. ¿Basta "día N de 120", o se quiere también porcentaje o fecha de la última sesión?]
- [NEEDS CLARIFICATION: AC-18 depende de saber qué rutas están guardadas para uso sin conexión. Si no se puede saber con fiabilidad en todos los navegadores, ¿se acepta que el aviso llegue solo al fallar la carga (AC-17)?]

## Dependencies
- Paleta y tokens de la rama `redesign/ui` ya aplicados.
- `specs/ruta-b2-c1/`: define la tercera ruta y el estado "incompleta" que AC-14 muestra. El selector debe poder publicarse antes, con dos rutas.
- Hallazgos de la auditoría que tocan los mismos puntos y conviene resolver junto a esta feature: opciones de ruta de la bienvenida no operables por teclado; descripción de la ruta solo en `title`; bienvenida sin rol de diálogo ni gestión de foco; "Saltar" en la bienvenida antes de terminar la carga cambia de ruta sin contenido; `body.sesion-activa` puede dejar el móvil sin navegación.
- El estado de una sesión en curso vive hoy en cada vista por separado (simulacro, vocabulario, prueba rápida, pasos del plan): AC-19 a AC-23 necesitan que el selector pueda saber si hay una en marcha.
- Una suite de tests, que hoy no existe: montarla es la primera tarea.
