import type { Drill } from "../types";

/** Drills adicionales por unidad. Se fusionan con GRAM en tracks.ts. */
export const EXTRA_DRILLS: Record<string, Drill[]> = {
  g1: [
    {q:"My uncle ___ a small bookshop near the station.",o:["owns","is owning","own","has owned"],a:0,e:"<i>own</i> es verbo de estado (posesión): no admite forma continua aunque hablemos de algo permanente."},
    {q:"Please be quiet, the baby ___.",o:["sleeps","is sleeping","sleep","has slept"],a:1,e:"Acción en curso ahora mismo → continuous, aunque no sea un verbo de estado."},
    {q:"Scientists ___ that the universe is expanding.",o:["are believing","believes","believe","have believed"],a:2,e:"<i>believe</i> es verbo de estado: no se usa en continuo aunque la creencia sea actual."},
    {q:"The company ___ its prices at the moment because of the crisis.",o:["reviews","review","has reviewed","is reviewing"],a:3,e:"<i>at the moment</i> señala algo temporal en curso → continuous, no el hábito de <i>review</i>."},
    {q:"I ___ what you’re trying to say, but I still don’t agree.",o:["understand","am understanding","understands","have been understanding"],a:0,e:"<i>understand</i> es verbo de estado (entendimiento): jamás en continuo."},
    {q:"Petrol prices ___ again this month.",o:["rise","are rising","rises","have rise"],a:1,e:"Tendencia visible y temporal este mes → continuous, como con la adopción de políticas en la regla."}
  ],
  g2: [
    {q:"I ___ this article twice, but I still don’t get the point.",o:["read","was reading","have read","had read"],a:2,e:"Sin marcador de tiempo terminado, y el número de veces importa ahora → present perfect."},
    {q:"We ___ that supplier back in 2020, before the merger.",o:["have hired","were hiring","have been hiring","hired"],a:3,e:"<i>back in 2020</i> es un momento pasado y terminado → past simple."},
    {q:"___ you finished the report yet?",o:["Have","Did","Was","Are"],a:0,e:"<i>yet</i> en preguntas sobre algo esperado → present perfect."},
    {q:"She ___ her degree last spring and started working immediately.",o:["has finished","finished","has been finishing","was finishing"],a:1,e:"<i>last spring</i> es un momento pasado y terminado → past simple."},
    {q:"This is the first time I ___ this software.",o:["used","was using","have used","use"],a:2,e:"<i>This is the first time</i> + present perfect es una estructura fija."},
    {q:"I ___ him at a conference two years ago.",o:["have met","have been meeting","was meeting","met"],a:3,e:"<i>two years ago</i> marca un momento pasado concreto → past simple."}
  ],
  g3: [
    {q:"My eyes hurt because I ___ at this screen for six hours.",o:["have been staring","stared","have stared","stare"],a:0,e:"El resultado visible (ojos cansados) se explica por la duración de la actividad → perfect continuous."},
    {q:"They ___ two houses since they started investing.",o:["have been buying","have bought","are buying","buy"],a:1,e:"Cantidad concreta y terminada → perfect simple, no continuous."},
    {q:"How long ___ for that promotion?",o:["do you wait","have you waited","have you been waiting","are you waiting"],a:2,e:"<i>How long</i> + actividad que sigue en curso → perfect continuous."},
    {q:"I ___ her for over twenty years; she’s my oldest friend.",o:["have been knowing","know","am knowing","have known"],a:3,e:"<i>know</i> es de estado: nunca <i>have been knowing</i>."},
    {q:"Why are your hands so dirty? ___ in the garden?",o:["Have you been working","Did you work","Have you worked","Do you work"],a:0,e:"Explica un estado visible (manos sucias) mediante una actividad continua reciente → perfect continuous."},
    {q:"We ___ four candidates so far for this position.",o:["have been interviewing","have interviewed","interview","are interviewing"],a:1,e:"<i>so far</i> + cantidad contable y terminada → perfect simple."}
  ],
  g4: [
    {q:"Don’t worry about the printer, I ___ fix it.",o:["am going to","am","will","would"],a:2,e:"Ofrecimiento espontáneo, decisión en el momento de hablar → <i>will</i>."},
    {q:"We ___ our new office in October — it’s all signed and confirmed.",o:["will move to","will have moved to","move to","are moving to"],a:3,e:"Cita fijada con fecha concreta ya organizada → present continuous. El futuro perfecto exigiría <i>by October</i>, no <i>in October</i>."},
    {q:"I promise I ___ you as soon as I land.",o:["will call","call","am calling","will have called"],a:0,e:"Promesa espontánea al hablar → <i>will</i>."},
    {q:"Look at his face — he ___ us terrible news.",o:["will give","is going to give","gives","is giving"],a:1,e:"Predicción con evidencia visible (su cara) → <i>going to</i>."},
    {q:"By the time you arrive, I ___ dinner already.",o:["will cook","am cooking","will have cooked","cook"],a:2,e:"<i>By the time</i> + acción terminada antes de un momento futuro → future perfect."},
    {q:"I’ll text you when I ___ at the airport.",o:["will arrive","am arriving","would arrive","arrive"],a:3,e:"Tras <i>when</i> nunca <i>will</i>: se usa presente simple con valor futuro."}
  ],
  g5: [
    {q:"If it ___ tomorrow, we’ll cancel the picnic.",o:["rains","will rain","rained","would rain"],a:0,e:"Primer condicional: <i>if</i> + presente / <i>will</i>."},
    {q:"If you mixed oil and water, they ___.",o:["won’t blend","wouldn’t blend","don’t blend","hadn’t blended"],a:1,e:"Hecho hipotético planteado como segundo condicional → <i>would</i>."},
    {q:"If she ___ harder, she would have passed the exam.",o:["studied","would study","had studied","studies"],a:2,e:"Tercer condicional: consecuencia con <i>would have</i> pide <i>if</i> + past perfect."},
    {q:"If I ___ more time, I’d help you with the move.",o:["have","will have","would have","had"],a:3,e:"Segundo condicional: situación irreal en el presente → <i>if</i> + pasado."},
    {q:"If you don’t back up your files, you ___ them if the disk fails.",o:["will lose","would lose","lose","lost"],a:0,e:"Condición real con consecuencia futura → primer condicional."},
    {q:"If we hadn’t relocated the server, the outage ___ so long.",o:["won’t last","wouldn’t have lasted","didn’t last","wouldn’t last"],a:1,e:"Condición pasada irreal con consecuencia también pasada → tercer condicional con <i>would have</i>."}
  ],
  g6: [
    {q:"I wish I ___ more languages when I was younger.",o:["learned","would learn","had learned","learn"],a:2,e:"Arrepentimiento sobre el pasado → <i>wish</i> + past perfect."},
    {q:"I wish you ___ interrupting me during meetings.",o:["stop","stopped","had stopped","would stop"],a:3,e:"Molestia por la conducta de otra persona → <i>wish</i> + would."},
    {q:"If only I ___ a car; the buses here are unreliable.",o:["had","have had","would have","had had"],a:0,e:"Deseo sobre el presente → <i>if only</i> + past simple."},
    {q:"I’d rather we ___ this decision until Monday.",o:["leave","left","had left","would leave"],a:1,e:"<i>would rather</i> + sujeto + pasado, con valor presente o futuro."},
    {q:"It’s about time you ___ your resignation letter.",o:["write","are writing","wrote","have written"],a:2,e:"<i>it’s (about/high) time</i> + pasado simple, valor presente."},
    {q:"I wish I ___ that email before hitting send.",o:["reread","would have reread","was rereading","had reread"],a:3,e:"Arrepentimiento por algo del pasado → <i>wish</i> + past perfect."}
  ],
  g7: [
    {q:"The car won’t start. It ___ out of battery.",o:["must be","must have been","can be","should be"],a:0,e:"Deducción presente con alta certeza a partir de la evidencia → <i>must be</i>."},
    {q:"He’s very pale. He ___ some bad news.",o:["can have heard","must have heard","must hear","should have heard"],a:1,e:"Deducción sobre algo pasado con alta certeza → <i>must have</i> + participio."},
    {q:"I’m not sure, but they ___ already left for the airport.",o:["must have","can’t have","might have","couldn’t have"],a:2,e:"Posibilidad, no certeza → <i>might have</i> + participio."},
    {q:"That ___ be her office — hers is on the third floor.",o:["mustn’t","shouldn’t","couldn’t have","can’t"],a:3,e:"Deducción negativa sobre el presente con seguridad → <i>can’t be</i>."},
    {q:"He ___ finished the marathon in two hours — he’s never even run five kilometres.",o:["can’t have","mustn’t have","might have","should have"],a:0,e:"Imposibilidad lógica sobre el pasado → <i>can’t have</i> + participio, nunca <i>mustn’t have</i>."},
    {q:"There’s a light on upstairs. Someone ___ home.",o:["can be","must be","might been","must have"],a:1,e:"Deducción presente con evidencia clara → <i>must be</i>."}
  ],
  g8: [
    {q:"You ___ smoke inside the building; it’s strictly forbidden.",o:["don’t have to","needn’t","mustn’t","shouldn’t have to"],a:2,e:"Prohibición explícita → <i>mustn’t</i>."},
    {q:"You ___ pay for parking on Sundays; it’s free.",o:["mustn’t","can’t","shouldn’t","don’t have to"],a:3,e:"No es necesario, pero no está prohibido → <i>don’t have to</i>."},
    {q:"When I was a student, we ___ wear a uniform.",o:["had to","must","have to","must have"],a:0,e:"<i>must</i> no existe en pasado: se sustituye por <i>had to</i>."},
    {q:"You ___ tell him now — it can wait until tomorrow.",o:["mustn’t","don’t have to","can’t","needn’t have"],a:1,e:"No hay urgencia, es opcional posponerlo → <i>don’t have to</i>."},
    {q:"You ___ read the contract carefully before you sign it.",o:["would better","have better","had better","are better"],a:2,e:"Consejo con advertencia implícita de una consecuencia negativa → <i>had better</i> + infinitivo sin <i>to</i>."},
    {q:"You ___ worry about the deadline; we already got an extension.",o:["mustn’t","don’t need worry","can’t","needn’t"],a:3,e:"No es necesario preocuparse → <i>needn’t</i>, sinónimo formal de <i>don’t have to</i>. Ojo: <i>need</i> como verbo normal exige <i>to</i> (<i>don’t need to worry</i>)."}
  ],
  g9: [
    {q:"The invoices ___ every Friday by the finance team.",o:["are sent","are send","send","is sent"],a:0,e:"Presente simple pasivo: <i>are</i> + participio, con sujeto plural."},
    {q:"This building ___ in the 1920s.",o:["built","was built","has built","was building"],a:1,e:"Hecho histórico terminado → pasado simple pasivo."},
    {q:"I ___ a company laptop on my first day.",o:["gave","was giving","was given","have given"],a:2,e:"El objeto indirecto puede ser sujeto pasivo: <i>I was given</i> = «me dieron»."},
    {q:"The results ___ by Friday at the latest.",o:["will publish","will be publishing","are published","will have been published"],a:3,e:"Futuro perfecto pasivo: <i>will have been</i> + participio."},
    {q:"He ___ to be one of the best engineers in the team.",o:["is considered","considers","is considering","has considered"],a:0,e:"Pasiva impersonal con infinitivo: opinión generalizada expresada sin nombrar al agente."},
    {q:"The office ___ renovated at the moment; mind the noise.",o:["is","is being","has been","was being"],a:1,e:"Presente continuo pasivo: <i>is being</i> + participio, acción en curso ahora."}
  ],
  g10: [
    {q:"\"I can fix it myself.\" → He said he ___ fix it himself.",o:["can","will","could","would"],a:2,e:"<i>can → could</i> en el backshift del estilo indirecto."},
    {q:"She warned us ___ late for the interview.",o:["to not be","don’t be","that not be","not to be"],a:3,e:"<i>warn someone (not) to</i> + infinitivo."},
    {q:"He admitted ___ the mistake.",o:["making","to make","make","that make"],a:0,e:"<i>admit + -ing</i>, nunca <i>admit to make</i>."},
    {q:"They promised ___ the invoice before Friday.",o:["sending","to send","send","that send"],a:1,e:"<i>promise + to</i> + infinitivo."},
    {q:"\"Where do you live now?\" → He asked her where she ___.",o:["lives","does live","lived","was living"],a:2,e:"Pregunta indirecta: sin inversión y con backshift <i>lives → lived</i>."},
    {q:"He refused ___ the terms of the contract.",o:["discussing","that discuss","to discussing","to discuss"],a:3,e:"<i>refuse + to</i> + infinitivo, nunca gerundio."}
  ],
  g11: [
    {q:"We ___ the contract translated by a professional agency.",o:["had","made","let","did"],a:0,e:"Causativo: <i>have something done</i>, alguien lo hace por nosotros."},
    {q:"I need to ___ my visa renewed before the trip.",o:["make","get","let","do"],a:1,e:"<i>get something done</i>, versión informal del causativo. <i>Do</i> y <i>make</i> nunca construyen esta estructura."},
    {q:"Her parents let her ___ abroad for a semester.",o:["to study","studying","study","studied"],a:2,e:"<i>let someone</i> + infinitivo sin <i>to</i>: permiso."},
    {q:"He got the technician ___ the server before the audit.",o:["check","checking","checked","to check"],a:3,e:"<i>get someone to do</i> lleva <i>to</i>, a diferencia de <i>have someone do</i>."},
    {q:"They ___ the windows cleaned before the open house.",o:["had","made","did","got to"],a:0,e:"Causativo pasivo: <i>have something done</i> con participio."},
    {q:"The teacher made the students ___ their essays.",o:["to rewrite","rewrite","rewriting","rewritten"],a:1,e:"<i>make someone</i> + infinitivo sin <i>to</i>, obligación."}
  ],
  g12: [
    {q:"He tried ___ the settings, but nothing changed.",o:["to change","change","changing","changed"],a:2,e:"<i>try + -ing</i> = probar una acción para ver si funciona; distinto de <i>try to</i> = esforzarse."},
    {q:"I regret ___ you that the project was cancelled.",o:["informing","inform","having informed","to inform"],a:3,e:"<i>regret to</i> + infinitivo anuncia algo desagradable en el momento de decirlo."},
    {q:"She’s looking forward to ___ the new office.",o:["seeing","see","having seen","to see"],a:0,e:"<i>look forward to</i> lleva preposición <i>to</i> → gerundio."},
    {q:"We can’t help ___ how disorganised this launch was.",o:["to notice","noticing","notice","noticed"],a:1,e:"<i>can’t help + -ing</i> = no poder evitar."},
    {q:"He offered ___ us with the migration over the weekend.",o:["helping","help","to help","having helped"],a:2,e:"<i>offer</i> siempre con infinitivo."},
    {q:"I’ll never forget ___ my first paycheck — what a feeling.",o:["to receive","receive","having receive","receiving"],a:3,e:"<i>forget + -ing</i> = recordar algo que ya ocurrió; distinto de <i>forget to</i> = olvidarse de hacer algo."}
  ],
  g13: [
    {q:"The client ___ complained yesterday cancelled the contract today.",o:["who","which","whose","whom"],a:0,e:"Especificativa con persona como sujeto → <i>who / that</i>."},
    {q:"Our CTO, ___ has worked here for fifteen years, is retiring.",o:["that","who","which","whose"],a:1,e:"Explicativa (con comas) con persona → <i>who</i>, nunca <i>that</i>."},
    {q:"This is the app ___ we downloaded for the trip.",o:["who","what","that","whose"],a:2,e:"Objeto en una especificativa → <i>that / which</i>, o se puede omitir."},
    {q:"That’s the agency ___ report went viral last week.",o:["that","which","who","whose"],a:3,e:"Posesión, incluso con organizaciones → <i>whose</i>."},
    {q:"The flight was delayed for six hours, ___ ruined our connection.",o:["which","what","who","that"],a:0,e:"<i>which</i> se refiere a toda la oración anterior, no solo a una palabra."},
    {q:"The person ___ desk is next to mine just got promoted.",o:["who’s","whose","who","which"],a:1,e:"Posesión con persona → <i>whose</i>, no confundir con <i>who’s</i> (who is)."}
  ],
  g14: [
    {q:"Could you give me some ___ about how to fix this?",o:["a feedback","feedbacks","feedback","the feedback"],a:2,e:"<i>feedback</i> es incontable: sin artículo ni plural."},
    {q:"We need ___ new furniture for the meeting room.",o:["a","an","many","some"],a:3,e:"<i>furniture</i> es incontable: no existe <i>a furniture</i>; se usa <i>some / much</i>."},
    {q:"___ moon was full last night.",o:["The","A","An","—"],a:0,e:"Objeto único conocido por todos → <i>the</i>."},
    {q:"There are very ___ vacancies for that role right now.",o:["little","few","much","a little"],a:1,e:"<i>vacancies</i> es contable en plural → <i>few</i>, no <i>little</i>."},
    {q:"He gave the team some really useful ___ before the interview.",o:["advices","an advice","tips","informations"],a:2,e:"<i>advice</i> no tiene plural; para contarlo se usa <i>tips</i> o <i>pieces of advice</i>."},
    {q:"___ equipment in that lab is outdated.",o:["A","Many","An","The"],a:3,e:"<i>equipment</i> es incontable, pero aquí está identificado (ese laboratorio concreto) → <i>the</i>. Con un incontable, nunca <i>a/an</i> ni <i>many</i>."}
  ],
  g15: [
    {q:"The final result will ___ on how well we plan this stage.",o:["depend","consist","result","insist"],a:0,e:"<i>depend on</i>, colocación fija."},
    {q:"This product ___ of three separate modules.",o:["contains","consists","includes","composes"],a:1,e:"<i>consist of</i>, nunca <i>consist in</i>."},
    {q:"He apologised ___ arriving late to the meeting.",o:["of","about","for","to"],a:2,e:"<i>apologise for</i> + gerundio."},
    {q:"He’s really keen ___ trying new frameworks at work.",o:["in","for","about","on"],a:3,e:"<i>keen on</i>, interés o entusiasmo por algo."},
    {q:"We finally arrived ___ Madrid after a ten-hour flight.",o:["in","at","to","on"],a:0,e:"<i>arrive in</i> se usa con ciudades y países; <i>arrive at</i> con lugares concretos, y nunca <i>arrive to</i>."},
    {q:"This approach is quite ___ from what we used last year.",o:["differently","different","distinction","difference"],a:1,e:"<i>different from</i> es la combinación estándar (también <i>than</i> en inglés americano). Tras <i>is</i> hace falta un adjetivo, no un adverbio ni un sustantivo."}
  ],
  g16: [
    {q:"___ the fact that he had no experience, they hired him.",o:["Although","Even though","Despite","However"],a:2,e:"<i>despite the fact that</i> + oración es la excepción fija a la regla de <i>despite</i> + sustantivo."},
    {q:"The flight was delayed for hours; ___, we still made the connection.",o:["therefore","whereas","despite","nevertheless"],a:3,e:"Conector de contraste entre oraciones, seguido de coma → <i>nevertheless</i>."},
    {q:"___ he had studied hard, he failed the exam.",o:["Although","Despite","In spite of","Whereas"],a:0,e:"Seguido de sujeto + verbo → <i>although</i>, no <i>despite</i>."},
    {q:"Costs increased sharply; ___, the company decided to cut the budget.",o:["whereas","consequently","although","despite"],a:1,e:"Relación de causa-consecuencia → <i>consequently</i>."},
    {q:"He speaks three languages, ___ his brother only speaks English.",o:["therefore","however","whereas","despite"],a:2,e:"Contraste directo entre dos hechos paralelos → <i>whereas</i>."},
    {q:"___ the heavy rain, the match went ahead as planned.",o:["Although","Even though","However","In spite of"],a:3,e:"Seguido de sustantivo → <i>in spite of</i>, equivalente a <i>despite</i>."}
  ],
  g17: [
    {q:"Rarely ___ such a competitive market.",o:["have we seen","we have seen","did we see","we saw"],a:0,e:"Adverbio restrictivo <i>rarely</i> al inicio → inversión sujeto-auxiliar."},
    {q:"___ did she realise the contract had already expired.",o:["Later only","Only later","Only she later","She only later"],a:1,e:"<i>Only later</i> al inicio también dispara la inversión: <i>did she realise</i>."},
    {q:"___ I want is a straight answer.",o:["That","Which","All","It"],a:2,e:"Cleft sentence enfática: <i>All I want is…</i> = «Lo único que quiero es…». El calco <i>That I want…</i> no existe en inglés."},
    {q:"Little ___ that the merger would fall through.",o:["they knew","knew they","they did know","did they know"],a:3,e:"<i>Little</i> al inicio con valor negativo → inversión: <i>did they know</i>."},
    {q:"Not until the review process ended ___ the errors.",o:["did we find","we found","we did find","found we"],a:0,e:"<i>Not until</i> al inicio → inversión con el auxiliar."},
    {q:"It was the finance team ___ raised the alarm first.",o:["that they","who","which they","whom"],a:1,e:"Cleft sentence con <i>It was… who/that…</i> para enfatizar el sujeto."}
  ],
  g18: [
    {q:"She ___ to the team.",o:["explained clearly the situation","the situation clearly explained","explained the situation clearly","explained the situation clear"],a:2,e:"El adverbio de manera no se coloca entre el verbo y su objeto directo: <i>explained the situation clearly</i>. Y modifica al verbo, así que va en <i>-ly</i>, no en forma de adjetivo."},
    {q:"He ___ arrives late to meetings.",o:["rarely doesn’t","doesn’t rarely","not rarely","rarely"],a:3,e:"Adverbio de frecuencia antes del verbo principal; un único elemento negativo por oración."},
    {q:"They travelled ___.",o:["to Japan last summer","last summer to Japan","last summer for Japan","for Japan last summer"],a:0,e:"Orden estándar: lugar antes que tiempo → <i>to Japan last summer</i>."},
    {q:"She ___ on time for work.",o:["always is","is always","is always being","always be"],a:1,e:"Con el verbo <i>be</i>, el adverbio de frecuencia va después de él: <i>is always</i>. <i>Is always being</i> describiría una conducta pasajera, no una costumbre."},
    {q:"They bought ___ for the dining room.",o:["a wooden small round table","a small round wooden table","a round small wooden table","a wooden round small table"],a:2,e:"Orden: tamaño → forma → material: <i>small round wooden</i>."},
    {q:"He handed ___.",o:["quietly the documents to his colleague","the documents quietly to his colleague","to his colleague the documents quietly","the documents to his colleague quietly"],a:3,e:"Objeto pegado al verbo, manera al final: <i>the documents to his colleague quietly</i>."}
  ]
};
