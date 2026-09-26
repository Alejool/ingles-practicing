import type { Transformation, Cloze, WordForm } from "../types";

export const TRANS: Transformation[] =[
{id:"t1",s1:"This is my brother's car.",key:"BELONGS",s2:"This car ______________________ my brother.",a:["belongs to"],e:"<b>belong to</b> + persona para expresar posesión. Ojo: no se usa en continuo (<i>is belonging</i> es incorrecto)."},
{id:"t2",s1:"The shirt was very expensive, so I didn't buy it.",key:"TOO",s2:"The shirt ______________________ to buy.",a:["was too expensive"],e:"<b>too + adjetivo + to + infinitivo</b> indica exceso que impide algo. <i>Too</i> nunca va con sustantivo directamente."},
{id:"t3",s1:"I started studying English five years ago.",key:"FOR",s2:"I ______________________ five years.",a:["have studied english for","have been studying english for","'ve studied english for","'ve been studying english for"],e:"Acción empezada en el pasado que sigue: <b>present perfect + for</b> + periodo. En español usarías presente («estudio desde hace…»)."},
{id:"t4",s1:"Tom is taller than Ana.",key:"AS",s2:"Ana ______________________ Tom.",a:["is not as tall as","isn't as tall as"],e:"Comparativo de igualdad en negativa: <b>not as + adjetivo + as</b>."},
{id:"t5",s1:"You will fail the test if you don't study.",key:"UNLESS",s2:"You will fail the test ______________________ .",a:["unless you study"],e:"<b>unless</b> = <i>if… not</i>. Por eso el verbo va en afirmativa: nunca <i>unless you don't study</i>."},
{id:"t6",s1:"Someone cleans the office every evening.",key:"IS",s2:"The office ______________________ every evening.",a:["is cleaned"],e:"Pasiva de presente simple: <b>is + participio</b>. El agente (<i>someone</i>) desaparece porque no aporta nada."},
{id:"t7",s1:"'I'll call you tomorrow,' Ana said to me.",key:"TOLD",s2:"Ana ______________________ call me the next day.",a:["told me she would","told me that she would","told me she'd"],e:"Estilo indirecto: <i>say to somebody</i> pasa a <b>tell somebody</b>, y <i>will</i> retrocede a <b>would</b>."},
{id:"t8",s1:"It is forbidden to use your phone during the exam.",key:"MUSTN'T",s2:"You ______________________ your phone during the exam.",a:["mustn't use","must not use"],e:"Prohibición: <b>mustn't</b>. Con <i>don't have to</i> el sentido cambiaría a «no hace falta»."},
{id:"t9",s1:"Why don't we take the bus?",key:"LET'S",s2:"______________________ the bus.",a:["let's take","let us take"],e:"Sugerencia: <b>let's + infinitivo sin to</b>. Equivale a <i>why don't we…?</i> o <i>shall we…?</i>"},
{id:"t10",s1:"When I was a child, I played football every weekend.",key:"USED",s2:"I ______________________ football every weekend when I was a child.",a:["used to play"],e:"<b>used to + infinitivo</b> para hábitos del pasado que ya no ocurren."},
{id:"t11",s1:"He is too young to drive.",key:"ENOUGH",s2:"He ______________________ to drive.",a:["is not old enough","isn't old enough"],e:"<b>enough</b> va detrás del adjetivo: <i>old enough</i>. Y el adjetivo se invierte respecto a <i>too young</i>."},
{id:"t12",s1:"This is my first visit to London.",key:"NEVER",s2:"I ______________________ to London before.",a:["have never been","'ve never been"],e:"Experiencia hasta ahora: <b>present perfect</b>. Con <i>been</i>, no <i>gone</i>, porque ya has vuelto."}
];
export const CLOZE: Cloze ={
 title:"My first job",
 parts:[
 "Last summer I got my first job. I worked in ",{g:1,a:["a"],e:"Artículo indefinido <b>a</b> ante consonante y sustantivo contable singular que se menciona por primera vez."}," small café near my house. At first I was very nervous, ",
 {g:2,a:["because","as","since"],e:"Conector de causa seguido de sujeto y verbo. <i>Because of</i> no vale: iría con sustantivo."}," I had never worked before. My boss was patient, and she explained everything twice. I had to start ",
 {g:3,a:["at"],e:"<b>at</b> con horas concretas: <i>at eight o'clock</i>, <i>at midnight</i>."}," eight o'clock every morning, so I got up early. The work was hard, ",
 {g:4,a:["but","although","though"],e:"Contraste entre dos ideas dentro de la misma frase: <b>but</b>."}," the people were friendly. After two weeks I began to enjoy ",
 {g:5,a:["it"],e:"<i>enjoy</i> necesita objeto en inglés: <b>enjoy it</b>. En español dirías simplemente «disfrutar»."}," . I learned how to talk to customers and how to solve small problems ",
 {g:6,a:["without"],e:"<b>without</b> + sustantivo = «sin». Le sigue <i>any</i> porque la idea es negativa."}," any help. My English improved too: many tourists came to the café ",
 {g:7,a:["in"],e:"<b>in</b> con meses, estaciones y años: <i>in August</i>, <i>in winter</i>, <i>in 2024</i>."}," August. I ",
 {g:8,a:["am","'m"],e:"Auxiliar del present continuous para algo que sigue ocurriendo: <b>am + still + working</b>."}," still working there at weekends. The manager, ",
 {g:9,a:["who"],e:"Pronombre relativo para personas: <b>who</b>. Aquí va entre comas, así que <i>that</i> no es adecuado."}," is only twenty-five, says I can stay next summer. A first job teaches you ",
 {g:10,a:["more"],e:"Comparativo de <i>much</i>: <b>more … than</b>."}," than any course."
 ]
};
export const WFORM: WordForm[] =[
{id:"w1",s:"The village was quiet and very ______ .",root:"PEACE",a:["peaceful"],e:"Sufijo <i>-ful</i> forma adjetivos: «lleno de». Se escribe con una sola <i>l</i>."},
{id:"w2",s:"My phone is ______ without a charger.",root:"USE",a:["useless"],e:"Sufijo <i>-less</i> = «sin». Es el opuesto de <i>useful</i>."},
{id:"w3",s:"She works as a ______ in a big hotel.",root:"MANAGE",a:["manager"],e:"Sufijo <i>-er</i> para la persona que hace la acción. La <i>-e</i> final de la raíz desaparece."},
{id:"w4",s:"He speaks English very ______ .",root:"CLEAR",a:["clearly"],e:"Adverbio de modo en <i>-ly</i>, porque modifica al verbo <i>speaks</i>."},
{id:"w5",s:"We waited in complete ______ until the lights came back.",root:"DARK",a:["darkness"],e:"Sufijo <i>-ness</i> convierte un adjetivo en sustantivo abstracto e incontable."},
{id:"w6",s:"The ______ of the new bridge will take two years.",root:"CONSTRUCT",a:["construction"],e:"Verbo a sustantivo con <i>-ion</i>: <i>construct → construction</i>."},
{id:"w7",s:"Is the water from this tap ______ ?",root:"DRINK",a:["drinkable"],e:"Sufijo <i>-able</i> = «que se puede…». Compara con <i>washable</i>, <i>readable</i>."},
{id:"w8",s:"I was ______ to open the door because I had no key.",root:"ABLE",a:["unable"],e:"Prefijo negativo <i>un-</i>: <i>able → unable</i>."},
{id:"w9",s:"His answer was ______ , so the teacher explained it again.",root:"CORRECT",a:["incorrect"],e:"Prefijo negativo <i>in-</i>. Se elige según la palabra: no existe <i>uncorrect</i>."},
{id:"w10",s:"It is ______ to finish all this work today.",root:"POSSIBLE",a:["impossible"],e:"Ante <i>p-</i>, <i>b-</i> o <i>m-</i> el prefijo <i>in-</i> se convierte en <b>im-</b>."},
{id:"w11",s:"She is a very ______ person; everybody likes her.",root:"FRIEND",a:["friendly"],e:"Aquí <i>-ly</i> no forma un adverbio sino un adjetivo: <i>friendly</i>, como <i>lovely</i> o <i>lonely</i>."},
{id:"w12",s:"The film was long and really ______ .",root:"BORE",a:["boring"],e:"<i>-ing</i> describe la cosa que causa la sensación; <i>-ed</i> describe a la persona: <i>I was bored</i>."}
];
