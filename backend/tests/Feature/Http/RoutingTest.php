<?php

namespace Tests\Feature\Http;

use App\Http\Controllers\HealthController;
use App\Http\Controllers\NotFoundController;
use App\Http\Middleware\BodyLimit;
use App\Http\Middleware\Cors;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Routing\Route;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * Lo que server/index.mts hace fuera de las funciones: 410 de /api/deepseek, 404 JSON
 * de cualquier otra /api/*, tope de cuerpo de 2 MB y preflight CORS.
 */
final class RoutingTest extends TestCase
{
    /** @return array<string, array{string}> */
    public static function methods(): array
    {
        return ['GET' => ['GET'], 'POST' => ['POST'], 'PUT' => ['PUT'], 'DELETE' => ['DELETE'], 'OPTIONS' => ['OPTIONS']];
    }

    #[DataProvider('methods')]
    public function test_deepseek_is_gone_with_any_method(string $method): void
    {
        $response = $this->call($method, '/api/deepseek', server: ['HTTP_ORIGIN' => 'https://ajeno.example']);

        $response->assertStatus(410);
        $this->assertSame(
            '{"error":{"code":"gone","message":"Este endpoint ya no existe. Usa /api/ai/chat."}}',
            $response->getContent(),
        );
        $this->assertSame('application/json', $response->headers->get('Content-Type'));
        $this->assertSame('no-store', $response->headers->get('Cache-Control'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
    }

    #[DataProvider('methods')]
    public function test_unknown_api_path_is_json_404_without_cors(string $method): void
    {
        $response = $this->call($method, '/api/xyz/abc', server: ['HTTP_ORIGIN' => 'https://ajeno.example']);

        $response->assertStatus(404);
        $this->assertSame('{"error":{"code":"not_found","message":"Endpoint desconocido"}}', $response->getContent());
        $this->assertSame('application/json', $response->headers->get('Content-Type'));
        $this->assertSame('no-store', $response->headers->get('Cache-Control'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
        $this->assertFalse($response->headers->has('Set-Cookie'));
    }

    public function test_paths_outside_the_api_are_404(): void
    {
        $this->get('/')->assertStatus(404);
        $this->get('/plan')->assertStatus(404);
    }

    /**
     * `/api/` es una /api/* desconocida (not-found.test.mts). Laravel le quita la barra,
     * así que `/api` llega igual; en producción `/api` sin barra no pasa de nginx (es del front).
     */
    public function test_api_root_is_the_json_404(): void
    {
        $response = $this->get('/api/');

        $response->assertStatus(404);
        $this->assertSame('{"error":{"code":"not_found","message":"Endpoint desconocido"}}', $response->getContent());
        $this->assertSame('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_body_over_2_mib_is_a_500_without_cors(): void
    {
        $body = str_repeat('a', 2 * 1024 * 1024 + 1);

        $response = $this->call('POST', '/api/deepseek', server: ['HTTP_ORIGIN' => 'https://a.example'], content: $body);

        $response->assertStatus(500);
        $this->assertSame('{"error":{"code":"server_error","message":"Error interno"}}', $response->getContent());
        $this->assertSame('application/json', $response->headers->get('Content-Type'));
        $this->assertFalse($response->headers->has('Cache-Control'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
    }

    /** Como server/index.mts: ni `/healthz` ni una `/api/*` desconocida leen el cuerpo. */
    public function test_body_limit_does_not_apply_to_healthz_nor_unknown_paths(): void
    {
        $body = str_repeat('a', 2 * 1024 * 1024 + 1);

        $this->call('POST', '/healthz', content: $body)->assertStatus(200);
        $this->call('POST', '/api/xyz', content: $body)->assertStatus(404);
    }

    /** Un endpoint nuevo hereda el tope sin acordarse: va en el grupo `api`. */
    public function test_every_endpoint_has_the_body_limit(): void
    {
        // Los grupos de `withMiddleware` se aplican al resolver el kernel HTTP.
        $this->app->make(HttpKernel::class);
        $router = $this->app['router'];
        $routes = collect($router->getRoutes()->getRoutes());
        $sinTope = [HealthController::class, NotFoundController::class];

        $endpoints = $routes->filter(fn (Route $r) => str_starts_with($r->uri(), 'api/')
            && ! in_array($r->getControllerClass(), $sinTope, true));
        $this->assertNotEmpty($endpoints->all());
        foreach ($endpoints as $route) {
            $this->assertContains(BodyLimit::class, $router->gatherRouteMiddleware($route), $route->uri());
        }

        foreach ($sinTope as $controller) {
            $route = $routes->first(fn (Route $r) => $r->getControllerClass() === $controller);
            $this->assertNotContains(BodyLimit::class, $router->gatherRouteMiddleware($route), $controller);
        }
    }

    public function test_body_of_exactly_2_mib_passes(): void
    {
        $body = str_repeat('a', 2 * 1024 * 1024);

        $this->call('POST', '/api/deepseek', content: $body)->assertStatus(410);
    }

    public function test_cors_middleware_answers_preflight_and_passes_other_methods(): void
    {
        config(['ruta.allowed_origins' => ['https://a.example']]);
        $next = fn (Request $r): Response => new Response('siguiente', 200);

        $preflight = (new Cors)->handle(Request::create('/api/quota', 'OPTIONS', server: ['HTTP_ORIGIN' => 'https://a.example']), $next);
        $this->assertSame(204, $preflight->getStatusCode());
        $this->assertSame('https://a.example', $preflight->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('Origin', $preflight->headers->get('Vary'));

        $get = (new Cors)->handle(Request::create('/api/quota', 'GET'), $next);
        $this->assertSame('siguiente', $get->getContent());
    }
}
