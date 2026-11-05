<?php

namespace App\Http\Controllers;

use App\Http\Support\ApiJson;
use Symfony\Component\HttpFoundation\Response;

/** Cualquier `/api/*` que no es un endpoint: 404 JSON sin CORS, como server/index.mts. */
final class NotFoundController
{
    public function __invoke(): Response
    {
        return ApiJson::bare(404, 'not_found', 'Endpoint desconocido');
    }
}
