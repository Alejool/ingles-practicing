/**
 * Las estrategias de estudio, aparte de los textos.
 *
 * Viven en su propio archivo porque la ficha de la ruta las necesita nada
 * más arrancar, mientras que las lecturas bajan después y por su cuenta. Si
 * ambas cosas comparten archivo, el empaquetador tiene que meter los textos
 * en el bundle inicial y la carga perezosa deja de servir para nada.
 */

import type { Strategy } from "../types";

export const STRATS: Strategy[] =[
 {t:"Listening · el protocolo de tres pases",b:["<b>Pase 1 — sin texto.</b> Escucha entero sin pausar. Solo idea general. Si no entiendes, no pasa nada: es el objetivo.","<b>Pase 2 — con las preguntas delante.</b> Ahora escuchas buscando información concreta. Pausa solo al final de cada sección.","<b>Pase 3 — con transcript.</b> Lee mientras escuchas y marca cada punto donde tu oído no reconoció algo que sí conoces por escrito. Eso, y no el vocabulario nuevo, es tu problema real.","<b>Después:</b> anota 10 paráfrasis. El examen nunca repite la palabra del audio en la pregunta: si el audio dice <i>I couldn't make it</i>, la opción dirá <i>he failed to attend</i>."]},
 {t:"Listening · lo que de verdad no oyes",b:["<b>Formas débiles:</b> <i>can</i> /kən/, <i>to</i> /tə/, <i>of</i> /əv/, <i>and</i> /ən/. No son sonidos nuevos: son los mismos, comprimidos.","<b>Enlaces:</b> <i>an apple</i> suena /əˈnæpl/, <i>what do you</i> suena /wɒdʒə/.","<b>Contracciones dobles:</b> <i>I'd've</i>, <i>shouldn't've</i>, <i>there'll</i>.","<b>Shadowing, 5 minutos:</b> repite en voz alta medio segundo por detrás del audio. Es el único ejercicio que arregla las tres cosas de arriba a la vez."]},
 {t:"Reading · orden de ataque",b:["<b>1. Lee las preguntas primero</b>, no las opciones. Las opciones contaminan tu lectura.","<b>2. Skim del texto en 90 segundos</b> para el mapa general: de qué va cada párrafo.","<b>3. Localiza y lee en detalle</b> solo el fragmento que responde a cada pregunta.","<b>4. Justifica con el texto.</b> Si no puedes señalar la línea exacta, no es la respuesta: es tu conocimiento del mundo.","<b>5. Descarta activamente.</b> En B2, tres opciones son verdad a medias: una exagera, otra invierte una relación causal, otra dice algo cierto pero que no responde la pregunta."]},
 {t:"Dieta semanal de entrada",b:["<b>Diario, 20 min:</b> un podcast con transcript. BBC Learning English · The English We Speak · All Ears English para B1; Hidden Brain, 99% Invisible o cualquier podcast técnico de tu sector para B2.","<b>3 días/semana:</b> un artículo de 600–900 palabras. The Guardian, BBC News, Ars Technica. Subraya 10 colocaciones, no palabras sueltas.","<b>2 días/semana:</b> 20 minutos de serie con subtítulos <i>en inglés</i>. Nunca en español: los subtítulos en tu idioma apagan el oído.","<b>1 día/semana:</b> un vídeo técnico de tu campo sin subtítulos. Toleras no entenderlo todo; ese es el ejercicio.","<b>Regla:</b> el material debe ser un poco difícil pero seguible. Si entiendes el 100%, no entrenas; si entiendes menos del 50%, no aprendes."]}
];
