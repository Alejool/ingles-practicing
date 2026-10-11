import type { Transformation, Cloze, WordForm } from "../types";

/**
 * Use of English de B2 → C1, tramo 1.
 *
 * Transformaciones con palabra clave como en C1 Advanced (Part 4): la respuesta
 * tiene de tres a seis palabras y una contracción cuenta como dos.
 *
 * El orden no es temático a propósito. El plan saca los ítems del día con
 * `(día × 3 + k) % total`, y con este orden las lecciones de los días 1, 6 y 11
 * reciben solo ítems de su unidad (ver `specs/ruta-b2-c1/programa-tramo-1.md`).
 * Temas: clefts t1, t2, t19–t22 · inversión t4–t9 · condicionales t10–t15 ·
 * modales perfectos t3, t16–t18, t23, t24.
 */
export const TRANS: Transformation[] =[
{id:"t1",s1:"The lack of consultation angered residents most.",key:"WHAT",s2:"______________________ was the lack of consultation.",a:["what angered residents most","what most angered residents","what angered the residents most","what most angered the residents","what angered residents the most","what angered the residents the most"],e:"Wh-cleft: <b>What + verbo… + was + foco</b>. La cláusula con <i>What</i> hace de sujeto: «Lo que más enfadó a los vecinos fue…»."},
{id:"t2",s1:"I didn't realise how ill he was until I visited him.",key:"WAS",s2:"It ______________________ him that I realised how ill he was.",a:["was not until i visited","wasn't until i visited","was only when i visited","was only after i visited","was only on visiting","was only after visiting"],e:"It-cleft con foco temporal: <b>It was not until… that…</b> La negación pasa al foco y el segundo verbo queda en afirmativa (<i>that I realised</i>)."},
{id:"t3",s1:"You printed the documents, but it wasn't necessary: I had copies.",key:"NEED",s2:"You ______________________ the documents: I had copies.",a:["need not have printed","needn't have printed","did not need to print","didn't need to print"],e:"<b>needn't have + participio</b> es la forma que dice sin ambigüedad que la acción se hizo y resultó innecesaria. <i>didn't need to print</i> también se acepta: no aclara por sí solo si se imprimieron o no, pero es gramatical y aquí el contexto ya lo dice."},
{id:"t4",s1:"The minister did not admit his mistake until the documents were leaked.",key:"DID",s2:"Not until the documents were leaked ______________________ his mistake.",a:["did the minister admit"],e:"<i>Not until + cláusula</i> al principio → inversión en la oración principal: <b>did + sujeto + forma base</b>."},
{id:"t5",s1:"As soon as the results were announced, the share price collapsed.",key:"SOONER",s2:"No ______________________ announced than the share price collapsed.",a:["sooner had the results been","sooner were the results"],e:"<b>No sooner + had + sujeto + participio… than…</b> Aquí en pasiva: <i>had the results been announced</i>. La pareja de <i>no sooner</i> es <i>than</i>, no <i>when</i>."},
{id:"t6",s1:"You must not leave the laboratory unlocked for any reason.",key:"ACCOUNT",s2:"On ______________________ be left unlocked.",a:["no account must the laboratory","no account should the laboratory","no account may the laboratory","no account can the laboratory","no account is the laboratory to"],e:"<b>On no account + modal + sujeto</b>: prohibición enfática con inversión. La frase pasa a pasiva porque el sujeto es ahora <i>the laboratory</i>."},
{id:"t7",s1:"We had no idea that the project would take ten years.",key:"LITTLE",s2:"______________________ that the project would take ten years.",a:["little did we know","little did we realise","little did we realize","little did we suspect","little did we imagine","little did we think","little did we expect"],e:"<b>Little did + sujeto + know / realise…</b>: «poco imaginábamos que…». <i>Little</i> inicial es negativo y exige inversión."},
{id:"t8",s1:"The damage was so extensive that the bridge had to be demolished.",key:"SUCH",s2:"______________________ the damage that the bridge had to be demolished.",a:["such was the extent of","such was the scale of"],e:"<b>Such + be + sustantivo + that…</b> El adjetivo <i>extensive</i> pasa a sustantivo (<i>extent</i>): inversión y nominalización a la vez."},
{id:"t9",s1:"You can only appreciate the scale of the building by seeing it from the air.",key:"CAN",s2:"Only by seeing the building from the air ______________________ its scale.",a:["can you appreciate","can one appreciate","can you really appreciate","can you fully appreciate","can you truly appreciate"],e:"<b>Only by + -ing</b> al principio → inversión en la principal: <i>can you appreciate</i>."},
{id:"t10",s1:"If you need any assistance, our staff will be happy to help.",key:"SHOULD",s2:"______________________ any assistance, our staff will be happy to help.",a:["should you need","should you require"],e:"Condicional formal sin <i>if</i>: <b>Should + sujeto + infinitivo sin to</b>."},
{id:"t11",s1:"The firm survived only because the bank agreed to an emergency loan.",key:"BEEN",s2:"Had it ______________________ the bank's emergency loan, the firm would not have survived.",a:["not been for"],e:"<b>Had it not been for + sustantivo</b> = <i>If it hadn't been for…</i> En la forma invertida <i>not</i> no se contrae."},
{id:"t12",s1:"Without her mother's encouragement, she would never have applied.",key:"BUT",s2:"______________________ encouragement, she would never have applied.",a:["but for her mother's"],e:"<b>But for + sustantivo</b>: «de no ser por…». Sustituye a toda la condición."},
{id:"t13",s1:"He didn't take the job in Oslo, which is why he doesn't speak Norwegian now.",key:"WOULD",s2:"If he had taken the job in Oslo, he ______________________ now.",a:["would speak norwegian","would be speaking norwegian","would be able to speak norwegian"],e:"Condicional mixto: condición pasada (<i>had taken</i>), resultado presente (<i>now</i>) → <b>would + infinitivo</b>, no <i>would have</i>."},
{id:"t14",s1:"If the council decided to close the pool, there would be protests.",key:"WERE",s2:"______________________ close the pool, there would be protests.",a:["were the council to decide to"],e:"<b>Were + sujeto + to + infinitivo</b> = <i>If the council were to decide…</i>: hipótesis remota en registro formal. La respuesta tiene que conservar <i>decide</i>, que está en la frase original."},
{id:"t15",s1:"They will lend us the equipment, but we have to insure it ourselves.",key:"CONDITION",s2:"They will lend us the equipment ______________________ it ourselves.",a:["on condition that we insure","on the condition that we insure","on condition we insure"],e:"<b>on condition (that) + oración</b>: introduce un requisito. El verbo va en presente, no con <i>will</i>."},
{id:"t16",s1:"I expect you have already heard about the merger.",key:"WILL",s2:"You ______________________ about the merger.",a:["will have already heard","will already have heard","will have heard"],e:"<b>will have + participio</b> no es futuro aquí: es una suposición confiada sobre el pasado («ya te habrás enterado»)."},
{id:"t17",s1:"It's quite possible that the files were deleted by accident.",key:"WELL",s2:"The files ______________________ deleted by accident.",a:["may well have been","might well have been","could well have been"],e:"<b>may / might / could well have + participio</b>: «es muy posible que…». Pasiva: <i>have been deleted</i>."},
{id:"t18",s1:"It was inconsiderate of you not to warn us about the delay.",key:"MIGHT",s2:"You ______________________ us about the delay.",a:["might have warned","might at least have warned"],e:"<b>might have + participio</b> como reproche: algo que se pudo hacer y no se hizo."},
{id:"t19",s1:"The government simply ignored the report.",key:"DID",s2:"All the ______________________ ignore the report.",a:["government did was","government did was to","government did was simply","government did was simply to"],e:"<b>All + sujeto + did + was + infinitivo</b>: «lo único que hizo fue…». El infinitivo puede llevar <i>to</i> o no."},
{id:"t20",s1:"The talks failed because neither side would compromise.",key:"REASON",s2:"The ______________________ that neither side would compromise.",a:["reason why the talks failed was","reason the talks failed was","reason that the talks failed was","reason for the talks failing was","reason for the talks' failure was"],e:"<b>The reason (why)… was that…</b> En registro formal la segunda parte lleva <i>that</i>, no <i>because</i>."},
{id:"t21",s1:"Her attitude bothers me, not her lack of experience.",key:"IS",s2:"It ______________________ me, not her lack of experience.",a:["is her attitude that bothers","is her attitude which bothers"],e:"It-cleft de contraste: <b>It is X that…, not Y</b>. El foco es un sustantivo de cosa, así que también es posible <i>which</i>. El verbo concuerda con el foco (<i>attitude → bothers</i>)."},
{id:"t22",s1:"The only thing we need is a little more time.",key:"ALL",s2:"______________________ a little more time.",a:["all we need is","all that we need is","all that is needed is"],e:"<b>All (that) + sujeto + verbo + is…</b>: <i>All</i> equivale a <i>the only thing</i>."},
{id:"t23",s1:"It is impossible that she wrote the report herself; she was abroad all month.",key:"HAVE",s2:"She ______________________ the report herself; she was abroad all month.",a:["cannot have written","can't have written","could not have written","couldn't have written"],e:"Imposibilidad lógica sobre el pasado: <b>can't / couldn't have + participio</b>."},
{id:"t24",s1:"Perhaps the witness didn't recognise him.",key:"MAY",s2:"The witness ______________________ him.",a:["may not have recognised","may not have recognized"],e:"<b>may not have + participio</b>: «puede que no…». Posibilidad negativa, no imposibilidad."}
];

