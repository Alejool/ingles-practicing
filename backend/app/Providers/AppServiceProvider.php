<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Ruta\Shared\Domain\Clock;
use Ruta\Shared\Infrastructure\SystemClock;

/** Enlaza los puertos del dominio con sus adaptadores (Clock; luego ChatModel y LoginLinkSender). */
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Clock::class, SystemClock::class);
    }
}
