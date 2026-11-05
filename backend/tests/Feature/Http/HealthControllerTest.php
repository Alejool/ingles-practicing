<?php

namespace Tests\Feature\Http;

use Illuminate\Database\ConnectionInterface;
use Mockery;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use Psr\Log\LoggerInterface;
use Tests\TestCase;

/**
 * `/healthz` como lo responde hoy server/index.mts: antes que cualquier función,
 * con cualquier método, sin CORS y sin cookies.
 */
final class HealthControllerTest extends TestCase
{
    /** @return array<string, array{string}> */
    public static function methods(): array
    {
        return ['GET' => ['GET'], 'POST' => ['POST'], 'OPTIONS' => ['OPTIONS'], 'PUT' => ['PUT']];
    }

    #[DataProvider('methods')]
    public function test_responds_ok_with_any_method(string $method): void
    {
        $response = $this->call($method, '/healthz', server: ['HTTP_ORIGIN' => 'https://ajeno.example']);

        $response->assertStatus(200);
        $this->assertSame('{"ok":true}', $response->getContent());
        $this->assertSame('application/json', $response->headers->get('Content-Type'));
        $this->assertSame('no-store', $response->headers->get('Cache-Control'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
        $this->assertFalse($response->headers->has('Set-Cookie'));
    }

    public function test_database_down_is_503_and_is_logged_without_changing_the_response(): void
    {
        $db = Mockery::mock(ConnectionInterface::class);
        $db->shouldReceive('select')->andThrow(new PDOException('SQLSTATE[08006] connection to server at "db" failed'));
        $this->app->instance(ConnectionInterface::class, $db);

        $log = Mockery::mock(LoggerInterface::class);
        $log->shouldReceive('error')->once()->with('[healthz] base no disponible', [
            'exception' => PDOException::class,
            'message' => 'SQLSTATE[08006] connection to server at "db" failed',
        ]);
        $this->app->instance(LoggerInterface::class, $log);

        $response = $this->call('GET', '/healthz', server: ['HTTP_ORIGIN' => 'https://ajeno.example']);

        $response->assertStatus(503);
        $this->assertSame('{"ok":false,"db":false}', $response->getContent());
        $this->assertSame('application/json', $response->headers->get('Content-Type'));
        $this->assertSame('no-store', $response->headers->get('Cache-Control'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_up_route_of_the_skeleton_does_not_exist(): void
    {
        $this->get('/up')->assertStatus(404);
    }
}
