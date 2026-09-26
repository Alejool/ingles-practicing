import type { Transformation, Cloze, WordForm } from "../types";

export const TRANS: Transformation[] =[
{id:"t1",s1:"I haven't seen her since 2019.",key:"LAST",s2:"The ______________________ her was in 2019.",a:["last time i saw"],e:"<b>The last time I saw</b>. Estructura fija <i>the last time + sujeto + pasado simple</i>."},
{id:"t2",s1:"It's a pity I didn't study more before the exam.",key:"WISH",s2:"I ______________________ more before the exam.",a:["wish i had studied"],e:"<b>wish + past perfect</b> para arrepentimiento sobre el pasado."},
{id:"t3",s1:"Someone stole my laptop at the conference.",key:"HAD",s2:"I ______________________ at the conference.",a:["had my laptop stolen"],e:"Causativo pasivo con sentido de víctima: <b>have something stolen</b>."},
{id:"t4",s1:"People think he left the country in May.",key:"THOUGHT",s2:"He ______________________ the country in May.",a:["is thought to have left"],e:"Pasiva impersonal + infinitivo perfecto porque el hecho es anterior."},
{id:"t5",s1:"It isn't necessary to book in advance.",key:"HAVE",s2:"You ______________________ in advance.",a:["don't have to book","do not have to book"],e:"Ausencia de obligación: <b>don't have to</b>. Con <i>mustn't</i> cambiaría a prohibición."},
{id:"t6",s1:"I'm sure she didn't see the email.",key:"CANNOT",s2:"She ______________________ the email.",a:["cannot have seen","can not have seen"],e:"Deducción negativa sobre el pasado: <b>cannot have + participio</b>."},
{id:"t7",s1:"Although it was raining, we went out.",key:"SPITE",s2:"We went out ______________________ rain.",a:["in spite of the"],e:"<b>in spite of</b> + sustantivo. Con <i>despite</i> también, pero la palabra clave obliga."},
{id:"t8",s1:"The last time I ate sushi was two years ago.",key:"FOR",s2:"I ______________________ two years.",a:["haven't eaten sushi for","have not eaten sushi for"],e:"Duración negativa hasta ahora: present perfect + <b>for</b>."},
{id:"t9",s1:"Please don't tell anyone about this.",key:"RATHER",s2:"I ______________________ anyone about this.",a:["would rather you didn't tell","would rather you did not tell","'d rather you didn't tell"],e:"<b>would rather + sujeto + pasado</b> con valor presente o futuro."},
{id:"t10",s1:"She started working here three months ago.",key:"BEEN",s2:"She ______________________ three months.",a:["has been working here for"],e:"Duración que continúa → present perfect continuous + <i>for</i>."},
{id:"t11",s1:"It isn't worth complaining about it now.",key:"POINT",s2:"There ______________________ about it now.",a:["is no point in complaining","'s no point in complaining"],e:"<b>There's no point in + -ing</b>. Estructura fija con preposición."},
{id:"t12",s1:"I regret not asking for help earlier.",key:"SHOULD",s2:"I ______________________ for help earlier.",a:["should have asked"],e:"<b>should have + participio</b> para reproche o arrepentimiento."},
{id:"t13",s1:"I have never seen such a badly written spec.",key:"NEVER",s2:"Never ______________________ such a badly written spec.",a:["have i seen"],e:"Inversión obligatoria tras <i>Never</i> en posición inicial."},
{id:"t14",s1:"They will finish the report by Friday.",key:"BEEN",s2:"The report ______________________ by Friday.",a:["will have been finished","will have been completed"],e:"Future perfect en pasiva: <b>will have been + participio</b>."}
];
export const CLOZE: Cloze ={
 title:"Why adults get stuck",
 parts:[
 "Most people assume that learning a language as an adult is ",{g:1,a:["far","much","a"],e:"Intensificador del comparativo: <b>far / much</b> + harder."}," harder than learning one as a child. In ",
 {g:2,a:["fact","reality"],e:"<b>In fact</b> introduce la corrección de una idea previa."}," , research suggests that adults often progress faster at first, ",
 {g:3,a:["because","as","since"],e:"Conector de causa seguido de sujeto y verbo."}," they can rely on strategies children do not have. ",
 {g:4,a:["what"],e:"Cleft sentence: <b>What</b> = «Lo que…»."}," makes the difference in the long run is not age ",
 {g:5,a:["but"],e:"Correlación <b>not X but Y</b>."}," consistency: twenty focused minutes a day will take you ",
 {g:6,a:["further","farther"],e:"Comparativo irregular de <i>far</i> en sentido figurado: <b>further</b>."}," than a five-hour session once a month. ",
 {g:7,a:["whether"],e:"<b>Whether … or</b> introduce dos alternativas; <i>if</i> no funciona con <i>or</i> aquí."}," you decide to study alone or with a teacher, the key is feedback. Without ",
 {g:8,a:["it","that","this"],e:"Pronombre que retoma <i>feedback</i>, incontable."}," , mistakes quietly become habits, and habits are far ",
 {g:9,a:["more"],e:"Comparativo con adjetivo largo: <b>more difficult</b>."}," difficult to correct than simple gaps in knowledge. This is ",
 {g:10,a:["the"],e:"Artículo definido ante un término técnico ya presentado: <b>the so-called…</b>"}," so-called fossilisation, and it explains ",
 {g:11,a:["why"],e:"<b>why</b> introduce la razón como oración subordinada."}," so many learners stay at the same level ",
 {g:12,a:["for"],e:"<b>for</b> + periodo de tiempo."}," years."
 ]
};
export const WFORM: WordForm[] =[
{id:"w1",s:"The instructions were completely ______ .",root:"COMPREHEND",a:["incomprehensible"],e:"Prefijo <i>in-</i> + <i>comprehensible</i>. La raíz cambia respecto a <i>understand</i>."},
{id:"w2",s:"She gave a very ______ presentation.",root:"PERSUADE",a:["persuasive"],e:"Sufijo adjetival <i>-ive</i>, con pérdida de la <i>-de</i>."},
{id:"w3",s:"Our main ______ is speed of delivery.",root:"STRONG",a:["strength"],e:"Sustantivo irregular: <i>strong → strength</i>."},
{id:"w4",s:"The results were ______ disappointing.",root:"DEEP",a:["deeply"],e:"Adverbio en <i>-ly</i> intensificando un adjetivo."},
{id:"w5",s:"Management was ______ to approve the budget.",root:"RELUCTANCE",a:["reluctant"],e:"Del sustantivo al adjetivo: <i>reluctance → reluctant</i>."},
{id:"w6",s:"There is no ______ that the leak came from us.",root:"PROVE",a:["proof"],e:"Sustantivo irregular con cambio de consonante: <i>prove → proof</i>."},
{id:"w7",s:"The system's ______ has improved since the rewrite.",root:"RELIABLE",a:["reliability"],e:"Adjetivo → sustantivo abstracto en <i>-ility</i>."},
{id:"w8",s:"It would be ______ to ignore that warning.",root:"RESPONSIBLE",a:["irresponsible"],e:"Prefijo negativo <i>ir-</i> ante <i>r-</i>."},
{id:"w9",s:"We need a ______ solution, not another patch.",root:"LAST",a:["lasting"],e:"Participio presente usado como adjetivo: <i>lasting</i> = duradero."},
{id:"w10",s:"The audit highlighted several ______ in our process.",root:"WEAK",a:["weaknesses"],e:"Adjetivo → sustantivo <i>-ness</i>, aquí en plural contable."},
{id:"w11",s:"Their response was ______ slow.",root:"SURPRISE",a:["surprisingly"],e:"Sustantivo → adjetivo <i>-ing</i> → adverbio <i>-ly</i>."},
{id:"w12",s:"______ has fallen since the new process was introduced.",root:"PRODUCE",a:["productivity"],e:"Familia larga: <i>produce → production → productive → productivity</i>."},
{id:"w13",s:"The change had little ______ for our users.",root:"SIGNIFY",a:["significance"],e:"Verbo → sustantivo abstracto <i>-ance</i>, con cambio de raíz."},
{id:"w14",s:"He apologised for the ______ caused by the outage.",root:"CONVENIENT",a:["inconvenience"],e:"Prefijo <i>in-</i> + sufijo <i>-ence</i>: <b>inconvenience</b>, incontable aquí."}
];
