<?php

use App\Http\Middleware\BodyLimit;
use App\Http\Support\ApiJson;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Ruta\Shared\Domain\DomainError;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sus cabeceras no son las de la API Node; las pone ApiJson (y Cors en el preflight).
        $middleware->remove(HandleCors::class);
        // Antes que nada del endpoint (sesión incluida), como el tope de `toWebRequest`.
        $middleware->api(prepend: [BodyLimit::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Un error de dominio es una respuesta prevista, no un fallo: no se registra.
        $exceptions->dontReport(DomainError::class);

        $exceptions->render(fn (DomainError $e, Request $request) => ApiJson::error($request, $e));

        // Cualquier otro fallo dentro de la API o de /healthz: 500 sin detalle, como `fail()`.
        // Las HttpException (p. ej. un 404 de `/api` llamado sin pasar por nginx) siguen su
        // curso normal. El registro (stderr) lleva la excepción, nunca el cuerpo de la petición.
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($e instanceof HttpExceptionInterface || ! $request->is('api', 'api/*', 'healthz')) {
                return null;
            }

            // /healthz nunca lleva CORS (lo responde el servidor, no una función).
            return $request->is('healthz')
                ? ApiJson::bare(500, 'server_error', 'Error interno', cacheControl: null)
                : ApiJson::serverError($request);
        });
    })->create();
