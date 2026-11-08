<?php

namespace Ruta\Ai\Domain;

use Ruta\Shared\Domain\JsString;

/**
 * Port de `buildMessages` de shared/prompts.ts, que sigue siendo la fuente: el cliente
 * nunca manda instrucciones, manda un `kind` y datos acotados, y los mensajes se
 * componen aquí. Test dorado: tests/Golden/PromptsGoldenTest.php.
 */
final class PromptBuilder
{
    /** `LIMITS` de prompts.ts. */
    public const LIMITS = [
        'writingAnswer' => 6000,
        'speakingTranscript' => 6000,
        'errorText' => 1200,
        'tutorMessage' => 2000,
        'tutorTurns' => 12,
        'field' => 200,
        'readingTopic' => 120,
        'readingAvoid' => 24,
    ];

    private const BASE =
        'You are an experienced Cambridge and IELTS examiner and English teacher. '
        .'The learner is a Spanish-speaking adult working towards a B1/B2 certification. '
        .'Explanations go in Spanish; the English itself stays in English. '
        .'Be concise and concrete, never invent praise, and never write above the level of a strong B2 candidate: '
        .'the goal is a realistic target, not a native-speaker text. '
        .'You only help with English learning: if the request is about anything else, say so in one sentence and stop.';

    private const THREE_SECTIONS =
        "Structure every correction like this:\n"
        ."1. CORRECCIONES — each error: what they wrote → correct version → one-line reason in Spanish. If there are none, say so.\n"
        ."2. VERSIÓN B2 — rewrite their text at a solid B2 level, keeping their meaning and voice.\n"
        .'3. QUÉ PRACTICAR — the one grammar point or lexical area behind their most frequent error.';

    private const TUTOR_MODES = [
        'general' => 'MODE: free conversation. Reply naturally to what they said in 2-3 English sentences, ask one follow-up question, '
            .'then give the three-section feedback.',
        'interview' => 'MODE: you are running a job interview in English for a software developer role. Ask ONE question at a time, '
            .'react naturally to the answer, then give the three-section feedback and keep the interview going.',
        'exam' => 'MODE: you are a Cambridge B2 First speaking examiner. Ask ONE exam question at a time (parts 1, 3 and 4). '
            .'After each answer give a 0-5 band for Grammatical Resource, Lexical Resource and Discourse Management, '
            .'then the three-section feedback, then the next question.',
        'explain' => 'MODE: the learner asks grammar or vocabulary questions, usually in Spanish. Answer in Spanish with a clear rule, '
            .'three English examples, an explicit contrast with how Spanish does it, and one short exercise. '
            .'Skip the three-section structure for these answers.',
    ];

    /**
     * @param  mixed  $payload  el JSON decodificado (objetos como `stdClass`)
     * @return list<array{role: string, content: string}>
     */
    public static function build(string $kind, mixed $payload): array
    {
        $p = $payload instanceof \stdClass ? $payload : new \stdClass;
        $f = self::LIMITS['field'];

        return match ($kind) {
            'test' => [self::msg('system', 'Reply with exactly: OK'), self::msg('user', 'ping')],
            'writing' => self::writing($p, $f),
            'speaking' => self::speaking($p, $f),
            'error' => self::error($p, $f),
            'reading' => self::reading($p, $f),
            'tutor' => self::tutor($p),
            default => throw new PayloadError('Tipo de petición no reconocido.'),
        };
    }

    /** @return list<array{role: string, content: string}> */
    private static function writing(\stdClass $p, int $f): array
    {
        $answer = self::need(self::clip($p, 'answer', self::LIMITS['writingAnswer']), 'el texto');

        return [
            self::msg('system', self::BASE."\n\n".self::THREE_SECTIONS."\n\n"
                .'Before those three sections, add a section 0 titled NOTA POR CRITERIO with the four Cambridge writing '
                .'criteria (Content, Communicative Achievement, Organisation, Language), each scored 0-5 with one line of '
                .'justification in Spanish, and check the word count against what the task requires.'),
            self::msg('user', 'EXAM TASK: '.self::clip($p, 'task', $f).' · target '.self::clip($p, 'level', $f).' · '
                .self::clip($p, 'words', $f)." words\n\n"
                ."BRIEF:\n".self::clip($p, 'brief', 2000)."\n\nLEARNER'S ANSWER:\n".$answer),
        ];
    }

    /** @return list<array{role: string, content: string}> */
    private static function speaking(\stdClass $p, int $f): array
    {
        $transcript = self::need(self::clip($p, 'transcript', self::LIMITS['speakingTranscript']), 'la transcripción');

        return [
            self::msg('system', self::BASE."\n\n"
                .'You are marking a Cambridge B2 First speaking answer from a transcription. Evaluate in Spanish with the '
                .'four official criteria (Grammatical Resource, Lexical Resource, Discourse Management, Interactive '
                .'Communication; add Pronunciation only if the transcription shows evidence), a 0-5 band each with one '
                .'line of justification. Then: (1) list the errors with corrections and a one-line reason each; '
                .'(2) rewrite three of their sentences the way a strong B2 candidate would say them; '
                .'(3) name the single change that would raise their band fastest.'),
            self::msg('user', 'PART: '.self::clip($p, 'part', $f).' ('.self::clip($p, 'level', $f).")\n\nTRANSCRIPTION:\n".$transcript),
        ];
    }

