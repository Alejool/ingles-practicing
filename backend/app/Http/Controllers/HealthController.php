<?php

namespace App\Http\Controllers;

use App\Http\Support\ApiResponse;
use Illuminate\Database\ConnectionInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * `/healthz`: 200 si la base responde, 503 si no (un monitor externo lo cuenta como caída).
 * Igual que server/index.mts: cualquier método, `application/json` sin charset, sin CORS.
 */
final class HealthController
{
    public function __invoke(ConnectionInterface $db, LoggerInterface $log): Response
    {
        try {
            $db->select('select 1');

            return $this->respond(200, '{"ok":true}');
        } catch (Throwable $e) {
            // Clase y mensaje: el de PDO/QueryException lleva host, puerto y base, nunca la contraseña.
            $log->error('[healthz] base no disponible', ['exception' => $e::class, 'message' => $e->getMessage()]);

            return $this->respond(503, '{"ok":false,"db":false}');
        }
    }

    private function respond(int $status, string $body): Response
    {
        return new ApiResponse($body, $status, [
            'Content-Type' => 'application/json',
            'Cache-Control' => 'no-store',
        ]);
    }
}
