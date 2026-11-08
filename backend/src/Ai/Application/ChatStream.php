<?php

namespace Ruta\Ai\Application;

use Generator;
use Psr\Log\LoggerInterface;
use Throwable;

/**
 * El stream del proveedor, intacto, y de camino el recuento de tokens: al terminar,
 * la reserva se sustituye por lo que costó de verdad. Si el cliente corta antes, la
 * reserva se queda con el coste estimado (como en Node).
 */
final class ChatStream
{
    private int $promptTokens = 0;

    private int $completionTokens = 0;

    /** @param iterable<string> $upstream */
    public function __construct(
        private readonly iterable $upstream,
        private readonly string $usageId,
        private readonly string $model,
        private readonly SettleUsage $settle,
        private readonly LoggerInterface $log,
    ) {}

    /** @return Generator<int, string> */
    public function chunks(): Generator
    {
        $buffer = '';
        foreach ($this->upstream as $chunk) {
            yield $chunk;
            $buffer .= $chunk;
            while (($i = strpos($buffer, "\n")) !== false) {
                $this->readLine(trim(substr($buffer, 0, $i)));
                $buffer = substr($buffer, $i + 1);
            }
        }
        // Una última línea sin salto final (el `usage` puede venir ahí) también cuenta.
        $this->readLine(trim($buffer));
        $this->settle();
    }

    /** Una línea `data: {…}` con `usage` da el recuento; el resto se ignora. */
    private function readLine(string $line): void
    {
        if (! str_starts_with($line, 'data:')) {
            return;
        }
        $payload = trim(substr($line, 5));
        if ($payload === '[DONE]') {
            return;
        }
        $event = json_decode($payload, true);
        if (is_array($event) && is_array($event['usage'] ?? null)) {
            $this->promptTokens = (int) ($event['usage']['prompt_tokens'] ?? 0);
            $this->completionTokens = (int) ($event['usage']['completion_tokens'] ?? 0);
        }
    }

    private function settle(): void
    {
        if ($this->promptTokens === 0 && $this->completionTokens === 0) {
            return;
        }
        try {
            $this->settle->handle($this->usageId, $this->model, $this->promptTokens, $this->completionTokens);
        } catch (Throwable $e) {
            // La respuesta ya se ha enviado entera: queda la reserva estimada, y el log.
            $this->log->error('[ai] no se pudo apuntar el coste real', ['exception' => $e, 'usage_id' => $this->usageId]);
        }
    }
}