export const CLOZE: Cloze ={
 title:"The stubborn survival of handwriting",
 parts:[
 "Predictions of the death of handwriting are almost as old as the typewriter, ",{g:1,a:["yet","but","though","although"],e:"Contraste entre dos oraciones completas: <b>yet</b> es la opción más natural en registro escrito; <i>but</i> y <i>(al)though</i> también encajan."}," the habit has proved remarkably hard to kill. Not ",
 {g:2,a:["only"],e:"<b>Not only + inversión</b> (<i>do people still keep</i>) <i>… but…</i>"}," do people still keep paper notebooks, but shops selling fountain pens are reported to be doing well. Part of the explanation may lie ",
 {g:3,a:["in"],e:"Preposición dependiente: <b>lie in</b> = «residir en»."}," the way writing by hand slows us down. ",
 {g:4,a:["unlike"],e:"<b>Unlike + sustantivo o gerundio</b>: «a diferencia de». <i>Contrary</i> necesitaría <i>to</i>."}," typing, which lets us take down speech almost word for word, handwriting forces us to select and compress, and it is this effort ",
 {g:5,a:["that","which"],e:"It-cleft: <b>it is this effort that…</b> El foco es un sustantivo de cosa, así que también es posible <i>which</i>; con un foco adverbial solo valdría <i>that</i>."}," seems to make ideas stick. There is, admittedly, little agreement ",
 {g:6,a:["as"],e:"<b>as to</b> + pregunta indirecta = «en cuanto a», «sobre»."}," to how large the effect is, and some researchers regard the whole debate ",
 {g:7,a:["as"],e:"<b>regard something as</b>: el verbo exige <i>as</i>; no admite <i>like</i> ni infinitivo."}," a distraction. Even ",
 {g:8,a:["so"],e:"<b>Even so</b> = «aun así». Conector concesivo que cierra la objeción anterior."}," , few would dispute that a page of handwriting carries something a screen does ",
 {g:9,a:["not"],e:"Elipsis: <i>does not</i> [carry]. El auxiliar basta; el verbo no se repite."}," : the trace of a particular hand on a particular day. ",
 {g:10,a:["whether"],e:"<b>Whether or not…</b> introduce una duda como sujeto de la frase. <i>If</i> no puede ir seguido de <i>or not</i> en esta posición."}," or not that justifies the hours children spend learning joined-up letters is another matter, and one on ",
 {g:11,a:["which"],e:"Relativo tras preposición: <b>on which</b>. Después de preposición no cabe <i>that</i>."}," teachers themselves are divided. What is beyond doubt is that the pen has outlived a good many of the machines that were supposed to replace ",
 {g:12,a:["it"],e:"Pronombre que retoma <i>the pen</i>: <b>it</b>."}," ."
 ]
};

