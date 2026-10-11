import type { WeekSpec } from "../types";

/**
 * Tramo 1 de B2 → C1: semanas 1 a 4, 20 sesiones de 45 minutos.
 * El reparto de minutos lo pone `schedule.ts` según el `focus`; aquí va el qué.
 * Las semanas 5 a 24 llegan con el tramo 2. No hay día de simulacro.
 */
export const WEEKS: WeekSpec[] = [
/* ── Bloque A · Énfasis y precisión ─────────────────────────────── */
{ w:1, block:"A", unit:"g1", deck:"c1col", goal:"Inversión tras adverbiales negativos: saber cuándo se invierte, en cuál de las dos oraciones y cuándo no.", days:[
  { t:"Inversión: never, seldom, under no circumstances", focus:"leccion", uoe:"trans", task:"Escribe 8 frases sobre tu trabajo o tus estudios, cada una con un adverbial negativo distinto al principio. Subraya el auxiliar y el sujeto." },
  { t:"Hardly… when, no sooner… than, only y not until", focus:"drills", uoe:"trans", task:"Reescribe 6 frases normales con Only when, Not until y No sooner. Marca en cuál de las dos oraciones va la inversión." },
  { t:"Lectura C1: seguir un argumento, no cazar datos", focus:"lectura", task:"Resume en una frase qué hace el autor en cada párrafo (plantea, concede, rebate, concluye) y copia 8 colocaciones del texto con su verbo." },
  { t:"Essay de C1 Advanced: dos puntos y una postura", focus:"writing", task:"Módulo de Writing, tarea 1: essay de 220–260 palabras. Una sola inversión, colocada donde quieras dar énfasis, y ninguna más." },
  { t:"Speaking parte 1: respuestas con matiz", focus:"speaking", task:"Responde 6 preguntas de la parte 1. Cada respuesta: postura, matiz y ejemplo, en unos veinte segundos." },
]},
{ w:2, block:"A", unit:"g2", deck:"c1col", goal:"Poner el foco donde quieres con cleft sentences, sin calcar «fue entonces cuando».", days:[
  { t:"It-clefts: It was… that", focus:"leccion", uoe:"trans", task:"Toma 6 frases neutras y enfoca en cada una un elemento distinto con It is… that o It was… that." },
  { t:"What-clefts y All I did was…", focus:"drills", uoe:"cloze", task:"Escribe 8 frases con What… is o was: cuatro que enfoquen un sustantivo y cuatro que enfoquen una acción (What they did was…)." },
  { t:"The reason why… y It wasn't until… that", focus:"drills", uoe:"trans", task:"Corrige 8 frases con «It was then when», «It was there where» y «The reason is because», y di qué regla incumplía cada una." },
  { t:"Proposal: recomendar con registro formal", focus:"writing", task:"Módulo de Writing, tarea 2: proposal de 220–260 palabras con epígrafes. Abre una de las recomendaciones con un cleft (What the college needs is…)." },
  { t:"Escucha: entrevista larga y actitud del hablante", focus:"escucha", uoe:"wform", task:"Anota 8 momentos en que el invitado dice algo sin decirlo directamente, y cómo lo parafrasea la pregunta correspondiente." },
]},
{ w:3, block:"A", unit:"g3", deck:"c1phr", goal:"Condicionales mixtos e invertidos: Had we known, Were it not for, Should you need.", days:[
  { t:"Condicionales mixtos en los dos sentidos", focus:"leccion", uoe:"trans", task:"Escribe 6 frases sobre decisiones tuyas: 3 con causa pasada y efecto presente, y 3 con causa permanente y efecto pasado." },
  { t:"Should, were y had en lugar de if", focus:"drills", uoe:"trans", task:"Reescribe 8 condicionales con if en su versión invertida. Ninguna contracción en las negativas." },
  { t:"Lectura C1: actitud del autor y vocabulario en contexto", focus:"lectura", task:"Señala 5 frases en las que el autor matiza o concede, y di con qué palabra o expresión lo hace." },
  { t:"Review: describir, valorar y recomendar", focus:"writing", task:"Módulo de Writing, tarea 3: review de 220–260 palabras. Incluye un condicional invertido en la recomendación final." },
  { t:"Speaking parte 2: comparar y especular un minuto", focus:"speaking", task:"Un minuto cronometrado por consigna: compara dos situaciones y responde a las dos preguntas. Grábate y cuenta cuántas veces especulaste." },
]},
{ w:4, block:"A", unit:"g4", deck:"c1phr", goal:"Especular sobre el pasado con toda la escala: will have, may well have, can't have, needn't have.", days:[
  { t:"Grados de certeza sobre el pasado", focus:"leccion", uoe:"trans", task:"Cuenta un malentendido reciente en 8 frases, cada una con un modal perfecto distinto." },
  { t:"Reproche, expectativa y posibilidad no cumplida", focus:"drills", uoe:"cloze", task:"Escribe 6 pares de frases: might have y could have como reproche y como algo que pudo pasar y no pasó; needn't have frente a didn't need to." },
  { t:"Escucha: monólogo informativo y propósito", focus:"escucha", uoe:"wform", task:"Para cada idea del audio, anota si la hablante informa, se defiende o ironiza, y la frase que lo delata." },
  { t:"Repaso de las unidades 1 a 4", focus:"repaso", task:"Repite los drills de las cuatro unidades y vacía la caja 1 de los dos mazos. Anota las unidades que bajen del 80 %." },
  { t:"Speaking parte 3: negociar sin monologar", focus:"speaking", task:"Tres minutos con un compañero, o grabándote en los dos papeles: dos de discusión y uno para decidir. Cuenta cuántas veces invitaste al otro a opinar." },
]},
];
