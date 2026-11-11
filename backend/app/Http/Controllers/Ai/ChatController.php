<?php

namespace App\Http\Controllers\Ai;

use App\Http\Requests\ChatRequest;
use App\Http\Support\ApiJson;
use App\Http\Support\ApiStreamedResponse;
use App\Http\Support\ClientContext;
use Ruta\Ai\Application\ReadQuota;
use Ruta\Ai\Application\StreamChat;
use Ruta\Auth\Application\ResolveSession;
use Symfony\Component\HttpFoundation\Response;

/**
 * `POST /api/ai/chat`, el único camino hacia el modelo. Orden de ai-chat.mts:
 * 405 → sesión (401/403) → cuerpo → `bad_kind` → modelo → dispositivo, IP → `bad_payload` →
 * reserva → proveedor → 200 `text/event-stream` con el stream del proveedor byte a byte.
 * Solo con cuenta (landing-y-acceso AC-21): sin sesión no se lee el cuerpo, no se
 * reserva nada ni se llama al modelo.
 */
final class ChatController
{
    public function __invoke(ChatRequest $request, ResolveSession $session, StreamChat $chat, ReadQuota $quota): Response
    {
        $request->assertMethod('POST');
        $user = $session->require(ClientContext::bearer($request));
        $cmd = $request->toCommand();

        $stream = $chat->start($user, $cmd);
        $state = $quota->handle($user, $cmd->deviceId, $cmd->ipHash);

        return new ApiStreamedResponse(function () use ($stream): void {
            foreach ($stream->chunks() as $chunk) {
                echo $chunk;
                flush();
            }
        }, 200, [
            ...ApiJson::corsHeaders($request->headers->get('Origin')),
            'Content-Type' => 'text/event-stream; charset=utf-8',
            'Cache-Control' => 'no-store, no-transform',
            'X-Accel-Buffering' => 'no',
            // El front pinta el contador sin pedir /api/quota otra vez. El «- 1» es de la API
            // Node (descuenta dos veces la reserva); se conserva por paridad y lo arregla TUT.
            'X-Quota-Remaining' => (string) max(0, $state->remaining - 1),
            'X-Quota-Limit' => (string) $state->limit,
            // «día» sale en Latin-1, como en Node: lo hace RawHeaderBag para toda cabecera.
            'X-Quota-Window' => $state->window,
        ]);
    }
}
