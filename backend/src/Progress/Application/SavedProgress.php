<?php

namespace Ruta\Progress\Application;

/** Versión y fecha de la copia recién guardada. */
final class SavedProgress
{
    public function __construct(
        public readonly int $version,
        public readonly string $updatedAt,
    ) {}
}
