<?php

namespace App\Http\Controllers;

use App\Http\Support\ApiJson;
use Symfony\Component\HttpFoundation\Response;

/** `/api/deepseek`: el proxy antiguo, retirado. 410 con cualquier método, sin CORS. */
final class GoneController
{
    public function __invoke(): Response
    {
        return ApiJson::bare(410, 'gone', 'Este endpoint ya no existe. Usa /api/ai/chat.');
    }
}
