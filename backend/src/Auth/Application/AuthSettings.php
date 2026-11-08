<?php

namespace Ruta\Auth\Application;

/** Variables de Auth (`APP_URL`, `LOGIN_*`, `SESSION_DAYS`, `ACCOUNTS_ENABLED`), ya leídas en config/ruta.php. */
final class AuthSettings
{
    public function __construct(
        public readonly string $appUrl,
        public readonly bool $accountsEnabled,
        public readonly int $linkMinutes,
        public readonly int $maxPerEmailHour,
        public readonly int $maxPerIpHour,
        public readonly int $sessionDays,
    ) {}

    /** @param array<string, mixed> $config el array `ruta` de config */
    public static function fromConfig(array $config): self
    {
        return new self(
            appUrl: (string) $config['app_url'],
            accountsEnabled: (bool) $config['accounts_enabled'],
            linkMinutes: (int) $config['login_link_minutes'],
            maxPerEmailHour: (int) $config['login_max_per_email_hour'],
            maxPerIpHour: (int) $config['login_max_per_ip_hour'],
            sessionDays: (int) $config['session_days'],
        );
    }
}
