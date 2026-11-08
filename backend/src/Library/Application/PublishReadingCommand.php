<?php

namespace Ruta\Library\Application;

use Ruta\Library\Domain\ValidatedReading;

/** Lectura validada y sus datos de catálogo, ya acotados en el borde. */
final class PublishReadingCommand
{
    public function __construct(
        public readonly string $id,
        public readonly string $track,
        public readonly string $level,
        public readonly string $topic,
        public readonly ValidatedReading $reading,
    ) {}
}
