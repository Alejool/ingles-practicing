<?php

namespace Ruta\Library\Application;

use Ruta\Library\Infrastructure\ReadingsRepository;

/** Lo que hay en la biblioteca de una ruta (o lo nuevo desde un instante). Público. */
final class ListReadings
{
    private const MAX = 200;

    public function __construct(
        private readonly ReadingsRepository $repo,
        private readonly int $configuredMax,
    ) {}

    /** @return list<array<string, mixed>> */
    public function handle(string $track, ?string $after): array
    {
        return $this->repo->visible($track, $after, min(self::MAX, max(1, $this->configuredMax)));
    }
}
