<?php

namespace Tests\Feature\Database;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Los tests corren contra `ruta_test` y en entorno `testing`, aunque el contenedor
 * exporte DATABASE_URL=…/ruta y APP_ENV=local (ver los <server> de phpunit.xml).
 */
final class TestDatabaseTest extends TestCase
{
    public function test_runs_against_the_test_database(): void
    {
        $this->assertSame('ruta_test', DB::scalar('select current_database()'));
        $this->assertSame('testing', app()->environment());
    }
}
