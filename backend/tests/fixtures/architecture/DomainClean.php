<?php

// Ejemplo de dominio correcto que menciona al framework solo en comentarios y cadenas:
// Illuminate\Support\Facades\DB, DB::select(), config(). Solo lo lee DomainIsFrameworkFreeTest.

namespace Tests\fixtures\architecture;

use DateTimeImmutable;

final class DomainClean
{
    public function __construct(private readonly array $config = []) {}

    public function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now');
    }

    public function run(): array
    {
        /* App\Http\Support\ApiJson no se usa aquí. */
        return [$this->config('x'), self::env(), $this->now(), 'DB::select', "Log::info"];
    }

    private function config(string $key): string
    {
        return $this->config[$key] ?? '';
    }

    private static function env(): string
    {
        return 'prod';
    }
}
