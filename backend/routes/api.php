<?php

// Lista explícita de endpoints, una línea por ruta. Sin prefijo automático:
// cada ruta escribe su camino completo (`/healthz` va fuera de `/api`).
// `any` en todas: el controlador decide por método y el 405 de Laravel no aparece nunca.
// El grupo `api` lleva BodyLimit (bootstrap/app.php); `/healthz` y el 404 no, como en Node.
// `Cors` responde el preflight (OPTIONS → 204) en los endpoints que lo tienen en Node.

use App\Http\Controllers\AdminController;
use App\Http\Controllers\Ai\ChatController;
use App\Http\Controllers\Ai\QuotaController;
use App\Http\Controllers\Auth\RequestLinkController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Auth\VerifyLinkController;
use App\Http\Controllers\GoneController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\NotFoundController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\PulseController;
use App\Http\Controllers\ReadingsController;
use App\Http\Middleware\BodyLimit;
use App\Http\Middleware\Cors;
use Illuminate\Support\Facades\Route;

Route::any('/healthz', HealthController::class)->withoutMiddleware(BodyLimit::class);

Route::any('/api/deepseek', GoneController::class);

Route::any('/api/auth/request', RequestLinkController::class)->middleware(Cors::class);
// Sin preflight: un OPTIONS también verifica (y redirige), como en Node.
Route::any('/api/auth/verify', VerifyLinkController::class);
Route::any('/api/auth/session', SessionController::class)->middleware(Cors::class);
Route::any('/api/quota', QuotaController::class)->middleware(Cors::class);
Route::any('/api/ai/chat', ChatController::class)->middleware(Cors::class);
Route::any('/api/progress', ProgressController::class)->middleware(Cors::class);
Route::any('/api/readings', ReadingsController::class)->middleware(Cors::class);
Route::any('/api/pulse', PulseController::class)->middleware(Cors::class);
Route::any('/api/admin', AdminController::class)->middleware(Cors::class);

// Siempre la última. `{path?}`: también `/api/` (Laravel quita la barra final).
Route::any('/api/{path?}', NotFoundController::class)->where('path', '.*')->withoutMiddleware(BodyLimit::class);
