<?php

namespace Ruta\Pulse\Domain;

use Ruta\Shared\Domain\JsNumber;
use Ruta\Shared\Domain\JsString;
use Ruta\Shared\Domain\Tracks;

/**
 * Un latido anónimo (pulse.mts): en qué ruta y día del plan va alguien, cuántos días
 * ha hecho, su racha y qué módulos ha abierto. Responde a «¿en qué día se cae la
 * gente?» sin guardar nada que identifique.
 */
final class Beat
{
    /** Ids de módulo aceptados; cualquier otra cosa se descarta. */
    private const MODULES = [
        'panel', 'examenes', 'diag', 'plan', 'gram', 'vocab', 'mine', 'uoe', 'writing',
        'input', 'speak', 'quiz', 'mock', 'errors', 'tutor', 'res', 'ajustes', 'cuenta',
    ];

    private const MAX_SEEN = 20;

    private function __construct(
        public readonly string $track,
        public readonly int $planDay,
        public readonly int $doneDays,
        public readonly int $streak,
        public readonly string $seen,
    ) {}

    public static function fromBody(mixed $body, Tracks $tracks): self
    {
        $get = fn (string $k): mixed => $body instanceof \stdClass && property_exists($body, $k) ? $body->{$k} : null;
        // `String(body?.track)`: sin campo es "undefined", que no es ninguna ruta.
        $track = $body instanceof \stdClass && property_exists($body, 'track') ? JsString::of($body->track) : '';
        $seen = is_array($get('seen')) ? $get('seen') : [];
        $modules = array_values(array_filter(
            array_map(fn (mixed $x) => JsString::of($x), $seen),
            fn (string $m) => in_array($m, self::MODULES, true),
        ));

        return new self(
            $tracks->orFallback($track),
            self::integer($get('planDay'), 1, 200),
            self::integer($get('doneDays'), 0, 200),
            self::integer($get('streak'), 0, 400),
            implode(',', array_slice($modules, 0, self::MAX_SEEN)),
        );
    }

    /** `entero()`: `Math.round(Number(v))` acotado; lo que no es un número, el mínimo. */
    private static function integer(mixed $v, int $min, int $max): int
    {
        $n = JsNumber::fromJson($v);
        if ($n === null || ! is_finite($n)) {
            return $min;
        }

        return (int) min($max, max($min, floor($n + 0.5)));
    }
}