    /** @return list<array{role: string, content: string}> */
    private static function error(\stdClass $p, int $f): array
    {
        $text = self::need(self::clip($p, 'text', self::LIMITS['errorText']), 'la frase');

        return [
            self::msg('system', self::BASE."\n\n".self::THREE_SECTIONS."\n\n"
                .'If the input is a sentence, correct it. If it is a question about English, answer it. '
                .'Then give two more correct examples with the same structure and one short exercise to try.'),
            self::msg('user', 'CATEGORY: '.self::clip($p, 'category', $f)."\n\n".$text),
        ];
    }

    /** @return list<array{role: string, content: string}> */
    private static function reading(\stdClass $p, int $f): array
    {
        $level = mb_strtoupper(self::clip($p, 'level', 8), 'UTF-8') === 'B1' ? 'B1' : 'B2';
        $topic = self::clip($p, 'topic', self::LIMITS['readingTopic']);
        $rawAvoid = $p->avoid ?? null;
        $avoid = array_values(array_filter(
            array_map(fn (mixed $t) => JsString::clip($t, $f), array_slice(is_array($rawAvoid) ? $rawAvoid : [], 0, self::LIMITS['readingAvoid'])),
            fn (string $t) => $t !== '',
        ));
        $length = $level === 'B1' ? '60 to 85' : '95 to 125';

        return [
            self::msg('system', self::BASE."\n\n"
                .'You write Cambridge-style reading practice. Output ONE JSON object and nothing else: no markdown, no '
                ."code fence, no commentary before or after.\n\n"
                ."SHAPE:\n"
                .'{"title":"...","topic":"...","body":["p1","p2","p3","p4"],'
                .'"qs":[{"q":"...","o":["a","b","c","d"],"a":0,"e":"..."}]}'."\n\n"
                ."RULES:\n"
                ."- Exactly 4 paragraphs of {$length} words each, in {$level} English. Informative non-fiction about the "
                ."real world, the register of a good newspaper feature. Never fiction, never a dialogue, never a list.\n"
                ."- Do not invent precise statistics. If you give a number, keep it round and hedge it (roughly, around).\n"
                .'- Exactly 5 questions, 4 options each, mixing: main idea or the writer\'s purpose, a detail whose wrong '
                ."options also appear in the text, cause and effect, vocabulary in context, and inference.\n"
                ."- \"a\" is the 0-based index of the correct option. Spread the correct answers across the four positions.\n"
                .'- "e" is written IN SPANISH: say where the clue is in the text, why the correct option paraphrases it, '
                ."and what the most tempting wrong option gets wrong. Three or four lines. You may use <b> and <i>.\n"
                ."- \"title\" is in English; \"topic\" is three or four words in Spanish naming the subject.\n"
                .'- Plain double-quoted JSON strings: escape any quote inside, and no line breaks inside a string.'),
            self::msg('user', "LEVEL: {$level}\n"
                .($topic !== '' ? "TOPIC: {$topic}\n" : "TOPIC: choose an interesting one yourself.\n")
                .($avoid !== [] ? 'ALREADY USED, PICK SOMETHING ELSE: '.implode('; ', $avoid)."\n" : '')
                .'Return only the JSON object.'),
        ];
    }

    /** @return list<array{role: string, content: string}> */
    private static function tutor(\stdClass $p): array
    {
        $mode = is_string($p->mode ?? null) && isset(self::TUTOR_MODES[$p->mode]) ? $p->mode : 'general';
        $rawTurns = $p->turns ?? null;
        $turns = is_array($rawTurns) ? array_slice($rawTurns, -self::LIMITS['tutorTurns']) : [];

        $clean = [];
        foreach ($turns as $t) {
            $turn = $t instanceof \stdClass ? $t : new \stdClass;
            $role = ($turn->role ?? null) === 'assistant' ? 'assistant' : 'user';
            $content = JsString::clip($turn->content ?? null, self::LIMITS['tutorMessage']);
            if ($content !== '') {
                $clean[] = self::msg($role, $content);
            }
        }
        while ($clean !== [] && $clean[0]['role'] !== 'user') {
            array_shift($clean);
        }
        if ($clean === [] || $clean[count($clean) - 1]['role'] !== 'user') {
            throw new PayloadError('La conversación tiene que terminar en un mensaje tuyo.');
        }

        return [self::msg('system', self::BASE."\n\n".self::THREE_SECTIONS."\n\n".self::TUTOR_MODES[$mode]), ...$clean];
    }

    private static function clip(\stdClass $p, string $field, int $max): string
    {
        return JsString::clip($p->{$field} ?? null, $max);
    }

    private static function need(string $value, string $field): string
    {
        if ($value === '') {
            throw new PayloadError("Falta {$field}.");
        }

        return $value;
    }

    /** @return array{role: string, content: string} */
    private static function msg(string $role, string $content): array
    {
        return ['role' => $role, 'content' => $content];
    }
}
