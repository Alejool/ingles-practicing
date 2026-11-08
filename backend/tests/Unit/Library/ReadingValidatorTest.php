<?php

namespace Tests\Unit\Library;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Library\Domain\ReadingValidator;
use Ruta\Shared\Domain\DomainError;

/** `validar` de readings.mts (casos de tests/readings-validar.test.mts). */
final class ReadingValidatorTest extends TestCase
{
    /** Una lectura como la decodifica la API (objetos como stdClass). */
    private static function reading(string $changesJson = '{}'): \stdClass
    {
        $base = json_decode('{"title":"Remote work","body":["First paragraph of the text.","Second paragraph of the text."],'
            .'"qs":[{"q":"Question 0","o":["a","b","c","d"],"a":0,"e":"Porque <i>sí</i>."},'
            .'{"q":"Question 1","o":["a","b","c","d"],"a":1,"e":"Porque <i>sí</i>."},'
            .'{"q":"Question 2","o":["a","b","c","d"],"a":2,"e":"Porque <i>sí</i>."}]}');
        foreach ((array) json_decode($changesJson) as $k => $v) {
            $base->{$k} = $v;
        }

        return $base;
    }

    /** Tres preguntas iguales con los campos dados encima de una correcta. */
    private static function withQuestion(string $json): \stdClass
    {
        $q = json_decode('{"q":"Q","o":["a","b","c","d"],"a":0,"e":"x"}');
        foreach ((array) json_decode($json) as $k => $v) {
            $q->{$k} = $v;
        }

        return self::reading('{"qs":['.json_encode($q).','.json_encode($q).','.json_encode($q).']}');
    }

    private function rejects(mixed $data, string $code = 'bad_payload', ?string $message = null): void
    {
        try {
            ReadingValidator::validate($data);
            $this->fail('debía rechazar');
        } catch (DomainError $e) {
            $this->assertSame($code, $e->errorCode);
            if ($message !== null) {
                $this->assertSame($message, $e->getMessage());
            }
        }
    }

    public function test_a_valid_reading_passes_and_keeps_b_and_i(): void
    {
        $r = ReadingValidator::validate(self::reading());
        $this->assertSame('Remote work', $r->title);
        $this->assertSame(10, $r->words);
        $this->assertSame(['title', 'body', 'qs'], array_keys($r->data));
        $this->assertSame('Porque <i>sí</i>.', $r->data['qs'][0]['e']);
    }

    public function test_malicious_explanation_is_stored_neutralised(): void
    {
        $r = ReadingValidator::validate(self::withQuestion('{"e":"<img src=x onerror=\"fetch(1)\"><b>ok</b>"}'));
        $json = json_encode($r->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $this->assertStringNotContainsString('<img', $json);
        $this->assertStringContainsString('<b>ok</b>', $json);
    }

    public function test_only_known_fields_are_kept(): void
    {
        $data = self::withQuestion('{"html":"<script>1</script>"}');
        $data->extra = '<script>1</script>';
        $r = ReadingValidator::validate($data);
        $this->assertStringNotContainsString('script', json_encode($r->data));
        $this->assertSame(['q', 'o', 'a', 'e'], array_keys($r->data['qs'][0]));
    }

    public function test_title_is_capped_and_defaulted(): void
    {
        $r = ReadingValidator::validate(self::reading('{"title":"'.str_repeat('x', 5000).'"}'));
        $this->assertSame(140, mb_strlen($r->title));
        $this->assertSame(140, mb_strlen($r->data['title']));
        $this->assertSame('42', ReadingValidator::validate(self::reading('{"title":42}'))->title);
        $this->assertSame('Texto generado', ReadingValidator::validate(self::reading('{"title":null}'))->data['title']);
        $this->assertSame('Texto generado', ReadingValidator::validate(self::reading('{"title":"   "}'))->title);
        $this->assertSame('a', ReadingValidator::validate(self::reading('{"title":"  a  "}'))->title);
    }

    public function test_messages(): void
    {
        $this->rejects(null, message: 'Falta el texto.');
        $this->rejects('texto', message: 'Falta el texto.');
        $this->rejects(0, message: 'Falta el texto.');
        $this->rejects([], message: 'El texto tiene que traer al menos dos párrafos.');
        $this->rejects(self::reading('{"body":["solo uno","   ",3]}'), message: 'El texto tiene que traer al menos dos párrafos.');
        $this->rejects(self::reading('{"qs":[]}'), message: 'El texto tiene que traer al menos tres preguntas.');
        $this->rejects(self::withQuestion('{"o":["a","b","c"]}'), message: 'Alguna pregunta no tiene cuatro opciones.');
        $this->rejects(self::withQuestion('{"a":4}'), message: 'Alguna pregunta no marca cuál es la correcta.');
        $this->rejects(self::withQuestion('{"e":["<script>"]}'), message: 'Alguna explicación no es texto.');
    }

    /** @return array<string, array{string}> */
    public static function badQuestions(): array
    {
        return [
            'three options' => ['{"o":["a","b","c"]}'], 'object option' => ['{"o":["a","b","c",{"toString":"x"}]}'],
            'number option' => ['{"o":["a","b","c",4]}'], 'numeric q' => ['{"q":7}'], 'a too big' => ['{"a":4}'],
            'a negative' => ['{"a":-1}'], 'a fractional' => ['{"a":1.5}'], 'a string' => ['{"a":"1"}'],
            'e object' => ['{"e":{"html":"<script>"}}'], 'e list' => ['{"e":["<script>"]}'],
        ];
    }

    #[DataProvider('badQuestions')]
    public function test_bad_questions_are_rejected(string $json): void
    {
        $this->rejects(self::withQuestion($json));
    }

    public function test_question_that_is_not_an_object_is_rejected(): void
    {
        $this->rejects(self::reading('{"qs":["a","b","c"]}'), message: 'Alguna pregunta no tiene cuatro opciones.');
    }

    public function test_whole_number_float_answer_is_an_integer_like_in_js(): void
    {
        $r = ReadingValidator::validate(self::withQuestion('{"a":1.0}'));
        $this->assertSame('1', json_encode($r->data['qs'][0]['a']));
    }

    public function test_missing_or_null_explanation_becomes_empty(): void
    {
        $q = json_decode('{"q":"Q","o":["a","b","c","d"],"a":0}');
        $data = self::reading();
        $data->qs = [$q, $q, $q];
        $this->assertSame('', ReadingValidator::validate($data)->data['qs'][0]['e']);
        $this->assertSame('', ReadingValidator::validate(self::withQuestion('{"e":null}'))->data['qs'][0]['e']);
    }

    public function test_words_count_like_js_split(): void
    {
        $r = ReadingValidator::validate(self::reading('{"body":["  uno dos","tres "]}'));
        // " uno dos tres ".split(/\s+/) → ["", "uno", "dos", "tres", ""].
        $this->assertSame(5, $r->words);
    }

    public function test_more_than_1500_words_is_payload_too_large(): void
    {
        $this->rejects(self::reading('{"body":["'.str_repeat('w ', 1000).'","'.str_repeat('w ', 500).'"]}'),
            'payload_too_large', 'El texto es demasiado largo.');
    }
}
