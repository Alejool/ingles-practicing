<?php

namespace Ruta\Library\Domain;

/**
 * Una lectura lista para guardar: `data` rehecho solo con los campos conocidos y la
 * explicación de cada pregunta ya limpia (el único campo que el cliente pinta como HTML).
 */
final class ValidatedReading
{
    /**
     * @param  array{title: string, body: list<string>, qs: list<array{q: string, o: list<string>, a: int|float, e: string}>}  $data
     */
    public function __construct(
        public readonly string $title,
        public readonly int $words,
        public readonly array $data,
    ) {}
}
