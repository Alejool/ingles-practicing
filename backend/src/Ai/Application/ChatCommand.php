<?php

namespace Ruta\Ai\Application;

/** Petición de IA ya leída en el borde: tipo y modelo válidos, quién llama y los datos crudos. */
final class ChatCommand
{
    public function __construct(
        public readonly string $kind,
        public readonly string $model,
        public readonly string $deviceId,
        public readonly string $ipHash,
        public readonly mixed $payload,
    ) {}
}
