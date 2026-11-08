<?php

namespace Ruta\Ai\Domain;

/** Precio por millón de tokens de cada modelo y coste de una llamada (`costeMicros`). */
final class Pricing
{
    /**
     * @param  array<string, array{in: float, out: float}>  $prices  dólares por millón de tokens
     */
    public function __construct(private readonly array $prices) {}

    /** Lo que costó una llamada, en millonésimas de dólar. */
    public function costMicros(string $model, int $promptTokens, int $completionTokens): int
    {
        $p = $this->priceOf($model);
        $usd = ($promptTokens / 1e6) * $p['in'] + ($completionTokens / 1e6) * $p['out'];

        // Math.round redondea .5 hacia arriba; con valores ≥ 0 es lo mismo que floor(x + .5).
        return max(0, (int) floor($usd * 1e6 + 0.5));
    }

    /** @return array{in: float, out: float} */
    private function priceOf(string $model): array
    {
        if (isset($this->prices[$model])) {
            return $this->prices[$model];
        }
        // Un modelo desconocido se cobra al precio del más caro: nunca subestimar.
        $max = null;
        foreach ($this->prices as $p) {
            if ($max === null || $p['out'] > $max['out']) {
                $max = $p;
            }
        }

        return $max ?? ['in' => 0.0, 'out' => 0.0];
    }
}
