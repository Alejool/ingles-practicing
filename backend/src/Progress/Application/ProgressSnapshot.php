<?php

namespace Ruta\Progress\Application;

/** El progreso guardado `{data, version, updatedAt}`, o `{null, 0, null}` si no hay. */
final class ProgressSnapshot
{
    public function __construct(
        public readonly mixed $data,
        public readonly int $version,
        public readonly ?string $updatedAt,
    ) {}

    /** @return array{data: mixed, version: int, updatedAt: ?string} */
    public function toArray(): array
    {
        return ['data' => $this->data, 'version' => $this->version, 'updatedAt' => $this->updatedAt];
    }
}
