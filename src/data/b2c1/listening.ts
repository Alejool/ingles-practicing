import type { ListeningTrack } from "../types";

/**
 * Audios de B2 → C1, tramo 1.
 * Como en C1 Advanced, casi ninguna respuesta está dicha de forma literal: hay
 * que deducir la actitud o el propósito del hablante. Las opciones incorrectas
 * recogen cosas que se mencionan de verdad en el audio. El formato es de
 * práctica (5 preguntas de 3 opciones), no el del examen real, cuya Part 3
 * tiene 6 preguntas de 4 opciones. Los números van
 * escritos con letra para que la voz del navegador los lea sin ambigüedad.
 */
export const LISTENING: ListeningTrack[] = [
{
  id: "a1", title: "What mountains teach about risk", kind: "Entrevista larga · actitud y opinión (práctica: 5 preguntas de 3 opciones)",
  context: "Un programa de radio entrevista a Tom Reyes, que fue guía de montaña quince años y ahora asesora a empresas sobre riesgos.",
  speakers: { A: "Presentadora", B: "Tom Reyes" },
  lines: [
    { s: "A", t: "My guest today spent fifteen years as a mountain guide before moving into a rather different line of work: advising companies on risk. Tom Reyes, welcome. Is that as strange a leap as it sounds?" },
    { s: "B", t: "People assume it must be, and I usually let them, because it makes for a better story. In truth, the two jobs are closer than you'd think. In both, you're paid to make decisions without enough information. And in both, the client would much rather you didn't remind them of that." },
    { s: "A", t: "What did guiding teach you about danger that an office never could?" },
    { s: "B", t: "That the dangerous moment is almost never the one that feels dangerous. On a difficult ridge, everyone concentrates. It's on the walk down, when the summit is behind you and people have started talking about dinner, that someone puts a foot wrong. I've seen far more injuries on easy ground than on hard." },
    { s: "A", t: "So fear is useful." },
    { s: "B", t: "Up to a point. Fear gets your attention. It doesn't tell you what to do with it. I've climbed with people who were terrified of a big drop beneath their feet, and perfectly relaxed about the weather, which was the thing far more likely to kill them." },
    { s: "A", t: "You've written that the hardest decision is the decision to turn back. Why should that be so hard?" },
    { s: "B", t: "Because by then you've invested so much. The early start, the money, months of training. And then there's the group. Nobody wants to be the one who says it aloud. I used to think my job was to get people to the top. It took me years, and one very bad afternoon that I'd rather not go into, to understand that my job was to get them back to the car park." },
    { s: "A", t: "And do companies behave like climbing parties?" },
    { s: "B", t: "Uncannily so. I sit in meetings where a project is obviously in trouble. Everyone in the room knows it, and yet the whole discussion is about how to push on. Not because they're foolish. Because stopping would mean admitting that the last two years were wasted, and nobody builds a career on that." },
    { s: "A", t: "So what do you tell them?" },
    { s: "B", t: "At first I don't tell them anything. I ask what would have to be true for them to stop. If they can't answer, we have a problem. On a mountain you agree a turnaround time before you set off, while you're still warm and rational. If you haven't reached a certain point by one o'clock, you go down, however good you feel. I try to get a board of directors to do the equivalent." },
    { s: "A", t: "And do they thank you for it?" },
    { s: "B", t: "Occasionally. More often they thank me for something else entirely, and quietly adopt the idea as their own. Which suits me fine." },
    { s: "A", t: "Do you miss the mountains?" },
    { s: "B", t: "I still go, though not for work. I'd be lying if I said I didn't miss being that fit. What I don't miss is being responsible for strangers who had decided in advance that the day was going to be perfect." },
  ],
  qs: [
    { q: "What does Tom imply about the idea that his career change was a strange one?", o: ["He finds the assumption irritating.", "He is happy not to correct it.", "He agrees that the two jobs have little in common."], a: 1, e: "«People assume it must be, and <b>I usually let them</b>, because it makes for a better story». No lo desmiente porque le conviene; después aclara que los dos trabajos se parecen mucho, lo que descarta la C." },
    { q: "According to Tom, when are accidents most likely to happen in the mountains?", o: ["when the climbing is at its most difficult", "when the group is frightened", "when people believe the hard part is over"], a: 2, e: "«It's on the walk down, when the summit is behind you and people have started talking about dinner». En el tramo difícil, dice, todo el mundo se concentra." },
    { q: "Why does Tom mention the climbers who feared a big drop but not the weather?", o: ["to show that fear is a poor guide to where the real danger lies", "to argue that guides should hide their own fear", "to explain why he gave up guiding"], a: 0, e: "Pregunta de propósito. El ejemplo ilustra la frase anterior: el miedo «gets your attention» pero no dice qué hacer con ella. Temían lo espectacular y no lo que de verdad podía matarlos." },
    { q: "What does Tom suggest about the 'very bad afternoon'?", o: ["It was the reason he changed career.", "It changed the way he understood his job.", "It was the result of a client's mistake."], a: 1, e: "Hizo falta esa tarde «to understand that my job was to get them back to the car park». No dice que por eso dejara de guiar ni de quién fue la culpa: de hecho prefiere no entrar en detalles." },
    { q: "How does Tom feel when a company presents his idea as its own?", o: ["He is untroubled by it.", "He resents it.", "He insists on being given the credit."], a: 0, e: "«Which suits me fine»: le parece bien. El tono es irónico, pero no hay resentimiento." },
  ],
},
{
  id: "a2", title: "How a word earns its place", kind: "Monólogo informativo · actitud y propósito",
  context: "Una lexicógrafa explica en una charla pública cómo llega una palabra nueva al diccionario.",
  speakers: { A: "Lexicógrafa" },
  lines: [
    { s: "A", t: "Thank you. I've been asked to explain how a word gets into a dictionary, and I should begin by disappointing you. There is no committee that meets to vote. And nobody, least of all me, decides whether a word deserves to exist." },
    { s: "A", t: "What we do is closer to natural history than to law. We watch. A new word turns up, in a magazine, say, or in the transcript of a broadcast, and we make a note of it. Then we wait, sometimes for years." },
    { s: "A", t: "What we're waiting for is evidence of three things. First, that the word is being used by many different people, not just by its inventor. Second, that it has survived beyond the event that produced it. And third, that writers have stopped explaining it. That last test is my favourite. The day a newspaper prints a word with no inverted commas and no little definition after it, that word has arrived." },
    { s: "A", t: "People write to us a great deal, and the letters fall into two piles. In the first pile are people who have invented a word and would like us to include it. I'm afraid the answer is always the same. Use it, persuade others to use it, and we will find it. In the second pile are people who are furious that we have included something they consider ugly, or simply wrong." },
    { s: "A", t: "I have more sympathy with that second group than you might expect. They care about the language, and so do I. But they have misunderstood what a dictionary is for. To record a word is not to recommend it, any more than a map recommends a swamp by showing you where it is." },
    { s: "A", t: "The complaint I find hardest to answer is a different one: that we are too slow. And it's true that by the time a piece of slang reaches us, the teenagers who coined it have often abandoned it. But I would rather be late than wrong. A dictionary that chased every fashion would be out of date before it was printed." },
    { s: "A", t: "What has changed in my working life is the sheer quantity of evidence. When I started, we relied on volunteers who posted us quotations on slips of paper. Now we can search an enormous body of text in a moment. You might suppose that makes the job easier. In one sense it does. In another, it has simply replaced the problem of finding examples with the problem of knowing which ones matter." },
    { s: "A", t: "So if you take one thing away this evening, let it be this. The dictionary does not tell you what the language ought to be. It tells you, as carefully as we can manage, what the rest of you have already done to it." },
  ],
  qs: [
    { q: "How does the speaker see the role of a lexicographer?", o: ["as a judge of which words are acceptable", "as a member of a committee that selects words", "as an observer of how words are actually used"], a: 2, e: "«closer to natural history than to law. We watch». Niega expresamente las otras dos: no hay comité y nadie decide si una palabra merece existir." },
    { q: "Which sign that a word is established does the speaker like best?", o: ["It appears in print without any explanation.", "It is used in public by the person who invented it.", "It outlives the event that gave rise to it."], a: 0, e: "«writers have stopped explaining it. That last test is my favourite». La C también es uno de los tres criterios, pero no su preferido." },
    { q: "What is the speaker's attitude to people who complain that 'ugly' words have been included?", o: ["She thinks they know little about language.", "She shares their concern but not their conclusion.", "She believes they will be proved right in the end."], a: 1, e: "«I have more sympathy… than you might expect. They care about the language, and so do I. <b>But</b> they have misunderstood what a dictionary is for»: comprensión y desacuerdo a la vez." },
    { q: "Why does the speaker mention a map and a swamp?", o: ["to suggest that some new words are harmful", "to explain how the entries in a dictionary are arranged", "to show that including a word does not mean approving of it"], a: 2, e: "La comparación explica la frase anterior: «To record a word is not to recommend it». El mapa señala el pantano; no invita a entrar." },
    { q: "What does the speaker say about having far more evidence than before?", o: ["It has changed the difficulty rather than removed it.", "It has made lexicographers less careful.", "It has made volunteers unnecessary."], a: 0, e: "«it has simply replaced the problem of finding examples with the problem of knowing which ones matter». Menciona a los voluntarios, pero no dice que ya no hagan falta." },
  ],
},
];
