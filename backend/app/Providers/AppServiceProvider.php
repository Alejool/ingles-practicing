<?php

namespace App\Providers;

use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Http\Client\Factory as HttpFactory;
use Psr\Log\LoggerInterface;
use Illuminate\Support\ServiceProvider;
use Ruta\Ai\Domain\ChatModel;
use Ruta\Ai\Infrastructure\DeepSeekClient;
use Ruta\Admin\Application\ApplyBaselineSchema;
use Ruta\Admin\Application\CleanupSmokeData;
use Ruta\Admin\Infrastructure\AdminQueries;
use Ruta\Ai\Domain\Pricing;
use Ruta\Ai\Domain\QuotaLimits;
use Ruta\Ai\Domain\QuotaPolicy;
use Ruta\Auth\Application\AuthSettings;
use Ruta\Auth\Domain\LoginLinkSender;
use Ruta\Auth\Domain\ReturnTo;
use Ruta\Auth\Infrastructure\MailLoginLinkSender;
use Ruta\Auth\Infrastructure\MailSettings;
use Ruta\Library\Application\ListReadings;
use Ruta\Library\Infrastructure\ReadingsRepository;
use Ruta\Pulse\Application\RecordBeat;
use Ruta\Pulse\Infrastructure\PulseRepository;
use Ruta\Shared\Domain\Clock;
use Ruta\Shared\Domain\Tracks;
use Ruta\Shared\Infrastructure\ContentTracks;
use Ruta\Shared\Infrastructure\SystemClock;

/**
 * Enlaza los puertos del dominio con sus adaptadores (Clock, LoginLinkSender; luego
 * ChatModel) y construye los objetos de ajustes desde config/ruta.php. Los ajustes
 * se enlazan con `bind`: se leen en cada resolución, así un test puede cambiarlos.
 */
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Clock::class, SystemClock::class);

        $this->app->bind(AuthSettings::class, fn () => AuthSettings::fromConfig(config('ruta')));
        $this->app->bind(ReturnTo::class, fn () => new ReturnTo(
            (string) config('ruta.app_url'), (string) config('ruta.return_to_origins')));
        $this->app->bind(MailSettings::class, fn () => MailSettings::fromEnv(config('ruta.mail')));
        $this->app->bind(LoginLinkSender::class, fn ($app) => new MailLoginLinkSender(
            $app->make(MailSettings::class), $app->make(HttpFactory::class), $app->make(LoggerInterface::class),
            logAllowed: $app->environment('local', 'testing')));

        $this->app->bind(QuotaPolicy::class, fn () => new QuotaPolicy(
            QuotaLimits::fromConfig(config('ruta.quota'), (bool) config('ruta.accounts_enabled'))));
        $this->app->bind(Pricing::class, fn () => new Pricing(config('ruta.quota.prices')));
        $this->app->bind(ChatModel::class, fn () => new DeepSeekClient(
            new GuzzleClient, (string) config('ruta.deepseek_url'), (string) config('ruta.deepseek_api_key')));

        $this->app->singleton(Tracks::class, fn () => ContentTracks::load((string) config('ruta.content_dir')));
        $this->app->bind(ListReadings::class, fn ($app) => new ListReadings(
            $app->make(ReadingsRepository::class), (int) config('ruta.shared_readings_max')));
        $this->app->bind(RecordBeat::class, fn ($app) => new RecordBeat(
            $app->make(PulseRepository::class), (string) config('ruta.ip_pepper')));
        $this->app->bind(ApplyBaselineSchema::class, fn ($app) => new ApplyBaselineSchema(
            $app->make(AdminQueries::class), (string) config('ruta.schema_sql')));
        $this->app->bind(CleanupSmokeData::class, fn ($app) => new CleanupSmokeData(
            $app->make(AdminQueries::class), (string) config('ruta.ip_pepper')));
    }
}