export const CLOZE2: Cloze ={
 title:"Who decides what a city keeps?",
 parts:[
 "",{g:1,a:["what"],e:"Wh-cleft: <b>What + cláusula + is…</b> = «Lo que hace que…»."}," makes an old building worth keeping is rarely its age alone. It was only after whole districts had been flattened in the decades following the war ",
 {g:2,a:["that"],e:"It-cleft con foco temporal: <b>It was only after… that…</b> Nunca <i>when</i>."}," planners began to ask what was being lost, and not ",
 {g:3,a:["until","till"],e:"<b>Not until + tiempo + inversión</b> (<i>did the law catch up</i>)."}," much later did the law catch up with them. Supporters of strict protection argue that, ",
 {g:4,a:["were"],e:"Condicional invertido: <b>Were it not for…</b> = <i>If it were not for…</i>"}," it not for the legal protection such buildings now enjoy, many streets we take for granted would long ",
 {g:5,a:["since","ago"],e:"<b>long since</b> = «hace ya mucho»; va entre el auxiliar y <i>have</i> + participio. También se acepta <i>long ago</i> en la misma posición."}," have disappeared. Their critics reply that the rules may well ",
 {g:6,a:["have"],e:"Modal perfecto: <b>may well have + participio</b> («es muy posible que hayan salvado…»)."}," saved the facades but have done so at a price: ",
 {g:7,a:["had"],e:"Condicional invertido de pasado irreal: <b>Had + sujeto + participio</b> = <i>If the owners had been free…</i>"}," the owners been free to adapt their properties, they say, far fewer would be standing empty today. Neither side, it must be said, is entirely free ",
 {g:8,a:["from","of"],e:"<b>free from / free of</b> + sustantivo: «libre de»."}," exaggeration. A building that cannot be altered at all is likely to end ",
 {g:9,a:["up"],e:"Phrasal verb: <b>end up as</b> = «acabar convertido en»."}," as a museum piece or a ruin; one that can be altered at will is hardly protected. What is needed, surely, is a system flexible ",
 {g:10,a:["enough"],e:"<b>adjetivo + enough + to-infinitivo</b>: <i>enough</i> va detrás del adjetivo."}," to tell the two cases apart. Seldom, however, ",
 {g:11,a:["has"],e:"Inversión tras <i>Seldom</i>: <b>has legislation been praised</b>. Sujeto incontable → singular."}," legislation been praised for its subtlety, and it is local officials, not ministers, ",
 {g:12,a:["who","that"],e:"It-cleft con foco personal: <b>it is… who</b> (o <i>that</i>) <i>will have to…</i>"}," will have to make the distinction work."
 ]
};

