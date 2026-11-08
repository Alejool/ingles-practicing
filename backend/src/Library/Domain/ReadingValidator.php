<?php

namespace Ruta\Library\Domain;

use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\HtmlSanitizer;
use Ruta\Shared\Domain\JsString;

/**
 * Comprueba que lo publicado tiene la forma de una lectura (`validar` de readings.mts).
 * Recibe el JSON decodificado con objetos como `stdClass`. Mismos mensajes.
 */
final class ReadingValidator
{
    private const TITLE_MAX = 140;

    private const MAX_WORDS = 1500;

    private const DEFAULT_TITLE = 'Texto generado';

    public static function validate(mixed $data): ValidatedReading
    {
        // `!data || typeof data !== "object"`: una lista es un objeto en JS y pasa (sin campos).
        if (! $data instanceof \stdClass && ! is_array($data)) {
            throw new DomainError('bad_payload', 'Falta el texto.');
        }
        $fields = $data instanceof \stdClass ? $data : new \stdClass;

        $body = array_values(array_filter(
            is_array($fields->body ?? null) ? $fields->body : [],
            fn (mixed $p) => is_string($p) && JsString::trim($p) !== '',
        ));
        $qs = is_array($fields->qs ?? null) ? $fields->qs : [];
        if (count($body) < 2) {
            throw new DomainError('bad_payload', 'El texto tiene que traer al menos dos párrafos.');
        }
        if (count($qs) < 3) {
            throw new DomainError('bad_payload', 'El texto tiene que traer al menos tres preguntas.');
        }
        foreach ($qs as $x) {
            self::assertQuestion($x);
        }

        $title = JsString::clip($fields->title ?? null, self::TITLE_MAX);
        if ($title === '') {
            $title = self::DEFAULT_TITLE;
        }
        // `body.join(" ").split(/\s+/).length`: cuenta también los trozos vacíos de los extremos.
        $words = count(preg_split('/[\s\p{Z}\x{FEFF}]+/u', implode(' ', $body)) ?: []);
        if ($words > self::MAX_WORDS) {
            throw new DomainError('payload_too_large', 'El texto es demasiado largo.');
        }

        return new ValidatedReading($title, $words, [
            'title' => $title,
            'body' => $body,
            'qs' => array_map(fn (\stdClass $x) => ['q' => $x->q, 'o' => $x->o, 'a' => $x->a, 'e' => HtmlSanitizer::clean($x->e ?? null)], $qs),
        ]);
    }

    /** @phpstan-assert \stdClass $x */
    private static function assertQuestion(mixed $x): void
    {
        $options = $x instanceof \stdClass ? ($x->o ?? null) : null;
        if (! $x instanceof \stdClass || ! is_string($x->q ?? null) || ! is_array($options) || count($options) !== 4
            || array_filter($options, fn (mixed $o) => ! is_string($o)) !== []) {
            throw new DomainError('bad_payload', 'Alguna pregunta no tiene cuatro opciones.');
        }
        $a = $x->a ?? null;
        $integer = is_int($a) || (is_float($a) && is_finite($a) && floor($a) === $a);
        if (! $integer || $a < 0 || $a > 3) {
            throw new DomainError('bad_payload', 'Alguna pregunta no marca cuál es la correcta.');
        }
        $e = $x->e ?? null;
        if ($e !== null && ! is_string($e)) {
            throw new DomainError('bad_payload', 'Alguna explicación no es texto.');
        }
    }
}
