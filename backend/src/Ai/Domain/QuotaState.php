<?php

namespace Ruta\Ai\Domain;

/**
 * Lo que le queda a quien pregunta (`QuotaState` de _quota.mts). `toArray()` da
 * las claves en el orden de la API Node; las mensuales solo con cuenta.
 */
final class QuotaState
{
    /**
     * @param  'total'|'día'  $window
     */
    public function __construct(
        public readonly bool $authenticated,
        public readonly int $used,
        public readonly int $limit,
        public readonly int $remaining,
        public readonly string $window,
        public readonly ?string $resetsAt,
        public readonly ?int $monthlyUsed,
        public readonly ?int $monthlyLimit,
        public readonly int $globalRemaining,
        public readonly float $spentTodayUsd,
        public readonly float $budgetUsd,
    ) {}

    /** @return array<string, bool|int|float|string|null> */
    public function toArray(): array
    {
        $out = [
            'authenticated' => $this->authenticated,
            'used' => $this->used,
            'limit' => $this->limit,
            'remaining' => $this->remaining,
            'window' => $this->window,
            'resetsAt' => $this->resetsAt,
        ];
        if ($this->authenticated) {
            $out['monthlyUsed'] = $this->monthlyUsed;
            $out['monthlyLimit'] = $this->monthlyLimit;
        }

        return [
            ...$out,
            'globalRemaining' => $this->globalRemaining,
            'spentTodayUsd' => $this->spentTodayUsd,
            'budgetUsd' => $this->budgetUsd,
        ];
    }
}