export const WFORM: WordForm[] =[
{id:"w1",s:"The minister's reply was dismissed as vague and ______ .",root:"EVADE",a:["evasive"],e:"Verbo → adjetivo en <b>-ive</b>, con cambio de consonante: <i>evade → evasive</i>, como <i>persuade → persuasive</i>."},
{id:"w2",s:"There has been a steady ______ of trust in public institutions.",root:"ERODE",a:["erosion"],e:"Verbo → sustantivo con cambio de consonante: <i>erode → erosion</i>, como <i>decide → decision</i>."},
{id:"w3",s:"The scheme proved ______ expensive to administer.",root:"PROHIBIT",a:["prohibitively"],e:"Verbo → adjetivo <i>prohibitive</i> → adverbio. <b>prohibitively expensive</b> es una colocación fija."},
{id:"w4",s:"The two accounts of the meeting are simply ______ : they cannot both be true.",root:"RECONCILE",a:["irreconcilable"],e:"<i>reconcile → reconcilable</i> y prefijo negativo <b>ir-</b> ante <i>r</i>. La segunda mitad de la frase obliga al sentido negativo."},
{id:"w5",s:"The report highlights the ______ of regions that depend on a single industry.",root:"VULNERABLE",a:["vulnerability","vulnerabilities"],e:"Adjetivo en <i>-able</i> → sustantivo en <b>-ability</b>."},
{id:"w6",s:"The regulator found that several of the claims made in the advertisement were entirely ______ .",root:"BASE",a:["baseless"],e:"Sustantivo + sufijo <b>-less</b> («sin»): <i>baseless</i>, sin fundamento. Colocación habitual: <i>baseless claims / accusations</i>."},
{id:"w7",s:"The damage to the manuscript is, sadly, ______ .",root:"REVERSE",a:["irreversible"],e:"<i>reverse → reversible</i> y prefijo negativo <b>ir-</b>. El adverbio <i>sadly</i> indica que el daño no tiene arreglo."},
{id:"w8",s:"The author's ______ in the field is evident on every page.",root:"EXPERT",a:["expertise"],e:"Sustantivo abstracto de origen francés: <b>expertise</b> /ˌekspɜːˈtiːz/, incontable."},
{id:"w9",s:"To describe the losses as 'modest' was an ______ : they were the largest in the company's history.",root:"STATE",a:["understatement"],e:"Prefijo <i>under-</i> + sustantivo en <i>-ment</i>: <b>understatement</b>, quedarse corto al describir algo. El artículo <i>an</i> pide una palabra que empiece por vocal, y el sentido (unas pérdidas enormes llamadas «modestas») descarta <i>overstatement</i>."},
{id:"w10",s:"The ______ of new evidence led to the case being reopened.",root:"EMERGE",a:["emergence"],e:"Verbo → sustantivo en <b>-ence</b>: <i>emergence</i>, aparición. No confundir con <i>emergency</i>."}
];
