<?php

namespace App\Http\Support;

use JsonException;

/**
 * Lee un cuerpo JSON como `readJson` de la API Node: el tope se mide en unidades
 * UTF-16 (lo que cuenta `text.length` en JS), el cuerpo vacío es `{}` y los objetos
 * se quedan como objetos (también los vacíos), para devolverlos igual que llegaron.
 */
final class JsonBody
{
    public const DEFAULT_MAX_UNITS = 96 * 1024;

    public static function parse(string $raw, int $maxUnits = self::DEFAULT_MAX_UNITS): mixed
    {
        if (self::units($raw) > $maxUnits) {
            throw new HttpError(413, 'payload_too_large', 'El texto enviado es demasiado largo.');
        }
        if ($raw === '') {
            return new \stdClass;
        }

        try {
            return json_decode($raw, false, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new HttpError(400, 'bad_json', 'JSON inválido.');
        }
    }

    /** Longitud en unidades UTF-16: cada carácter fuera del plano básico cuenta dos. */
    public static function units(string $text): int
    {
        $astral = preg_match_all('/[\x{10000}-\x{10FFFF}]/u', $text);

        return mb_strlen($text, 'UTF-8') + ($astral === false ? 0 : $astral);
    }
}
