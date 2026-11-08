<?php

namespace Ruta\Progress\Application;

/** Progreso a subir y la versión que tenía el cliente (0 si no mandó un número). */
final class PutProgressCommand
{
    public function __construct(
        public readonly \stdClass $data,
        public readonly int|float $baseVersion,
    ) {}
}
