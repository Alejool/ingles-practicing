<?php

namespace Tests\Support;

use Ruta\Ai\Domain\ChatModel;
use Ruta\Ai\Domain\ModelResponse;
use Ruta\Ai\Domain\ModelUnreachable;

/** Modelo simulado y programable: guarda cada petición y responde lo que se le diga. */
final class FakeChatModel implements ChatModel
{
    /** @var list<array<string, mixed>> */
    public array $requests = [];

    /** @param list<string> $chunks */
    public function __construct(
        private int $status = 200,
        private array $chunks = [],
        private bool $unreachable = false,
    ) {}

    /** @param list<string> $chunks */
    public static function ok(array $chunks): self
    {
        return new self(200, $chunks);
    }

    public static function failing(int $status, string $body): self
    {
        return new self($status, [$body]);
    }

    public static function unreachable(): self
    {
        return new self(unreachable: true);
    }

    public function stream(array $request): ModelResponse
    {
        $this->requests[] = $request;
        if ($this->unreachable) {
            throw new ModelUnreachable('sin conexión');
        }

        return new ModelResponse($this->status, (fn () => yield from $this->chunks)());
    }
}
