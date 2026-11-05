<?php

// Lista explícita de endpoints, una línea por ruta. Sin prefijo automático:
// cada ruta escribe su camino completo (`/healthz` va fuera de `/api`).
// `any` en todas: el controlador decide por método y el 405 de Laravel no aparece nunca.
// El grupo `api` lleva BodyLimit (bootstrap/app.php); `/healthz` y el 404 no, como en Node.

use App\Http\Controllers\GoneController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\NotFoundController;
use App\Http\Middleware\BodyLimit;
use Illuminate\Support\Facades\Route;

Route::any('/healthz', HealthController::class)->withoutMiddleware(BodyLimit::class);

Route::any('/api/deepseek', GoneController::class);

// Siempre la última. `{path?}`: también `/api/` (Laravel quita la barra final).
Route::any('/api/{path?}', NotFoundController::class)->where('path', '.*')->withoutMiddleware(BodyLimit::class);
