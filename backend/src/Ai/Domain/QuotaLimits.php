<?php

namespace Ruta\Ai\Domain;

/** Límites de la cuota de IA (`limits()` de _quota.mts), ya leídos de las variables. */
final class QuotaLimits
{
    /**
     * @param  'total'|'dia'  $anonWindow  "total": los créditos de prueba se gastan una vez; "dia": se renuevan cada día
     */
    public function __construct(
        public readonly int $anonLifetime,
        public readonly string $anonWindow,
        public readonly int $anonDaily,
        public readonly bool $accountsEnabled,
        public readonly int $anonIpWindowDays,
        public readonly int $userDaily,
        public readonly int $userMonthly,
        public readonly int $globalDaily,
        public readonly int $perMinute,
        public readonly int $maxTokens,
        public readonly int $creditMicros,
        public readonly float $globalDailyUsd,
    ) {}

    /** @param array<string, mixed> $quota el array `ruta.quota` de config */
    public static function fromConfig(array $quota, bool $accountsEnabled): self
    {
        return new self(
            anonLifetime: (int) $quota['anon_lifetime'],
            anonWindow: $quota['anon_window'] === 'dia' ? 'dia' : 'total',
            anonDaily: (int) $quota['anon_daily'],
            accountsEnabled: $accountsEnabled,
            anonIpWindowDays: (int) $quota['anon_ip_window_days'],
            userDaily: (int) $quota['user_daily'],
            userMonthly: (int) $quota['user_monthly'],
            globalDaily: (int) $quota['global_daily'],
            perMinute: (int) $quota['per_minute'],
            maxTokens: (int) $quota['max_tokens'],
            creditMicros: max(1, (int) $quota['credit_micros']),
            globalDailyUsd: max(0.0, (float) $quota['global_daily_usd']),
        );
    }

    public function anonDaily(): bool
    {
        return $this->anonWindow === 'dia';
    }
}
