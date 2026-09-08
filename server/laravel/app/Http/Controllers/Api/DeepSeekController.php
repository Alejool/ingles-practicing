<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeepSeekChatRequest;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Proxy de la API de DeepSeek.
 *
 * La clave nunca sale del servidor: el cliente llama a POST /api/deepseek/chat
 * y este controlador reenvía la petición y devuelve el stream SSE tal cual,
 * token a token, para que la app pueda ir pintando la respuesta.
 */
final class DeepSeekController extends Controller
{
    public function chat(DeepSeekChatRequest $request): StreamedResponse
    {
        $upstream = Http::withToken((string) config('services.deepseek.key'))
            ->withOptions(['stream' => true])
            ->timeout(180)
            ->connectTimeout(15)
            ->acceptJson()
            ->post((string) config('services.deepseek.url'), $request->payload());

        $status = $upstream->status();
        $body = $upstream->toPsrResponse()->getBody();
        $contentType = $upstream->header('Content-Type') ?: 'text/event-stream';

        return response()->stream(
            function () use ($body): void {
                while (! $body->eof()) {
                    echo $body->read(2048);

                    if (ob_get_level() > 0) {
                        ob_flush();
                    }

                    flush();
                }

                $body->close();
            },
            $status,
            [
                'Content-Type' => $contentType,
                'Cache-Control' => 'no-cache, no-transform',
                'X-Accel-Buffering' => 'no',
                'Connection' => 'keep-alive',
            ]
        );
    }
}
