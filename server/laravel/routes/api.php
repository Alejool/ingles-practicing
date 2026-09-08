<?php

declare(strict_types=1);

use App\Http\Controllers\Api\DeepSeekController;
use Illuminate\Support\Facades\Route;

/*
 * Añade esto a routes/api.php.
 *
 * Sin auth: cualquiera que conozca la URL gasta tus créditos. Para uso personal,
 * el throttle basta; en público protégelo con Sanctum (comentado abajo) y
 * restringe el origen en config/cors.php.
 */
Route::post('/deepseek/chat', [DeepSeekController::class, 'chat'])
    ->middleware('throttle:20,1');

// Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function (): void {
//     Route::post('/deepseek/chat', [DeepSeekController::class, 'chat']);
// });
