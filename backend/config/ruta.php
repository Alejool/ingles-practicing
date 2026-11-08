<?php

use App\Http\Support\ApiJson;
use Ruta\Shared\Domain\JsNumber;

// Variables propias de la API, con los mismos nombres y valores por defecto que la API Node.
// Cada contexto añade aquí las suyas; fuera de config/ no se llama nunca a env().

// Texto de una variable tal como lo vería `process.env` (env() convierte "true"/"false"/"null").
$raw = static function (string $name): ?string {
    $v = env($name);

    return match (true) {
        $v === null => null,
        is_bool($v) => $v ? 'true' : 'false',
        default => (string) $v,
    };
};
$num = static fn (string $name, int $default): int => JsNumber::parseInt($raw($name), $default);

$mailProvider = strtolower($raw('MAIL_PROVIDER') ?? '') ?: 'log';
$mailKeys = [
    'MAIL_PROVIDER', 'MAIL_FROM', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS',
    'SMTP_SECURE', 'SMTP_INSECURE', 'RESEND_API_KEY', 'POSTMARK_TOKEN', 'MAILBOX_URL',
];

return [
    // Orígenes con CORS. Sin definir: `*`.
    'allowed_origins' => ApiJson::parseOrigins(env('ALLOWED_ORIGINS')),

    // Proxies propios delante de nginx: `true` es uno; sin la variable, ninguno.
    // (env() ya convierte "true" en booleano; "2abc" vale 2, como parseInt.)
    'trust_proxy' => env('TRUST_PROXY') === true ? 1 : max(0, (int) env('TRUST_PROXY', 0)),

    // Pimienta de los hashes de IP y del pulso (los valores por defecto los pone Hashing).
    'ip_pepper' => (string) env('IP_PEPPER', ''),

    // ── Auth ──
    // `process.env.APP_URL || ""` (no el `app.url` de Laravel, que tiene otro defecto).
    'app_url' => $raw('APP_URL') ?? '',
    // Lista para `safeReturnTo`: aquí sin definir es vacía, no `*`.
    'return_to_origins' => $raw('ALLOWED_ORIGINS') ?? '',
    'accounts_enabled' => $raw('ACCOUNTS_ENABLED') !== 'false' && $mailProvider !== 'none',
    'login_link_minutes' => $num('LOGIN_LINK_MINUTES', 15),
    'login_max_per_email_hour' => $num('LOGIN_MAX_PER_EMAIL_HOUR', 4),
    'login_max_per_ip_hour' => $num('LOGIN_MAX_PER_IP_HOUR', 12),
    'session_days' => $num('SESSION_DAYS', 60),

    // Correo (no las MAIL_* de Laravel), en texto como process.env: MailSettings::fromEnv.
    'mail' => array_combine($mailKeys, array_map($raw, $mailKeys)),

    // ── Progreso, biblioteca, pulso y admin ──
    'progress_max_kb' => $num('PROGRESS_MAX_KB', 512),
    'shared_readings_max' => $num('SHARED_READINGS_MAX', 120),
    'pulse_enabled' => $raw('PULSE_ENABLED') !== 'false',
    'admin_token' => $raw('ADMIN_TOKEN') ?? '',
    // Índice de contenido exportado del front (npm run content:export).
    'content_dir' => resource_path('content'),
    // db/schema.sql hasta que la fase 6 lo mueva a backend/database/ (op=schema de admin).
    'schema_sql' => base_path('../db/schema.sql'),

    // ── Proveedor de IA (la clave nunca sale del servidor) ──
    'deepseek_url' => ($raw('DEEPSEEK_URL') ?? '') ?: 'https://api.deepseek.com/chat/completions',
    'deepseek_api_key' => $raw('DEEPSEEK_API_KEY') ?? '',

    // ── Cuota de IA (`limits()` y precios de _quota.mts) ──
    'quota' => [
        'anon_lifetime' => $num('QUOTA_ANON_LIFETIME', 15),
        'anon_window' => strtolower($raw('QUOTA_ANON_WINDOW') ?? '') === 'dia' ? 'dia' : 'total',
        'anon_daily' => $num('QUOTA_ANON_DAILY', 20),
        'anon_ip_window_days' => $num('QUOTA_ANON_IP_WINDOW_DAYS', 30),
        'user_daily' => $num('QUOTA_USER_DAILY', 60),
        'user_monthly' => $num('QUOTA_USER_MONTHLY', 900),
        'global_daily' => $num('QUOTA_GLOBAL_DAILY', 6000),
        'per_minute' => $num('QUOTA_PER_MINUTE', 6),
        'max_tokens' => $num('AI_MAX_TOKENS', 2048),
        'credit_micros' => max(1, $num('QUOTA_CREDIT_MICROS', 500)),
        // `Math.max(0, Number(v ?? 3) || 0)`.
        'global_daily_usd' => max(0.0, JsNumber::number($raw('QUOTA_GLOBAL_DAILY_USD') ?? '3') ?? 0.0),
        // `precioNum`: número finito ≥ 0 o el defecto.
        'prices' => array_map(
            static function (array $p) use ($raw): array {
                $read = static function (string $name, float $def) use ($raw): float {
                    $v = JsNumber::number($raw($name));

                    return $v !== null && is_finite($v) && $v >= 0 ? $v : $def;
                };

                return ['in' => $read($p[0], $p[1]), 'out' => $read($p[2], $p[3])];
            },
            [
                'deepseek-chat' => ['PRICE_CHAT_IN', 0.27, 'PRICE_CHAT_OUT', 1.10],
                'deepseek-reasoner' => ['PRICE_REASONER_IN', 0.55, 'PRICE_REASONER_OUT', 2.19],
            ],
        ),
    ],
];
