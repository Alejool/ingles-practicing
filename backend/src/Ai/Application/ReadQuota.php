<?php

namespace Ruta\Ai\Application;

use Ruta\Ai\Domain\QuotaPolicy;
use Ruta\Ai\Domain\QuotaState;
use Ruta\Ai\Infrastructure\AiUsageRepository;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Shared\Domain\Clock;

/** Cuánto le queda a quien pregunta (`readQuota`). */
final class ReadQuota
{
    public function __construct(
        private readonly AiUsageRepository $repo,
        private readonly QuotaPolicy $policy,
        private readonly Clock $clock,
    ) {}

    public function handle(?SessionUser $user, string $deviceId, string $ipHash): QuotaState
    {
        $usage = $this->repo->usage($user, $deviceId, $ipHash, $this->policy->limits);

        return $this->policy->state($usage, $user, $this->clock->now());
    }
}
