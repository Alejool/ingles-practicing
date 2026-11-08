<?php

namespace Ruta\Ai\Domain;

/** Respuesta del modelo: estado HTTP y trozos del cuerpo, sin tocar un byte. */
final class ModelResponse
{
    /** @param iterable<string> $chunks */
    public function __construct(
        public readonly int $status,
        private readonly iterable $chunks,
    ) {}

    public function ok(): bool
    {
        return $this->status >= 200 && $this->status < 300;
    }

    /** @return iterable<string> */
    public function chunks(): iterable
    {
        return $this->chunks;
    }

    /** El cuerpo de un error, recortado (solo para el log). */
    public function errorDetail(int $max = 500): string
    {
        $body = '';
        foreach ($this->chunks as $chunk) {
            $body .= $chunk;
            if (strlen($body) >= $max * 4) {
                break;
            }
        }

        return mb_substr($body, 0, $max);
    }
}
