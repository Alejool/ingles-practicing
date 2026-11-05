<?php

// Ejemplo de dominio que rompe la regla. Solo lo lee DomainIsFrameworkFreeTest; nunca se carga.

namespace Tests\fixtures\architecture;

use Illuminate\Support\Facades\DB;

final class DomainViolation
{
    public function run(): array
    {
        $json = \App\Http\Support\ApiJson::class;
        $rows = DB::select('select 1');
        Log::info('x');

        return [config('ruta.x'), now(), $rows, $json];
    }
}
