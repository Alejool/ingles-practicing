<?php

namespace Ruta\Ai\Application;

use Ruta\Ai\Domain\Pricing;
use Ruta\Ai\Infrastructure\AiUsageRepository;

/** Al terminar una llamada, la reserva se sustituye por lo que costó de verdad. */
final class SettleUsage
{
    public function __construct(
        private readonly AiUsageRepository $repo,
        private readonly Pricing $pricing,
    ) {}

    public function handle(string $usageId, string $model, int $promptTokens, int $completionTokens): void
    {
        $this->repo->settle($usageId, $promptTokens, $completionTokens,
            $this->pricing->costMicros($model, $promptTokens, $completionTokens));
    }
}
