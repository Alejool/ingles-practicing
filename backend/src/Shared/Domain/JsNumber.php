<?php

namespace Ruta\Shared\Domain;

/** Lectura de números de variables de entorno con la semántica de la API Node. */
final class JsNumber
{
    /**
     * `num()` de _http.mts: `parseInt(v, 10)` y, si no sale un número, el defecto.
     * "15abc" vale 15; "", "abc", `true` o null dan el defecto.
     */
    public static function parseInt(mixed $raw, int $default): int
    {
        if (is_int($raw)) {
            return $raw;
        }
        if (! is_string($raw) || preg_match('/^\s*([+-]?\d+)/', $raw, $m) !== 1) {
            return $default;
        }

        return (int) $m[1];
    }

    /**
     * `Number(v)` de JS para un valor que llegó en un JSON: null es 0, true 1, una lista
     * pasa por su texto (`[9]` → 9, `[1,2]` → NaN) y un objeto es NaN (aquí null).
     */
    public static function fromJson(mixed $v): ?float
    {
        return match (true) {
            $v === null => 0.0,
            is_bool($v) => $v ? 1.0 : 0.0,
            is_int($v), is_float($v) => (float) $v,
            is_string($v), is_array($v) => self::number(JsString::of($v)),
            default => null,
        };
    }

    /**
     * `Number(v)` de JS para el texto de una variable: "" es 0, null (sin definir)
     * es NaN (aquí null), y lo que no es un número entero o decimal también.
     */
    public static function number(mixed $raw): ?float
    {
        if (is_int($raw) || is_float($raw)) {
            return (float) $raw;
        }
        if (! is_string($raw)) {
            return null;
        }
        $t = trim($raw);
        if ($t === '') {
            return 0.0;
        }

        return is_numeric($t) ? (float) $t : null;
    }
}
