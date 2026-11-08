<?php

namespace Ruta\Auth\Infrastructure;

use Illuminate\Http\Client\Factory;
use Psr\Log\LoggerInterface;
use Ruta\Auth\Domain\Delivery;
use Ruta\Auth\Domain\LoginLinkSender;
use RuntimeException;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email as MimeEmail;

/**
 * Envío del enlace mágico como `sendLoginLink` de _mail.mts, según MAIL_PROVIDER:
 *   log      → no envía y escribe el enlace en el log (solo local/testing; fuera, falla)
 *   smtp     → servidor propio o Mailpit (Symfony Mailer)
 *   resend   → API HTTP de Resend
 *   postmark → API HTTP de Postmark
 */
final class MailLoginLinkSender implements LoginLinkSender
{
    private const LOCAL_SMTP_HOSTS = ['mailpit', 'mailhog', 'localhost', '127.0.0.1', 'maildev'];

    private const DEFAULT_MAILBOX_URL = 'http://localhost:8025';

    /**
     * @param  bool  $logAllowed  solo en local/testing: el proveedor `log` escribe un token de acceso vivo
     */
    public function __construct(
        private readonly MailSettings $settings,
        private readonly Factory $http,
        private readonly LoggerInterface $log,
        private readonly bool $logAllowed,
    ) {}

    public function send(string $to, string $link, int $minutes): void
    {
        $mail = LoginEmail::compose($link, $minutes);

        match ($this->settings->provider) {
            'log' => $this->logLink($to, $link),
            'resend' => $this->resend($to, $mail),
            'postmark' => $this->postmark($to, $mail),
            'smtp' => $this->smtp($to, $mail),
            default => throw new RuntimeException('MAIL_PROVIDER desconocido: '.$this->settings->provider),
        };
    }

    public function delivery(): Delivery
    {
        $host = strtolower($this->settings->smtpHost);
        $local = false;
        foreach (self::LOCAL_SMTP_HOSTS as $h) {
            $local = $local || str_contains($host, $h);
        }
        $provider = $this->settings->provider;
        if ($provider === 'log' || ($provider === 'smtp' && $local)) {
            return Delivery::mailbox($this->settings->mailboxUrl !== '' ? $this->settings->mailboxUrl : self::DEFAULT_MAILBOX_URL);
        }

        return Delivery::email();
    }

    /**
     * Proveedor de desarrollo. Fuera de local/testing se niega (también cuando MAIL_PROVIDER
     * falta, porque su defecto es `log`): el enlace es una credencial y no debe acabar en
     * los logs de producción. La API Node lo escribía siempre; diferencia deliberada.
     */
    private function logLink(string $to, string $link): void
    {
        if (! $this->logAllowed) {
            throw new RuntimeException('MAIL_PROVIDER=log solo se permite en local y testing: configura smtp, resend o postmark.');
        }
        // Nivel warning: con LOG_LEVEL=warning (el de Docker) un info no se vería.
        $this->log->warning("[mail:log] Para {$to} · enlace: {$link}");
    }

    /** DSN de Symfony Mailer equivalente a la configuración de nodemailer de _mail.mts. */
    public function smtpDsn(): string
    {
        $s = $this->settings;
        $auth = $s->smtpUser !== '' ? rawurlencode($s->smtpUser).':'.rawurlencode($s->smtpPass).'@' : '';
        $host = $s->smtpHost !== '' ? $s->smtpHost : 'localhost';
        $query = $s->smtpInsecure ? '?verify_peer=0' : '';

        return ($s->smtpSecure ? 'smtps' : 'smtp')."://{$auth}{$host}:{$s->smtpPort}{$query}";
    }

    private function smtp(string $to, LoginEmail $mail): void
    {
        $message = (new MimeEmail)
            ->from(Address::create($this->settings->from))
            ->to($to)
            ->subject($mail->subject)
            ->text($mail->text)
            ->html($mail->html);

        (new Mailer(Transport::fromDsn($this->smtpDsn())))->send($message);
    }

    private function resend(string $to, LoginEmail $mail): void
    {
        $res = $this->http
            ->withToken($this->settings->resendApiKey)
            ->withBody($this->encode([
                'from' => $this->settings->from, 'to' => [$to], 'subject' => $mail->subject, 'html' => $mail->html, 'text' => $mail->text,
            ]))
            ->post('https://api.resend.com/emails');
        if (! $res->successful()) {
            throw new RuntimeException('resend: '.$res->status().' '.mb_substr($res->body(), 0, 300));
        }
    }

    private function postmark(string $to, LoginEmail $mail): void
    {
        $res = $this->http
            ->withHeaders(['Accept' => 'application/json', 'X-Postmark-Server-Token' => $this->settings->postmarkToken])
            ->withBody($this->encode([
                'From' => $this->settings->from, 'To' => $to, 'Subject' => $mail->subject,
                'HtmlBody' => $mail->html, 'TextBody' => $mail->text, 'MessageStream' => 'outbound',
            ]))
            ->post('https://api.postmarkapp.com/email');
        if (! $res->successful()) {
            throw new RuntimeException('postmark: '.$res->status().' '.mb_substr($res->body(), 0, 300));
        }
    }

    /** @param array<string, mixed> $body */
    private function encode(array $body): string
    {
        return json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
