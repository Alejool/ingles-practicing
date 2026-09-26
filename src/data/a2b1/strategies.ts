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
 {t:"Listening · escuchar sin entenderlo todo",b:[
 "<b>Acepta el 60%.</b> A nivel A2–B1 no vas a entender cada palabra, y el examen no lo pide. Pide localizar tres o cuatro datos concretos.","<b>Primera escucha, sin escribir.</b> Solo dos preguntas en la cabeza: ¿quién habla y de qué? Con eso el segundo pase se vuelve mucho más fácil.","<b>Segunda escucha, con las preguntas delante.</b> Escucha esperando el dato: un precio, una hora, un lugar, una opinión.","<b>Si pierdes el hilo, salta.</b> Quedarte pensando en la palabra que no entendiste te hace perder las tres frases siguientes. Suelta y vuelve a enganchar.","<b>Al final, transcript.</b> Lee mientras escuchas y marca solo lo que conocías por escrito pero no reconociste de oído. Eso es tu problema real, no el vocabulario nuevo."]},
 {t:"Qué hacer con las palabras que no conoces",b:[
 "<b>No pares y no traduzcas.</b> Sigue leyendo hasta el punto: muchas veces la frase siguiente explica la palabra.","<b>Mira qué tipo de palabra es.</b> Si va detrás de <i>the</i> es un sustantivo; si acaba en <i>-ly</i> es un adverbio. Saber la función ya te da la mitad del sentido.","<b>Busca el signo:</b> ¿es algo bueno o malo? <i>but</i>, <i>however</i>, <i>luckily</i> te dicen hacia dónde va la frase aunque no sepas el vocabulario.","<b>Usa las palabras parecidas al español con cuidado:</b> <i>actually</i> no es «actualmente», <i>library</i> no es «librería», <i>sensible</i> no es «sensible».","<b>Anota solo las que se repiten.</b> Una palabra que aparece dos veces en el mismo texto merece ir a tu cuaderno; una rara, no."]},
 {t:"Reading · leer las preguntas antes que el texto",b:[
 "<b>1. Lee las preguntas, no las opciones.</b> Las cuatro opciones te meten ideas falsas en la cabeza antes de leer.","<b>2. Subraya la palabra clave de cada pregunta:</b> un nombre, un momento, un número. Es lo que vas a buscar.","<b>3. Lee el texto entero una vez, rápido</b>, sin diccionario, para saber de qué va cada párrafo.","<b>4. Responde en orden.</b> En B1 Preliminary las preguntas siguen el orden del texto: si la 3 estaba en el párrafo 2, la 4 no está antes.","<b>5. Señala la línea exacta.</b> Si no puedes poner el dedo en la frase que lo justifica, estás respondiendo por lógica o por conocimiento del mundo, y eso falla."]},
 {t:"Dieta semanal realista para A2–B1",b:[
 "<b>Diario, 10 min:</b> un episodio corto con transcript. BBC Learning English (<i>The English We Speak</i>, <i>6 Minute English</i>) o cualquier podcast para estudiantes. Escúchalo dos veces, no una.","<b>3 días/semana, 15 min:</b> un texto de 300–500 palabras adaptado a tu nivel: graded readers, noticias fáciles, o los textos de un libro de B1 Preliminary.","<b>2 días/semana:</b> 20 minutos de serie con subtítulos <b>en inglés</b>. Nunca en español: con subtítulos en tu idioma el oído se apaga.","<b>1 día/semana:</b> un vídeo de un tema que ya conoces bien (cocina, deporte, tu trabajo). Entiendes más porque ya sabes de qué va, y eso da confianza.","<b>Regla del 70%:</b> si entiendes casi todo, el material es demasiado fácil y no aprendes; si entiendes menos de la mitad, te cansas y lo dejas. Busca algo entre medias."]}
];
