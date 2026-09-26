import type { WeekSpec } from "../types";

/**
 * 24 semanas × 5 días = 120 sesiones de 45 minutos.
 * El reparto de minutos lo pone `schedule.ts` según el `focus`; aquí va el qué.
 */
export const WEEKS: WeekSpec[] = [
/* ── Bloque A · Reconstruir la base ─────────────────────────────── */
{ w:1, block:"A", unit:"g1", deck:"b1", goal:"Dejar de dudar entre presente simple y continuo, y colocar los adverbios donde van.", days:[
  { t:"Presente simple y continuo: estado contra acción", focus:"leccion", uoe:"trans", task:"Escribe 8 frases sobre tu trabajo: 4 en simple y 4 en continuo. Subraya por qué cada una lleva su forma." },
  { t:"Verbos de estado: los que no admiten -ing", focus:"drills", uoe:"trans", task:"Reescribe 6 frases mal formadas del tipo «I am knowing» y explica en una línea por qué fallan." },
  { t:"Primer contacto con el examen de lectura", focus:"lectura", task:"Anota 10 colocaciones del texto, no palabras sueltas." },
  { t:"Escribir sobre lo que haces cada día", focus:"writing", task:"Módulo 07, tarea 1: correo informal de 100 palabras. Que al menos tres frases usen presente continuo con valor temporal." },
  { t:"Speaking parte 1: hablar de ti sin sonar a guion", focus:"speaking", task:"Responde 6 preguntas de la parte 1. Cada respuesta: afirmación, razón y ejemplo." },
]},
{ w:2, block:"A", unit:"g2", deck:"b1", goal:"El divorcio entre present perfect y pasado simple, que es donde más puntos se pierden.", days:[
  { t:"Present perfect frente a pasado simple", focus:"leccion", uoe:"trans", task:"Escribe 6 pares de frases: la misma idea en perfect y en pasado, y di qué cambia." },
  { t:"For, since, already, yet, still", focus:"drills", uoe:"cloze", task:"Escribe 10 frases sobre tu vida usando cada marcador una vez." },
  { t:"Marcadores que obligan a pasado simple", focus:"drills", uoe:"trans", task:"Corrige 8 frases con «I have seen him yesterday» y variantes." },
  { t:"Contar experiencias por escrito", focus:"writing", task:"Correo de 120 palabras contando tres experiencias profesionales. Perfect para las tres, pasado para los detalles." },
  { t:"Escucha: distinguir have y had en habla rápida", focus:"escucha", task:"Anota 10 paráfrasis del audio: cómo dijo el examen lo que el audio dijo de otra forma." },
]},
{ w:3, block:"A", unit:"g3", deck:"coll", goal:"Duración: llevar tres años haciendo algo, dicho como lo dice un nativo.", days:[
  { t:"Present perfect continuous y la duración", focus:"leccion", uoe:"trans", task:"Escribe 6 frases con «How long…?» y contéstalas en continuo." },
  { t:"Resultado contra duración: cuál elegir", focus:"drills", uoe:"trans", task:"Seis pares: «I've written three emails» / «I've been writing emails». Explica la diferencia de cada uno." },
  { t:"Colocaciones: el atajo para sonar natural", focus:"lectura", deck:"coll", task:"Del texto, saca 12 combinaciones verbo + sustantivo y guárdalas en el cuaderno." },
  { t:"Describir un proyecto largo", focus:"writing", task:"140 palabras sobre algo en lo que llevas tiempo trabajando, con al menos cuatro estructuras de duración." },
  { t:"Speaking parte 2: comparar dos fotos", focus:"speaking", task:"Un minuto cronometrado comparando dos formas de estudiar. Empieza comparando, no describiendo." },
]},
{ w:4, block:"A", unit:"g4", deck:"b1", goal:"Elegir futuro sin pensarlo, y no meter will donde no va.", days:[
  { t:"Will, going to y presente continuo", focus:"leccion", uoe:"trans", task:"Escribe 9 frases de futuro: 3 decisiones, 3 planes y 3 citas." },
  { t:"Nada de will después de when, as soon as o until", focus:"drills", uoe:"cloze", task:"Corrige 8 frases con «when I will arrive» y similares." },
  { t:"Escucha: planes, predicciones y citas", focus:"escucha", task:"Anota cada forma de futuro que oigas y clasifícala: decisión, plan, cita o predicción." },
  { t:"Elegir el examen y poner fecha", focus:"repaso", task:"Módulo 01: decide el examen, calcula el calendario inverso y apúntalo. Sin fecha no hay plan." },
  { t:"Contar tus planes en voz alta", focus:"speaking", task:"Dos minutos sobre tus planes a doce meses, sin leer. Grábate y cuenta cuántos «will» usaste mal." },
]},
{ w:5, block:"A", unit:"g18", deck:"phr", goal:"Ordenar la frase como el inglés la ordena, no como la ordena el español.", days:[
  { t:"Sujeto, verbo, objeto, manera, lugar, tiempo", focus:"leccion", uoe:"trans", task:"Reordena 10 frases desordenadas y justifica el orden de cada una." },
  { t:"Adverbios de frecuencia y doble negación", focus:"drills", uoe:"cloze", task:"Escribe 8 frases sobre tus hábitos con adverbios distintos, todos bien colocados." },
  { t:"Phrasal verbs: separables y no separables", focus:"drills", deck:"phr", uoe:"trans", task:"Escribe una frase con cada uno de los 10 phrasal verbs de hoy." },
  { t:"Un artículo corto y bien ordenado", focus:"writing", task:"Módulo 07, tarea 2: artículo de 100 palabras. Relee buscando adverbios mal colocados." },
  { t:"Escucha: el orden en el habla espontánea", focus:"escucha", task:"Transcribe 5 frases del audio y compáralas con cómo las habrías dicho tú." },
]},
{ w:6, block:"A", unit:"g2", deck:"b1", goal:"Cerrar el bloque A: primer simulacro y foto real de por dónde vas.", days:[
  { t:"Repaso de las unidades 1 a 4", focus:"repaso", task:"Repite los drills de las cuatro unidades. Anota las que bajen del 80%." },
  { t:"Vaciar la caja 1 del vocabulario", focus:"repaso", task:"Todas las tarjetas falladas, hasta dejar la caja 1 vacía." },
  { t:"Primer simulacro cronometrado", focus:"simulacro", task:"Módulo 10 completo. Apunta la puntuación: es tu línea de partida." },
  { t:"Reescribir los textos del bloque", focus:"writing", task:"Coge los dos textos que escribiste y reescríbelos aplicando toda la corrección recibida." },
  { t:"Speaking: las partes 1 y 2 seguidas", focus:"speaking", task:"Tres minutos sin cortar. Transcribe y evalúa con los criterios del examinador." },
]},

/* ── Bloque B · Del B1 sólido al B2 inicial ─────────────────────── */
{ w:7, block:"B", unit:"g8", deck:"b2", goal:"Obligación y prohibición sin la ambigüedad del «no tienes que» español.", days:[
  { t:"Must, have to, mustn't y don't have to", focus:"leccion", uoe:"trans", task:"Escribe 8 normas de tu trabajo: 4 obligaciones, 2 prohibiciones y 2 cosas innecesarias." },
  { t:"Should, ought to y had better", focus:"drills", uoe:"trans", task:"Da 6 consejos a alguien que empieza en tu oficio, uno con cada estructura." },
  { t:"Obligación en pasado y en futuro", focus:"drills", uoe:"cloze", task:"Reescribe 8 frases pasando must a had to y a will have to." },
  { t:"Escribir un correo de normas", focus:"writing", task:"120 palabras explicando las reglas de un proceso, sin repetir must." },
  { t:"Lectura: instrucciones y textos normativos", focus:"lectura", task:"Marca en el texto cada matiz de obligación y clasifícalo." },
]},
{ w:8, block:"B", unit:"g14", deck:"b2", goal:"Artículos e incontables, que es donde el hispanohablante se delata.", days:[
  { t:"A, an, the y el artículo cero", focus:"leccion", uoe:"cloze", task:"Escribe un párrafo de 80 palabras y subraya cada artículo justificándolo." },
  { t:"Incontables que en español sí son contables", focus:"drills", uoe:"cloze", task:"Escribe 10 frases con information, advice, news, research, furniture y equipment." },
  { t:"Lectura: artículos e incontables en contexto", focus:"lectura", task:"Subraya cada incontable y cada few, little o much del texto. Copia 8 colocaciones con su artículo." },
  { t:"Describir datos sin fallar en los artículos", focus:"writing", task:"130 palabras describiendo una tendencia. Relee solo mirando artículos." },
  { t:"Speaking parte 3: negociar una decisión", focus:"speaking", task:"Tres minutos discutiendo cinco opciones y decidiendo dos. Pregunta la opinión del otro cada 30 segundos." },
]},
{ w:9, block:"B", unit:"g15", deck:"prep", goal:"Sesenta preposiciones dependientes memorizadas en bloque, no deducidas.", days:[
  { t:"Verbo más preposición", focus:"leccion", deck:"prep", uoe:"cloze", task:"Escribe una frase con cada una de las 12 combinaciones de hoy." },
  { t:"Adjetivo y sustantivo más preposición", focus:"drills", deck:"prep", uoe:"cloze", task:"Diez frases con good at, interested in, responsible for y compañía." },
  { t:"Lectura: cazar preposiciones dependientes", focus:"lectura", deck:"prep", task:"Subraya cada verbo, adjetivo o sustantivo con su preposición y apunta en el cuaderno las 10 que habrías calcado del español." },
  { t:"Open cloze: donde viven las preposiciones", focus:"drills", uoe:"cloze", task:"Haz el open cloze entero y justifica cada hueco en una línea." },
  { t:"Escribir vigilando la preposición", focus:"writing", task:"150 palabras. Al terminar, subraya cada preposición y comprueba las que dudes." },
]},
{ w:10, block:"B", unit:"g12", deck:"phr", goal:"Gerundio o infinitivo, y los verbos que cambian de significado con cada uno.", days:[
  { t:"Verbos con -ing y verbos con to", focus:"leccion", uoe:"trans", task:"Clasifica 20 verbos frecuentes en dos columnas y escribe una frase con seis de ellos." },
  { t:"Stop, remember, forget, try, mean, regret", focus:"drills", uoe:"trans", task:"Seis pares de frases mostrando el cambio de significado." },
  { t:"Preposición más -ing: look forward to, be used to", focus:"drills", uoe:"cloze", task:"Ocho frases con estructuras de preposición más gerundio." },
  { t:"Escucha: reconocer el patrón en habla rápida", focus:"escucha", task:"Anota cada verbo seguido de -ing o de to que oigas, con su frase." },
  { t:"Contar un cambio de hábito", focus:"writing", task:"160 palabras sobre un hábito que cambiaste, usando al menos cuatro verbos de los que cambian de sentido." },
]},
{ w:11, block:"B", unit:"g5", deck:"b2", goal:"Los tres condicionales, y el mixto, sin pensarlos.", days:[
  { t:"Condicionales 0, 1 y 2", focus:"leccion", uoe:"trans", task:"Escribe 9 frases: 3 de cada tipo, sobre tu trabajo." },
  { t:"Tercer condicional y arrepentimientos", focus:"drills", uoe:"trans", task:"Seis frases sobre decisiones que habrías tomado de otra forma." },
  { t:"Condicionales mixtos y unless", focus:"drills", uoe:"trans", task:"Ocho frases mezclando causa pasada y efecto presente." },
  { t:"Un texto de hipótesis", focus:"writing", task:"170 palabras sobre una decisión difícil, con al menos tres condicionales distintos." },
  { t:"Speaking parte 4: opinar sobre lo hipotético", focus:"speaking", task:"Dos minutos respondiendo a «What would happen if…?». Matiza, no sentencies." },
]},
{ w:12, block:"B", unit:"g5", deck:"coll", goal:"Control de medio curso: repetir el diagnóstico y comparar.", days:[
  { t:"Repetir el diagnóstico", focus:"repaso", task:"Módulo 02 entero. Compara con el de la semana 1, área por área." },
  { t:"Las áreas que siguen en rojo", focus:"repaso", task:"Repite las unidades por debajo del 70% del radar." },
  { t:"Segundo simulacro", focus:"simulacro", task:"Cronometrado. Compara con el de la semana 6." },
  { t:"Writing en tiempo real", focus:"writing", task:"Dos tareas de writing en 80 minutos, como en el examen." },
  { t:"Speaking: las cuatro partes seguidas", focus:"speaking", task:"Catorce minutos grabados. Transcribe la parte que peor te salga." },
]},

/* ── Bloque C · Precisión y rango B2 ────────────────────────────── */
{ w:13, block:"C", unit:"g7", deck:"adj", goal:"Especular con precisión: los grados de certeza que separan B1 de B2.", days:[
  { t:"Must, might, could y can't para deducir", focus:"leccion", uoe:"trans", task:"Ocho deducciones sobre situaciones de tu oficina, con distintos grados de certeza." },
  { t:"Modales perfectos: must have, can't have", focus:"drills", uoe:"trans", task:"Ocho deducciones sobre el pasado. Vigila que no salga «mustn't have»." },
  { t:"Lectura: el grado de certeza del autor", focus:"lectura", task:"En cada pregunta de opinión, anota qué palabra del texto marca la certeza: may, clearly, apparently, must…" },
  { t:"Especular por escrito", focus:"writing", task:"180 palabras especulando sobre una noticia, con al menos cinco modales distintos." },
  { t:"Speaking: describir y especular sobre fotos", focus:"speaking", task:"Un minuto por foto. La mitad del tiempo, especulando." },
]},
{ w:14, block:"C", unit:"g13", deck:"wf", goal:"Frases largas que se sostienen: relativas de todos los tipos.", days:[
  { t:"Especificativas, explicativas y la coma que cambia el sentido", focus:"leccion", uoe:"trans", task:"Combina 10 pares de frases con la relativa adecuada." },
  { t:"Whose, where, when y which para toda la frase", focus:"drills", uoe:"cloze", task:"Ocho frases usando cada relativo una vez." },
  { t:"Lectura: desmontar frases largas", focus:"lectura", task:"Elige 5 frases largas del texto y marca en cada una el sujeto, el verbo principal y cada relativa." },
  { t:"Formación de palabras: familias léxicas", focus:"drills", deck:"wf", uoe:"wform", task:"Escribe las cuatro formas de 10 familias: verbo, sustantivo, adjetivo y adverbio." },
  { t:"Un texto con frases complejas", focus:"writing", task:"180 palabras con al menos cuatro relativas distintas, sin que suene forzado." },
]},
{ w:15, block:"C", unit:"g9", deck:"b2", goal:"Pasiva en todos sus tiempos, que es como el inglés dice el «se» español.", days:[
  { t:"La pasiva y el «se» impersonal", focus:"leccion", uoe:"trans", task:"Reescribe 10 frases activas en pasiva y di cuáles mejoran y cuáles no." },
  { t:"Escucha: noticias e informes", focus:"escucha", task:"Escucha un boletín de noticias, anota 6 pasivas y reescríbelas en activa." },
  { t:"Pasiva impersonal: it is said that…", focus:"drills", uoe:"trans", task:"Seis frases en las dos formas: «It is said that he…» y «He is said to…»." },
  { t:"Un informe en registro impersonal", focus:"writing", task:"Módulo 07: report de 160 palabras con subtítulos, sin contracciones y con pasiva donde toque." },
  { t:"Lectura: textos informativos y datos", focus:"lectura", task:"Marca cada pasiva del texto y pregúntate por qué el autor la eligió." },
]},
{ w:16, block:"C", unit:"g10", deck:"verb", goal:"Reportar lo que otro dijo, con el verbo introductorio correcto.", days:[
  { t:"Backshift y cambios de tiempo y lugar", focus:"leccion", uoe:"trans", task:"Reporta 10 frases dichas ayer." },
  { t:"Preguntas indirectas sin inversión", focus:"drills", uoe:"trans", task:"Reporta 8 preguntas. Vigila que no quede «where did I live»." },
  { t:"Admit, deny, suggest, refuse, warn", focus:"drills", uoe:"trans", task:"Ocho frases, cada una con su verbo introductorio y su patrón." },
  { t:"Resumir una reunión", focus:"writing", task:"150 palabras reportando lo que se dijo, con cinco verbos introductorios distintos." },
  { t:"Escucha: tomar notas y reportar", focus:"escucha", task:"Escucha, toma notas y escribe 6 frases reportando lo que oíste." },
]},
{ w:17, block:"C", unit:"g11", deck:"coll", goal:"Causativo y conectores: dos cosas pequeñas que suben mucho la nota.", days:[
  { t:"Have y get something done", focus:"leccion", uoe:"trans", task:"Ocho frases sobre cosas que otros hacen por ti." },
  { t:"Make, let y get someone to do", focus:"drills", uoe:"trans", task:"Seis frases contrastando los tres patrones." },
  { t:"Although, despite, however, whereas", focus:"drills", unit:"g16", deck:"conn", uoe:"cloze", task:"Reescribe 10 frases cambiando el conector sin cambiar el sentido." },
  { t:"Un texto de contraste", focus:"writing", task:"Essay de 180 palabras a favor y en contra, con cuatro conectores distintos bien puntuados." },
  { t:"Speaking: discrepar con educación", focus:"speaking", task:"Tres minutos de tarea colaborativa. Discrepa al menos dos veces sin sonar brusco." },
]},
{ w:18, block:"C", unit:"g6", deck:"fa", goal:"Estructuras irreales y falsos amigos: los dos delatores del hispanohablante.", days:[
  { t:"Wish, if only, would rather, it's time", focus:"leccion", uoe:"trans", task:"Ocho frases: cuatro sobre el presente y cuatro sobre el pasado." },
  { t:"Wish con would: la molestia", focus:"drills", uoe:"trans", task:"Seis frases quejándote de lo que otros hacen." },
  { t:"Falsos amigos que cuestan puntos", focus:"drills", deck:"fa", uoe:"wform", task:"Escribe una frase correcta con cada uno de los 12 falsos amigos de hoy." },
  { t:"Tercer control: simulacro", focus:"simulacro", task:"Cronometrado. Compáralo con las semanas 6 y 12." },
  { t:"Reescribir el peor texto del curso", focus:"writing", task:"Coge tu texto más flojo y reescríbelo entero con lo aprendido." },
]},

/* ── Bloque D · Formato, velocidad y nervios ────────────────────── */
{ w:19, block:"D", unit:"g16", deck:"conn", goal:"Cohesión: que el texto se lea como uno solo, no como frases pegadas.", days:[
  { t:"Conectores por función, no por lista", focus:"leccion", uoe:"cloze", task:"Clasifica 20 conectores por función y escribe un párrafo con cinco." },
  { t:"Referencia y sustitución: this, that, one, so", focus:"drills", uoe:"cloze", task:"Reescribe un párrafo repetitivo usando referencia en vez de repetir." },
  { t:"Use of English contra el reloj", focus:"drills", uoe:"trans", task:"Cronometra cada parte por separado y anota los minutos reales." },
  { t:"Un essay cohesionado", focus:"writing", task:"Essay de 180 palabras. Al terminar, marca con color cada elemento de cohesión." },
  { t:"Lectura: multiple matching", focus:"lectura", task:"Practica el barrido: localiza antes de leer en detalle." },
]},
{ w:20, block:"D", unit:"g17", deck:"b2", goal:"Inversión y estructuras enfáticas, con medida: una o dos por texto.", days:[
  { t:"Inversión tras adverbio negativo", focus:"leccion", uoe:"trans", task:"Ocho frases invertidas con never, rarely, not only y no sooner." },
  { t:"Cleft sentences: what, all, it was", focus:"drills", uoe:"trans", task:"Reescribe 8 frases planas dándoles énfasis." },
  { t:"Lectura: énfasis en textos reales", focus:"lectura", task:"Busca inversiones y cleft sentences en el texto y anota por qué el autor las usa justo ahí, y no en otra frase." },
  { t:"Writing: las dos tareas en 80 minutos", focus:"writing", task:"Un essay y una review en tiempo real, con reloj." },
  { t:"Speaking parte 4 con matices", focus:"speaking", task:"Dos minutos usando admittedly, having said that y to a certain extent." },
]},
{ w:21, block:"D", unit:"g9", deck:"comp", goal:"Semana de writing: los cinco formatos, cada uno con su registro.", days:[
  { t:"Essay: el formato obligatorio", focus:"writing", task:"Módulo 07, tarea 3. Los tres puntos, incluida tu propia idea." },
  { t:"Review: recomendar con una crítica dentro", focus:"writing", task:"Módulo 07, tarea 4. Sin crítica, el criterio de contenido se hunde." },
  { t:"Report: subtítulos y registro impersonal", focus:"writing", task:"Módulo 07, tarea 5. Una sola recomendación, bien justificada." },
  { t:"Proposal: mirar al futuro y prever la objeción", focus:"writing", task:"Módulo 07, tarea 6. Trata explícitamente una objeción." },
  { t:"Correo formal de reclamación", focus:"writing", task:"Módulo 07, tarea 7. Hechos, efecto y petición concreta con plazo." },
]},
{ w:22, block:"D", unit:"g7", deck:"phr", goal:"Semana de speaking y escucha: la parte que no se puede improvisar.", days:[
  { t:"Parte 1: fluidez sin memorizar", focus:"speaking", task:"Ocho preguntas seguidas, dos minutos. Sin muletillas en español." },
  { t:"Parte 2: comparar y especular", focus:"speaking", task:"Tres monólogos de un minuto con fotos distintas." },
  { t:"Parte 3: interacción de verdad", focus:"speaking", task:"Con alguien si puedes. Escucha y responde, no monologues." },
  { t:"Parte 4: opinión sostenida", focus:"speaking", task:"Cinco preguntas abstractas, dos minutos cada una." },
  { t:"Escucha: las cuatro partes del examen", focus:"escucha", task:"Un test completo. Dos escuchas y solo después el transcript." },
]},
{ w:23, block:"D", unit:"g2", deck:"b2", goal:"Ensayo general en condiciones reales y análisis en frío.", days:[
  { t:"Simulacro general", focus:"simulacro", task:"El mismo día de la semana y a la misma hora que tu examen." },
  { t:"Corregir en frío", focus:"repaso", task:"Revisa el simulacro de ayer. Clasifica cada fallo: nivel, formato, tiempo o nervios." },
  { t:"Trabajar solo la categoría mayor", focus:"repaso", task:"Dedica la sesión entera al tipo de fallo más repetido." },
  { t:"Writing y speaking completos", focus:"writing", task:"Las dos tareas escritas y las cuatro partes orales, cronometradas." },
  { t:"Repaso del cuaderno de errores", focus:"repaso", task:"Módulo 11: relee todo y quédate con los 20 errores que aún cometes." },
]},
{ w:24, block:"D", unit:"g2", deck:"fa", goal:"Semana del examen: bajar el volumen y llegar descansado.", days:[
  { t:"Solo repaso ligero", focus:"repaso", task:"Treinta minutos como mucho. Tus 20 errores y nada más." },
  { t:"Releer tus textos corregidos", focus:"repaso", task:"No escribas nada nuevo. Relee lo corregido y fíjate en los patrones." },
  { t:"Logística del examen", focus:"repaso", task:"Confirma sede, hora, documento y material permitido. Prepáralo todo hoy." },
  { t:"Mantener el oído", focus:"escucha", task:"Veinte minutos de escucha y cinco de speaking. Nada exigente." },
  { t:"Descansar", focus:"repaso", task:"Quince minutos de tarjetas y para. No estudies después de las ocho." },
]},
];
