<?php

namespace Ruta\Shared\Domain;

/**
 * Rutas de estudio válidas (las de `TRACK_META` del front, exportadas a tracks.json).
 * Lo que no es una de ellas cae en `b1b2`, como `PISTAS` en readings.mts y pulse.mts.
 */
final class Tracks
{
    public const FALLBACK = 'b1b2';

    /** @param list<string> $ids */
    public function __construct(public readonly array $ids) {}

    public function has(string $id): bool
    {
        return in_array($id, $this->ids, true);
    }

    public function orFallback(string $id): string
    {
        return $this->has($id) ? $id : self::FALLBACK;
    }
}
