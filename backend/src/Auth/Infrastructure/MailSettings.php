<?php

namespace Ruta\Auth\Infrastructure;

/**
 * Variables de correo de la API Node (`MAIL_PROVIDER`, `MAIL_FROM`, `SMTP_*`,
 * `RESEND_API_KEY`, `POSTMARK_TOKEN`, `MAILBOX_URL`), leídas con su misma semántica.
 * No se usan las `MAIL_*` de Laravel.
 */
final class MailSettings
{
    private function __construct(
        public readonly string $provider,
        public readonly string $from,
        public readonly string $smtpHost,
        public readonly int $smtpPort,
        public readonly string $smtpUser,
        public readonly string $smtpPass,
        public readonly bool $smtpSecure,
        public readonly bool $smtpInsecure,
        public readonly string $resendApiKey,
        public readonly string $postmarkToken,
        public readonly string $mailboxUrl,
    ) {}

    /**
     * @param  array<string, string|null>  $env  valores en texto, como `process.env`
     */
    public static function fromEnv(array $env): self
    {
        $get = fn (string $k): string => $env[$k] ?? '';
        // `Number(SMTP_PORT || 1025)`.
        $port = $get('SMTP_PORT') === '' ? 1025 : (int) $get('SMTP_PORT');

        return new self(
            provider: strtolower($get('MAIL_PROVIDER') !== '' ? $get('MAIL_PROVIDER') : 'log'),
            from: $get('MAIL_FROM') !== '' ? $get('MAIL_FROM') : LoginEmail::DEFAULT_FROM,
            smtpHost: $get('SMTP_HOST'),
            smtpPort: $port,
            smtpUser: $get('SMTP_USER'),
            smtpPass: $get('SMTP_PASS'),
            smtpSecure: $get('SMTP_SECURE') === 'true',
            smtpInsecure: $get('SMTP_INSECURE') === 'true',
            resendApiKey: $get('RESEND_API_KEY'),
            postmarkToken: $get('POSTMARK_TOKEN'),
            mailboxUrl: $get('MAILBOX_URL'),
        );
    }
}
