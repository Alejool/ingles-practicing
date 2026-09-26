import type { MockPaper } from "../types";

export const MOCK: MockPaper ={
 p1:{title:"Parte 1 · Multiple-choice cloze",intro:"Elige la palabra que encaja mejor en cada hueco. Aquí se mira el vocabulario: verbos con partícula, colocaciones fijas y parejas de palabras que se confunden.",
 text:["Two years ago, Ana decided to ",{n:1}," running. At first she could only run for five minutes, and she nearly ",
 {n:2}," up after the first week. Then a neighbour told her about a free club that ",{n:3},
 " in the park every Saturday morning. Ana was nervous on the first day, but nobody there cared about speed. Some people ran, some people walked, and everybody ",
 {n:4}," hello at the end. Six months later she ",{n:5},
 " part in her first race. She finished almost last, and she says that is not the ",{n:6},
 ". For her, the club is about company, not medals."],
 items:[
 {n:1,o:["get up","take up","make up","look up"],a:1,e:"<b>take up a sport</b> = empezar a practicarlo. <i>get up</i> es levantarse, <i>make up</i> inventar y <i>look up</i> buscar en un diccionario."},
 {n:2,o:["gave","left","stopped","finished"],a:0,e:"<b>give up</b> = rendirse, dejarlo. Los otros tres verbos no forman phrasal verb con <i>up</i> en este sentido."},
 {n:3,o:["joins","arrives","meets","visits"],a:2,e:"<b>a club meets</b> = el club se reúne. <i>join</i> es lo que hace la persona (<i>she joined the club</i>), no el club."},
 {n:4,o:["told","said","spoke","talked"],a:1,e:"<b>say hello</b> es fijo. <i>tell</i> necesita persona detrás (<i>tell somebody something</i>) y <i>speak/talk</i> van con <i>to</i>."},
 {n:5,o:["made","did","took","had"],a:2,e:"<b>take part in</b> = participar en. Es una de las colocaciones con <i>take</i> que hay que memorizar enteras."},
 {n:6,o:["idea","point","reason","thing"],a:1,e:"<b>that's not the point</b> = no se trata de eso. Expresión fija; <i>the reason</i> o <i>the idea</i> no funcionan aquí."}]},
 p2:{title:"Parte 2 · Open cloze",intro:"Escribe UNA sola palabra en cada hueco. Casi siempre es una palabra gramatical: preposición, artículo, comparativo, auxiliar o conector.",
 text:["The public library in my town is much busier ",{n:7}," it was ten years ago. People come here ",
 {n:8}," borrow books, of course, but they also come to study, to use the internet or simply to keep warm. On Tuesday evenings there is a free class ",
 {n:9}," anyone who wants to practise English. It is run ",{n:10},
 " two volunteers and you do not have to sign up. My sister has been going ",{n:11},
 " March and she says her speaking has improved a lot. If I ",{n:12}," more free time, I would go with her."],
 items:[
 {n:7,a:["than"],e:"Segundo término de una comparación: <b>busier than</b>. Con <i>-er</i> delante, la palabra que falta es casi siempre <i>than</i>."},
 {n:8,a:["to"],e:"Infinitivo de finalidad: <b>come here to borrow books</b> = vienen para coger libros. En español dirías «para», en inglés basta <i>to</i>."},
 {n:9,a:["for"],e:"<b>a class for someone</b> = una clase destinada a alguien. <i>To</i> no sirve: no hay movimiento ni destinatario de un envío."},
 {n:10,a:["by"],e:"Pasiva con agente: <b>it is run by two volunteers</b>. Detrás de un participio pasivo, si aparece quién lo hace, la preposición es <i>by</i>."},
 {n:11,a:["since"],e:"<b>since + momento concreto</b> (March, 2019, Monday). Con un periodo de tiempo sería <i>for</i>."},
 {n:12,a:["had"],e:"Segundo condicional: <b>If I had more free time, I would go</b>. La forma es pasado simple en la parte del <i>if</i>, aunque hable del presente."}]},
 p3:{title:"Parte 3 · Word formation",intro:"Cambia la palabra de la derecha para que encaje en la frase. Mira si hace falta un sustantivo, un adjetivo o un adverbio, y si el sentido es negativo.",
 items:[
 {n:13,s:"The film was so ______ that I fell asleep after twenty minutes.",root:"BORE",a:["boring"],e:"Adjetivo en <i>-ing</i> porque describe la película, no a la persona. <i>Bored</i> sería yo (<i>I was bored</i>)."},
 {n:14,s:"Swimming in this river is ______ , especially after the rain.",root:"DANGER",a:["dangerous"],e:"Sustantivo → adjetivo con <i>-ous</i>. Detrás del verbo <i>be</i> hace falta adjetivo, no sustantivo."},
 {n:15,s:"It was a difficult ______ , but in the end she moved to Berlin.",root:"DECIDE",a:["decision"],e:"Verbo → sustantivo con <i>-sion</i>. La pista es <i>a</i> + adjetivo delante del hueco: ahí solo cabe un sustantivo contable."},
 {n:16,s:"The people at the hotel were very ______ and helped us with everything.",root:"FRIEND",a:["friendly"],e:"Sustantivo → adjetivo con <i>-ly</i>. Cuidado: <i>-ly</i> no siempre es adverbio (<i>friendly</i>, <i>lovely</i>, <i>daily</i> son adjetivos)."},
 {n:17,s:"This map is completely ______ ; the street names are all wrong.",root:"USE",a:["useless"],e:"El punto y coma explica el sentido: si los nombres están mal, el mapa no sirve. <i>-less</i> = sin, lo contrario de <i>-ful</i>."},
 {n:18,s:"He was very ______ when he saw his exam results.",root:"HAPPY",a:["unhappy"],e:"Prefijo negativo <i>un-</i>. El contexto (malos resultados) es lo que te dice que hace falta la forma negativa; la frase sola admitiría <i>happy</i>."}]},
 p4:{title:"Parte 4 · Key word transformations",intro:"Completa la segunda frase para que signifique lo mismo que la primera. Usa entre DOS y CINCO palabras, incluida la palabra clave, y no la cambies.",
 items:[
 {n:19,s1:"This is my brother's car.",key:"BELONGS",s2:"This car ______________ my brother.",a:["belongs to"],e:"<b>belong to somebody</b> = pertenecer a alguien. El genitivo sajón se convierte en el verbo <i>belong</i> + <i>to</i>."},
 {n:20,s1:"I started learning English six years ago.",key:"BEEN",s2:"I ______________ English for six years.",a:["have been learning","have been studying"],e:"<b>Present perfect continuous</b> para una acción que empezó en el pasado y sigue. Con <i>for</i> + periodo, nunca presente simple."},
 {n:21,s1:"It isn't necessary to book a table.",key:"HAVE",s2:"You ______________ book a table.",a:["don't have to","do not have to"],e:"<b>don't have to</b> = no es necesario. No confundir con <i>mustn't</i>, que sería una prohibición."},
 {n:22,s1:"My sister is taller than me.",key:"AS",s2:"I ______________ my sister.",a:["am not as tall as"],e:"<b>not as + adjetivo + as</b>. Al invertir el sujeto hay que pasar la frase a negativa; si no, cambia el significado."},
 {n:23,s1:"Somebody stole my bike last night.",key:"WAS",s2:"My bike ______________ last night.",a:["was stolen"],e:"Pasiva: el objeto pasa a sujeto. <i>Somebody</i> desaparece porque no importa quién fue."},
 {n:24,s1:"\"Where do you live?\" she asked me.",key:"LIVED",s2:"She asked me where ______________ .",a:["i lived"],e:"Estilo indirecto: el presente pasa a pasado y el orden vuelve a ser sujeto + verbo, sin <i>do</i> y sin interrogación."}]}
};
