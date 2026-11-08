<?php

namespace Ruta\Admin\Application;

use Ruta\Admin\Infrastructure\AdminQueries;
use Ruta\Ai\Domain\QuotaLimits;

/** Uso y gasto de los últimos días, también en dólares (la cifra que de verdad importa). */
final class UsageReport
{
    public function __construct(private readonly AdminQueries $queries) {}

    /** @return array<string, mixed> las claves en el orden del informe de admin.mts */
    public function handle(QuotaLimits $limits): array
    {
        $q = $this->queries;

        return [
            'presupuesto' => [
                'credito_usd' => $limits->creditMicros / 1e6,
                'tope_diario_usd' => $limits->globalDailyUsd,
                'tope_diario_creditos' => $limits->globalDaily,
                'creditos_dia_por_cuenta' => $limits->userDaily,
                'creditos_prueba' => $limits->anonLifetime,
            ],
            'totales' => $q->totals(),
            'por_dia' => $q->usageByDay(),
            'por_tipo' => $q->usageByKind(),
            'top_del_mes' => $q->topOfMonth(),
            'uso' => [
                'resumen' => $q->pulseSummary(),
                // Cada tramo son diez días del plan: 1 = días 1–10, 2 = 11–20…
                'embudo' => $q->funnel(),
                'modulos_abiertos' => $q->openedModules(),
            ],
            'biblioteca' => $q->latestReadings(),
        ];
    }
}
