<?php

namespace Ruta\Ai\Application;

use Psr\Log\LoggerInterface;
use Ruta\Ai\Domain\ChatModel;
use Ruta\Ai\Domain\ModelUnreachable;
use Ruta\Ai\Domain\PayloadError;
use Ruta\Ai\Domain\PromptBuilder;
use Ruta\Ai\Domain\QuotaPolicy;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Shared\Domain\DomainError;
use Throwable;

/**
 * El único camino hacia el modelo (ai-chat.mts): compone los mensajes, abre la reserva
 * ANTES de llamar (si la respuesta se corta a mitad, la llamada ya está contada) y
 * abre el stream. Si el proveedor no responde o rechaza la llamada, la reserva se anula.
 */
final class StreamChat
{
    private const MAX_TOKENS_CAP = 4096;

    private const UNAVAILABLE = 'El servicio de IA no está respondiendo. Inténtalo en un momento.';

    public function __construct(
        private readonly ChatModel $model,
        private readonly ReserveCredits $reserve,
        private readonly SettleUsage $settle,
        private readonly QuotaPolicy $policy,
        private readonly LoggerInterface $log,
    ) {}

    public function start(?SessionUser $user, ChatCommand $cmd): ChatStream
    {
        try {
            $messages = PromptBuilder::build($cmd->kind, $cmd->payload);
        } catch (PayloadError $e) {
            throw new DomainError('bad_payload', $e->getMessage());
        }

        $usageId = $this->reserve->handle($user, $cmd->deviceId, $cmd->ipHash, $cmd->kind, $cmd->model)->id;

        try {
            $response = $this->model->stream([
                'model' => $cmd->model,
                'messages' => $messages,
                'stream' => true,
                'stream_options' => ['include_usage' => true],
                'temperature' => $cmd->kind === 'test' ? 0 : 1,
                'max_tokens' => min($this->policy->limits->maxTokens, self::MAX_TOKENS_CAP),
            ]);
        } catch (ModelUnreachable $e) {
            // Ni siquiera se llegó al proveedor: tampoco se cobra.
            $this->log->error('[ai] sin conexión con el proveedor', ['exception' => $e]);
            $this->reserve->annul($usageId);
            throw new DomainError('provider_error', self::UNAVAILABLE);
        }

        if (! $response->ok()) {
            $this->log->error('[ai] upstream', ['status' => $response->status, 'detail' => $response->errorDetail()]);
            // No se le cobra a nadie una llamada que el proveedor rechazó.
            $this->annulLogged($usageId);
            throw $response->status === 402
                ? new DomainError('provider_no_credit', 'El servicio de IA se ha quedado sin saldo. Avisa a quien administra la app.')
                : new DomainError('provider_error', self::UNAVAILABLE);
        }

        return new ChatStream($response->chunks(), $usageId, $cmd->model, $this->settle, $this->log);
    }

    /** Como `anularReserva(...).catch(log)`: si no se puede anular, el error del proveedor manda. */
    private function annulLogged(string $usageId): void
    {
        try {
            $this->reserve->annul($usageId);
        } catch (Throwable $e) {
            $this->log->error('[ai] no se pudo anular la reserva', ['exception' => $e, 'usage_id' => $usageId]);
        }
    }
}
