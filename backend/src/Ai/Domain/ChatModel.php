<?php

namespace Ruta\Ai\Domain;

/**
 * Puerto: el modelo de lenguaje en streaming. Adaptadores: `DeepSeekClient` (HTTP) y
 * un modelo simulado programable en los tests (que nunca pueden llamar a DeepSeek).
 */
interface ChatModel
{
    /**
     * Abre la llamada. Devuelve el estado y los trozos del cuerpo tal cual llegan.
     *
     * @param  array<string, mixed>  $request  cuerpo de la petición (model, messages, stream…)
     *
     * @throws ModelUnreachable si no se llegó al proveedor (red, DNS, conexión cortada)
     */
    public function stream(array $request): ModelResponse;
}
