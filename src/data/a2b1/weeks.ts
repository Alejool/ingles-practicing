import type { WeekSpec } from "../types";

/**
 * 24 semanas × 5 días = 120 sesiones de 45 minutos, de A2 a B1.
 * Más repetición y menos teoría que en la ruta B1 → B2: a este nivel
 * lo que falta es automatismo, no conocimiento nuevo.
 */
export const WEEKS: WeekSpec[] = [
/* ── Bloque A · Que la base deje de fallar ──────────────────────── */
{ w:1, block:"A", unit:"a1", deck:"core1", goal:"El presente simple con su -s puesta, sin pensarlo.", days:[
  { t:"Presente simple: la -s que todo el mundo olvida", focus:"leccion", uoe:"trans", task:"Escribe 10 frases sobre lo que hace tu familia. Todas en tercera persona." },
  { t:"He works, she studies, it goes", focus:"drills", uoe:"cloze", task:"Corrige 10 frases sin la -s y di en voz alta la forma correcta." },
  { t:"Lectura: la rutina de otra persona", focus:"lectura", task:"Subraya cada verbo en tercera persona del texto y comprueba que lleva su -s. Luego describe tu lunes en 8 frases." },
  { t:"Escribir una nota corta", focus:"writing", task:"Módulo 07, tarea 1: una nota de 40 palabras a un amigo. Corta y clara." },
  { t:"Speaking parte 1: presentarte", focus:"speaking", task:"Dos minutos hablando de ti. Nada memorizado: frases cortas y verdaderas." },
]},
{ w:2, block:"A", unit:"a5", deck:"core1", goal:"Preguntar y negar con do y does, que en español no existen.", days:[
  { t:"Do y does en preguntas", focus:"leccion", uoe:"trans", task:"Escribe 10 preguntas para conocer a alguien nuevo." },
  { t:"Don't y doesn't en negativas", focus:"drills", uoe:"cloze", task:"Diez frases negativas sobre lo que no haces nunca." },
  { t:"El orden de la pregunta: nada de «Where you live?»", focus:"drills", uoe:"trans", task:"Reordena 10 preguntas desordenadas." },
  { t:"Lectura: entender sin saberlo todo", focus:"lectura", task:"Lee el texto entero sin diccionario. Anota solo 5 palabras que te bloquearon de verdad." },
  { t:"Hacer preguntas en voz alta", focus:"speaking", task:"Graba 10 preguntas seguidas. Escúchate: ¿suena a pregunta la entonación?" },
]},
{ w:3, block:"A", unit:"a2", deck:"core1", goal:"Distinguir lo que haces siempre de lo que estás haciendo ahora.", days:[
  { t:"Present continuous: ahora mismo", focus:"leccion", uoe:"trans", task:"Escribe 8 frases sobre lo que está pasando a tu alrededor." },
  { t:"Simple o continuo: cuál toca", focus:"drills", uoe:"cloze", task:"Ocho pares de frases con el mismo verbo en las dos formas." },
  { t:"Verbos que no llevan -ing", focus:"drills", uoe:"trans", task:"Corrige 8 frases con «I am knowing», «I am wanting» y similares." },
  { t:"Describir una foto por escrito", focus:"writing", task:"Módulo 07, tarea 3: 100 palabras describiendo tu ciudad o tu barrio." },
  { t:"Speaking parte 2: describir una imagen", focus:"speaking", task:"Un minuto describiendo una foto. Empieza por lo general y baja al detalle." },
]},
{ w:4, block:"A", unit:"a4", deck:"verbs", goal:"El pasado simple y los treinta irregulares que salen siempre.", days:[
  { t:"Pasado simple: regulares y la -ed", focus:"leccion", deck:"verbs", uoe:"trans", task:"Cuenta lo que hiciste ayer en 10 frases." },
  { t:"Los irregulares de alta frecuencia", focus:"drills", deck:"verbs", uoe:"cloze", task:"Aprende 12 tríadas y escribe una frase con cada una." },
  { t:"Did en preguntas y negativas del pasado", focus:"drills", deck:"verbs", uoe:"trans", task:"Diez preguntas sobre las vacaciones de alguien. Vigila: «Did you went» no existe." },
  { t:"Contar algo que pasó", focus:"writing", task:"100 palabras sobre un día que recuerdes. Todo en pasado." },
  { t:"Escucha: reconocer el pasado al vuelo", focus:"escucha", task:"Anota cada verbo en pasado que oigas y su infinitivo." },
]},
{ w:5, block:"A", unit:"a3", deck:"core1", goal:"There is, there are y los artículos, que el español coloca de otra forma.", days:[
  { t:"There is y there are", focus:"leccion", uoe:"cloze", task:"Describe tu habitación en 10 frases, alternando singular y plural." },
  { t:"A, an y the", focus:"drills", uoe:"cloze", task:"Escribe un párrafo de 60 palabras y justifica cada artículo." },
  { t:"Some, any y el artículo cero", focus:"drills", uoe:"cloze", task:"Diez frases sobre lo que hay y lo que no hay en tu cocina." },
  { t:"Escribir un correo informal", focus:"writing", task:"Módulo 07, tarea 2: correo de 100 palabras respondiendo a un amigo." },
  { t:"Lectura: localizar información concreta", focus:"lectura", task:"Responde las preguntas señalando la línea exacta que lo dice." },
]},
{ w:6, block:"A", unit:"a1", deck:"core1", goal:"Cerrar el bloque A: primer simulacro y foto real del punto de partida.", days:[
  { t:"Repaso de las unidades 1 a 5", focus:"repaso", task:"Repite todos los drills. Anota las unidades por debajo del 80%." },
  { t:"Vaciar la caja 1", focus:"repaso", task:"Todas las tarjetas falladas hasta dejar la caja 1 vacía." },
  { t:"Primer simulacro", focus:"simulacro", task:"Módulo 10 completo. Es tu línea de partida, no un examen." },
  { t:"Reescribir lo escrito hasta ahora", focus:"writing", task:"Coge tus dos textos y reescríbelos con la corrección recibida." },
  { t:"Speaking: partes 1 y 2 seguidas", focus:"speaking", task:"Tres minutos. Transcribe y busca los tres errores que más repites." },
]},

/* ── Bloque B · Empezar a construir frases de verdad ─────────────── */
{ w:7, block:"B", unit:"a7", deck:"adj", goal:"Comparar sin calcar el «más… que» del español.", days:[
  { t:"Comparativos: -er y more", focus:"leccion", uoe:"trans", task:"Compara 10 pares de cosas de tu vida." },
  { t:"Superlativos y los irregulares good, bad, far", focus:"drills", uoe:"cloze", task:"Ocho superlativos sobre tu ciudad, tu trabajo y tu familia." },
  { t:"Lectura: comparar con datos", focus:"lectura", task:"Localiza cada comparativo y superlativo del texto y escribe 5 frases tuyas con as… as y not as… as." },
  { t:"Un texto que compara", focus:"writing", task:"100 palabras comparando dos lugares donde hayas vivido." },
  { t:"Speaking: comparar dos fotos", focus:"speaking", task:"Un minuto comparando, no describiendo por separado." },
]},
{ w:8, block:"B", unit:"a9", deck:"prep", goal:"In, on y at, que no se deducen: se memorizan.", days:[
  { t:"Preposiciones de tiempo: in, on, at", focus:"leccion", deck:"prep", uoe:"cloze", task:"Escribe 12 frases con fechas, horas, meses y partes del día." },
  { t:"Preposiciones de lugar", focus:"drills", deck:"prep", uoe:"cloze", task:"Describe dónde está todo en tu casa, 10 frases." },
  { t:"Verbos con preposición fija", focus:"drills", deck:"prep", uoe:"trans", task:"Diez frases con listen to, wait for, arrive at, depend on y compañía." },
  { t:"Open cloze: donde caen las preposiciones", focus:"drills", uoe:"cloze", task:"Haz el open cloze entero y justifica cada hueco." },
  { t:"Escucha: preposiciones en habla rápida", focus:"escucha", task:"Transcribe 5 frases del audio prestando atención a las preposiciones." },
]},
{ w:9, block:"B", unit:"a6", deck:"core2", goal:"Hablar del futuro con will y going to sin mezclarlos.", days:[
  { t:"Will y going to", focus:"leccion", uoe:"trans", task:"Seis planes con going to y seis decisiones del momento con will." },
  { t:"Escucha: planes y citas", focus:"escucha", task:"Anota cada plan que oigas y si usa will, going to o presente continuo." },
  { t:"Nada de will después de when o if", focus:"drills", uoe:"trans", task:"Corrige 8 frases con «when I will…»." },
  { t:"Escribir sobre tus planes", focus:"writing", task:"100 palabras sobre lo que harás este año." },
  { t:"Speaking parte 1: planes y deseos", focus:"speaking", task:"Dos minutos sobre tus planes. Alterna will y going to según toque." },
]},
{ w:10, block:"B", unit:"a8", deck:"core2", goal:"Contables e incontables, y los incontables que en español sí se cuentan.", days:[
  { t:"Much, many y a lot of", focus:"leccion", uoe:"cloze", task:"Diez frases sobre cantidades en tu día a día." },
  { t:"A few, a little, few, little", focus:"drills", uoe:"cloze", task:"Ocho frases contrastando las cuatro formas." },
  { t:"Information, advice, news: sin plural", focus:"drills", uoe:"wform", task:"Corrige 8 frases con «informations» y «an advice»." },
  { t:"Un correo pidiendo información", focus:"writing", task:"Módulo 07, tarea 5: correo semiformal de 100 palabras a una escuela." },
  { t:"Lectura: datos y cantidades", focus:"lectura", task:"Marca cada cantidad del texto y comprueba si es contable o no." },
]},
{ w:11, block:"B", unit:"a11", deck:"phr", goal:"Colocar los adverbios donde el inglés los pone.", days:[
  { t:"Adverbios de frecuencia y su sitio", focus:"leccion", uoe:"trans", task:"Diez frases sobre tus hábitos, cada una con un adverbio distinto." },
  { t:"Lectura: dónde van los adverbios", focus:"lectura", task:"Marca los adverbios del texto y la posición de cada uno respecto al verbo. Copia 5 frases como modelo." },
  { t:"Phrasal verbs del día a día", focus:"drills", deck:"phr", uoe:"trans", task:"Una frase con cada uno de los 10 phrasal verbs de hoy." },
  { t:"Escribir una historia corta", focus:"writing", task:"Módulo 07, tarea 4: 100 palabras a partir de la primera frase dada." },
  { t:"Speaking parte 3: ponerse de acuerdo", focus:"speaking", task:"Dos minutos discutiendo opciones con alguien y un minuto para decidir." },
]},
{ w:12, block:"B", unit:"a4", deck:"verbs", goal:"Control de medio curso: repetir el diagnóstico y comparar.", days:[
  { t:"Repetir el diagnóstico", focus:"repaso", task:"Módulo 02 entero. Compara área por área con el de la semana 1." },
  { t:"Las áreas que siguen en rojo", focus:"repaso", task:"Repite las unidades por debajo del 70%." },
  { t:"Segundo simulacro", focus:"simulacro", task:"Cronometrado. Compara con el de la semana 6." },
  { t:"Writing en tiempo real", focus:"writing", task:"Dos tareas seguidas con reloj, como en el examen." },
  { t:"Speaking: las cuatro partes", focus:"speaking", task:"Las cuatro seguidas, grabadas. Transcribe la peor." },
]},

/* ── Bloque C · Entrar en B1 ─────────────────────────────────────── */
{ w:13, block:"C", unit:"a12", deck:"core2", goal:"Present perfect: la forma que el español no tiene igual.", days:[
  { t:"Have you ever…? Experiencias de vida", focus:"leccion", uoe:"trans", task:"Ocho preguntas con ever y sus respuestas." },
  { t:"Just, already y yet", focus:"drills", uoe:"cloze", task:"Diez frases usando cada marcador dos veces." },
  { t:"Perfect o pasado: el marcador decide", focus:"drills", uoe:"trans", task:"Ocho pares contrastando «I saw him yesterday» y «I have seen him»." },
  { t:"Contar experiencias por escrito", focus:"writing", task:"100 palabras sobre tres cosas que has hecho en tu vida." },
  { t:"Escucha: have y contracciones", focus:"escucha", task:"Anota cada «'ve» y «'s» que oigas y qué verbo esconde." },
]},
{ w:14, block:"C", unit:"a10", deck:"core2", goal:"Modales: poder, deber y aconsejar sin traducir literalmente.", days:[
  { t:"Can, could y be able to", focus:"leccion", uoe:"trans", task:"Ocho frases sobre lo que sabes hacer y lo que sabías hacer de niño." },
  { t:"Must y have to", focus:"drills", uoe:"cloze", task:"Ocho normas de tu trabajo o tu casa." },
  { t:"Lectura: normas y consejos", focus:"lectura", task:"Marca cada modal del texto y clasifícalo: obligación, prohibición, consejo o capacidad." },
  { t:"Escribir dando consejos", focus:"writing", task:"100 palabras aconsejando a alguien que llega nuevo a tu ciudad." },
  { t:"Speaking: dar consejos en voz alta", focus:"speaking", task:"Dos minutos aconsejando. Usa tres modales distintos." },
]},
{ w:15, block:"C", unit:"a13", deck:"core2", goal:"Primer condicional y oraciones de tiempo.", days:[
  { t:"If + presente, will + infinitivo", focus:"leccion", uoe:"trans", task:"Diez frases sobre consecuencias reales de tus decisiones." },
  { t:"When, as soon as, until, before", focus:"drills", uoe:"cloze", task:"Ocho frases temporales, todas sin will en la subordinada." },
  { t:"Unless y if not", focus:"drills", uoe:"trans", task:"Seis frases reescritas de if not a unless." },
  { t:"Un texto sobre consecuencias", focus:"writing", task:"110 palabras sobre qué pasará si cambias algo de tu rutina." },
  { t:"Lectura: causa y consecuencia", focus:"lectura", task:"Marca en el texto cada relación de causa y efecto." },
]},
{ w:16, block:"C", unit:"a14", deck:"coll", goal:"Gerundio o infinitivo después de los verbos más frecuentes.", days:[
  { t:"Like, love, hate, enjoy: con -ing", focus:"leccion", uoe:"trans", task:"Diez frases sobre lo que te gusta y odias hacer." },
  { t:"Want, need, decide, hope: con to", focus:"drills", uoe:"cloze", task:"Diez frases sobre lo que quieres y necesitas hacer." },
  { t:"Lectura: verbos con -ing y con to", focus:"lectura", task:"Subraya cada verbo seguido de otro verbo y anota si lleva -ing o to. Clasifícalos en dos columnas." },
  { t:"Un post de blog", focus:"writing", task:"Módulo 07, tarea 6: 100 palabras sobre un hábito tuyo." },
  { t:"Speaking parte 4: gustos y opiniones", focus:"speaking", task:"Dos minutos sobre lo que disfrutas y por qué." },
]},
{ w:17, block:"C", unit:"a12", deck:"fa", goal:"Falsos amigos y vocabulario preciso, que a B1 ya se nota.", days:[
  { t:"Actually, library, carpet, embarrassed", focus:"leccion", deck:"fa", uoe:"wform", task:"Una frase correcta con cada uno de los 10 falsos amigos de hoy." },
  { t:"Formación de palabras: -ful, -less, -er, -ly", focus:"drills", deck:"comp", uoe:"wform", task:"Forma las cuatro derivadas de 10 palabras raíz." },
  { t:"Prefijos negativos: un-, in-, im-", focus:"drills", deck:"comp", uoe:"wform", task:"Ocho frases con adjetivos negados correctamente." },
  { t:"Escribir con vocabulario preciso", focus:"writing", task:"110 palabras evitando good, bad, nice y very. Busca alternativas." },
  { t:"Escucha: palabras parecidas que confunden", focus:"escucha", task:"Anota 8 palabras que confundiste al oírlas y su forma correcta." },
]},
{ w:18, block:"C", unit:"a7", deck:"core2", goal:"Tercer control: dónde estás a dos tercios del camino.", days:[
  { t:"Repaso de las unidades 6 a 14", focus:"repaso", task:"Todos los drills de las nueve unidades. Anota las flojas." },
  { t:"Vocabulario: cajas 1 y 2", focus:"repaso", task:"Vacía las dos primeras cajas del Leitner." },
  { t:"Tercer simulacro", focus:"simulacro", task:"Cronometrado. Compara con las semanas 6 y 12." },
  { t:"Reescribir el peor texto", focus:"writing", task:"Coge tu texto más flojo y reescríbelo entero." },
  { t:"Speaking completo y grabado", focus:"speaking", task:"Las cuatro partes. Evalúa tu transcripción con los criterios." },
]},

/* ── Bloque D · Formato de examen y confianza ───────────────────── */
{ w:19, block:"D", unit:"a3", deck:"core2", goal:"Reading y Use of English con el reloj puesto.", days:[
  { t:"Reading: leer las preguntas primero", focus:"lectura", task:"Cronometra: 90 segundos de barrido, después responde." },
  { t:"Use of English contra el reloj", focus:"drills", uoe:"trans", task:"Cronometra cada bloque por separado y anota tus minutos reales." },
  { t:"Open cloze completo", focus:"drills", uoe:"cloze", task:"Hazlo entero. Los huecos gramaticales son puntos regalados." },
  { t:"Word formation completo", focus:"drills", uoe:"wform", task:"Los 12 ítems. Vigila plurales y prefijos negativos." },
  { t:"Analizar los fallos", focus:"repaso", task:"Clasifica los fallos de la semana: ¿nivel, prisa o despiste?" },
]},
{ w:20, block:"D", unit:"a5", deck:"conn", goal:"Semana de writing: los formatos que caen en el examen.", days:[
  { t:"La nota corta", focus:"writing", task:"Módulo 07, tarea 1. Las tres cosas que pide el enunciado, sin pasarse de palabras." },
  { t:"El correo informal", focus:"writing", task:"Módulo 07, tarea 2. Responde a todo lo que te preguntan." },
  { t:"La descripción", focus:"writing", task:"Módulo 07, tarea 3. Adjetivos precisos, nada de nice y good." },
  { t:"La historia", focus:"writing", task:"Módulo 07, tarea 4. Empieza por la frase dada y cierra el relato." },
  { t:"El correo semiformal", focus:"writing", task:"Módulo 07, tarea 5. Registro cuidado, sin contracciones." },
]},
{ w:21, block:"D", unit:"a10", deck:"core1", goal:"Semana de speaking y escucha.", days:[
  { t:"Parte 1: responder con naturalidad", focus:"speaking", task:"Diez preguntas seguidas. Amplía cada respuesta a dos frases." },
  { t:"Parte 2: describir una foto un minuto entero", focus:"speaking", task:"Tres fotos distintas, un minuto cada una, sin quedarte callado." },
  { t:"Parte 3: la tarea con opciones", focus:"speaking", task:"Discute cinco opciones y decide. Pregunta al otro, no monologues." },
  { t:"Parte 4: conversación general", focus:"speaking", task:"Cinco preguntas abiertas, respuesta de tres frases cada una." },
  { t:"Escucha completa", focus:"escucha", task:"Un test entero. Dos escuchas y solo después el transcript." },
]},
{ w:22, block:"D", unit:"a2", deck:"verbs", goal:"Cerrar agujeros: solo lo que sigue fallando.", days:[
  { t:"Las tres unidades más flojas", focus:"repaso", task:"Mira el radar del panel y repite las tres peores." },
  { t:"Los verbos irregulares que aún fallas", focus:"repaso", deck:"verbs", task:"Solo los que llevas fallando. En voz alta, las tres formas." },
  { t:"Cuaderno de errores", focus:"repaso", task:"Módulo 11: relee todo y quédate con los 15 errores vivos." },
  { t:"Writing: reescribir dos textos", focus:"writing", task:"Los dos peores del curso, con toda la corrección aplicada." },
  { t:"Speaking sobre tus errores", focus:"speaking", task:"Habla dos minutos vigilando conscientemente tus tres errores más repetidos." },
]},
{ w:23, block:"D", unit:"a4", deck:"core2", goal:"Ensayo general en condiciones reales.", days:[
  { t:"Simulacro general", focus:"simulacro", task:"El mismo día de la semana y a la misma hora que tu examen." },
  { t:"Corregir en frío", focus:"repaso", task:"Revisa el simulacro de ayer y clasifica cada fallo." },
  { t:"Trabajar solo la categoría mayor", focus:"repaso", task:"La sesión entera al tipo de fallo más repetido." },
  { t:"Writing y speaking completos", focus:"writing", task:"Las tareas escritas y las cuatro partes orales, con reloj." },
  { t:"Logística del examen", focus:"repaso", task:"Confirma sede, hora, documento y material permitido." },
]},
{ w:24, block:"D", unit:"a1", deck:"core1", goal:"Semana del examen: repaso ligero y descanso.", days:[
  { t:"Solo lo que ya sabes", focus:"repaso", task:"Treinta minutos como mucho. Tus 15 errores vivos." },
  { t:"Releer lo corregido", focus:"repaso", task:"No escribas nada nuevo. Relee y fíjate en los patrones." },
  { t:"Mantener el oído", focus:"escucha", task:"Veinte minutos de escucha cómoda. Nada exigente." },
  { t:"Hablar sin presión", focus:"speaking", task:"Cinco minutos hablando de lo que quieras, sin corregirte." },
  { t:"Descansar", focus:"repaso", task:"Quince minutos de tarjetas y para. Duerme bien." },
]},
];
