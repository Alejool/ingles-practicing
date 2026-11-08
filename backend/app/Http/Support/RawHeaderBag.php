<?php

namespace App\Http\Support;

use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * Cabeceras de respuesta con `Cache-Control` tal cual se da, o sin él. La bolsa de
 * Symfony lo reescribe (ordena directivas, añade `private`, pone `no-cache, private`
 * si falta) y la API Node no: el contrato compara la cadena exacta.
 */
final class RawHeaderBag extends ResponseHeaderBag
{
    /** @param array<string, string> $headers */
    public function __construct(array $headers = [])
    {
        parent::__construct($headers);

        if ($this->get('Cache-Control') === '') {
            $this->remove('Cache-Control');
        }
    }

    /**
     * Node escribe los valores de cabecera en Latin-1 («día» → `d\xEDa`) y el front lee
     * esos bytes; un valor en UTF-8 con caracteres no ASCII se pasa a Latin-1 igual.
     */
    public function set(string $key, string|array|null $values, bool $replace = true): void
    {
        parent::set($key, is_array($values) ? array_map(self::latin1(...), $values) : self::latin1($values), $replace);
    }

    private static function latin1(?string $value): ?string
    {
        if ($value === null || ! preg_match('/[^\x00-\x7F]/', $value) || ! mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        return mb_convert_encoding($value, 'ISO-8859-1', 'UTF-8');
    }

    protected function computeCacheControlValue(): string
    {
        return '';
    }
}
