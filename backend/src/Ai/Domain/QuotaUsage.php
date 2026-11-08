<?php

namespace Ruta\Ai\Domain;

/**
 * Las sumas de `ai_usage` (millonésimas de dólar, solo filas `ok`) que necesita la
 * decisión. Las de usuario valen 0 para un anónimo y las de anónimo 0 para un usuario.
 */
final class QuotaUsage
{
    public function __construct(
        public readonly int $spentTodayMicros,
        public readonly int $userDailyMicros,
        public readonly int $userMonthlyMicros,
        public readonly int $anonDeviceMicros,
        public readonly int $anonIpMicros,
    ) {}
}
