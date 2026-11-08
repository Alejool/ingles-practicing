<?php

namespace Ruta\Shared\Domain;

/**
 * Lo que hacen `String(x || "")`, `trim()` y `.length` de JS con un valor que llegó
 * en un JSON. Las reglas de la API Node se escribieron con esa semántica y los
 * mensajes y topes dependen de ella.
 */
final class JsString
{
    /** `String(x || "")`: los valores falsos de JS dan "". */
    public static function orEmpty(mixed $v): string
    {
        $falsy = $v === null || $v === false || $v === '' || $v === 0 || $v === 0.0;

        return $falsy ? '' : self::of($v);
    }

    /** `String(x)` para un valor de JSON (objetos como `stdClass`, listas como arrays). */
    public static function of(mixed $v): string
    {
        return match (true) {
            $v === null => 'null',
            is_bool($v) => $v ? 'true' : 'false',
            is_string($v) => $v,
            is_int($v) => (string) $v,
            is_float($v) => floor($v) === $v && abs($v) < 1e21 ? sprintf('%.0f', $v) : (string) $v,
            // [a, null].join(",") → "a,": null y undefined dentro de una lista son "".
            is_array($v) => implode(',', array_map(fn (mixed $x) => $x === null ? '' : self::of($x), $v)),
            default => '[object Object]',
        };
    }

    /** `String(v ?? "").slice(0, max).trim()`: el recorte de campos de readings.mts y prompts.ts. */
    public static function clip(mixed $v, int $max): string
    {
        return self::trim(self::slice($v === null ? '' : self::of($v), $max));
    }

    /** `trim()` de JS: también quita los espacios Unicode y el BOM. */
    public static function trim(string $s): string
    {
        return (string) preg_replace('/^[\s\p{Z}\x{FEFF}]+|[\s\p{Z}\x{FEFF}]+$/u', '', $s);
    }

    /**
     * `.slice(0, $max)` de JS: los primeros `$max` unidades UTF-16. Si el corte parte un
     * carácter fuera del plano básico, ese carácter se queda fuera (JS dejaría medio).
     */
    public static function slice(string $s, int $max): string
    {
        if (self::length($s) <= $max) {
            return $s;
        }
        $out = '';
        $units = 0;
        foreach (mb_str_split($s, 1, 'UTF-8') as $ch) {
            $units += strlen($ch) === 4 ? 2 : 1;
            if ($units > $max) {
                break;
            }
            $out .= $ch;
        }

        return $out;
    }

    /** `.length` de JS: unidades UTF-16 (un carácter fuera del plano básico cuenta dos). */
    public static function length(string $s): int
    {
        $astral = preg_match_all('/[\x{10000}-\x{10FFFF}]/u', $s);

        return mb_strlen($s, 'UTF-8') + ($astral === false ? 0 : $astral);
    }
}
