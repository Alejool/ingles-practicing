<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdminRequest;
use App\Http\Support\ApiJson;
use Ruta\Admin\Application\ApplyBaselineSchema;
use Ruta\Admin\Application\CleanupSmokeData;
use Ruta\Admin\Application\HideReading;
use Ruta\Admin\Application\UsageReport;
use Ruta\Ai\Domain\QuotaPolicy;
use Symfony\Component\HttpFoundation\Response;

/**
 * `/api/admin`: POST `op=schema|cleanup-test|hide`; cualquier otra cosa (GET, o POST
 * sin op conocida) devuelve el informe de uso.
 */
final class AdminController
{
    public function __invoke(
        AdminRequest $request,
        ApplyBaselineSchema $schema,
        CleanupSmokeData $cleanup,
        HideReading $hide,
        UsageReport $report,
        QuotaPolicy $quota,
    ): Response {
        return ApiJson::json($request, match ($request->operation()) {
            'schema' => ['ok' => true, 'message' => "Esquema aplicado ({$schema->handle()} sentencias)."],
            'cleanup-test' => $cleanup->handle($request->smokeDevice()),
            'hide' => ['ok' => true, 'texto' => $hide->handle($request->readingId(), $request->hides())],
            default => $report->handle($quota->limits),
        });
    }
}
