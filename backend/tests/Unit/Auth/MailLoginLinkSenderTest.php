<?php

namespace Tests\Unit\Auth;

use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Log\AbstractLogger;
use Ruta\Auth\Infrastructure\LoginEmail;
use Ruta\Auth\Infrastructure\MailLoginLinkSender;
use Ruta\Auth\Infrastructure\MailSettings;
use RuntimeException;
use Stringable;

/** `sendLoginLink` y `deliveryMode` de _mail.mts: proveedor por MAIL_PROVIDER. */
final class MailLoginLinkSenderTest extends TestCase
{
    private const LINK = 'http://localhost:8080/api/auth/verify?token=abc';

    /** @var list<array{level: string, message: string}> */
    private array $logged = [];

    private Factory $http;

    protected function setUp(): void
    {
        $this->http = new Factory;
    }

    /** @param array<string, string|null> $env */
    private function sender(array $env, bool $logAllowed = true): MailLoginLinkSender
    {
        $test = $this;
        $log = new class($test) extends AbstractLogger
        {
            public function __construct(private readonly MailLoginLinkSenderTest $test) {}

            public function log($level, string|Stringable $message, array $context = []): void
            {
                $this->test->record((string) $level, (string) $message);
            }
        };

        return new MailLoginLinkSender(MailSettings::fromEnv($env), $this->http, $log, $logAllowed);
    }

    /**
     * Seguridad: el proveedor `log` escribe el enlace (un token de acceso vivo) en el log.
     * Fuera de local/testing se niega, también cuando MAIL_PROVIDER no está definida
     * (su valor por defecto es `log`). Diferencia deliberada con la API Node.
     */
    public function test_log_provider_fails_closed_outside_local_and_testing(): void
    {
        $this->http->fake();
        foreach ([['MAIL_PROVIDER' => 'log'], []] as $env) {
            try {
                $this->sender($env, logAllowed: false)->send('ana@example.com', self::LINK, 15);
                $this->fail('debía negarse');
            } catch (RuntimeException $e) {
                $this->assertStringNotContainsString('token=', $e->getMessage());
            }
        }
        foreach ($this->logged as $entry) {
            $this->assertStringNotContainsString(self::LINK, $entry['message']);
        }
        $this->http->assertNothingSent();
    }

    public function record(string $level, string $message): void
    {
        $this->logged[] = ['level' => $level, 'message' => $message];
    }

    public function test_log_provider_writes_the_link_to_the_log_and_sends_nothing(): void
    {
        $this->http->fake();
        $this->sender(['MAIL_PROVIDER' => 'log'])->send('ana@example.com', self::LINK, 15);

        $this->assertSame([['level' => 'warning', 'message' => '[mail:log] Para ana@example.com · enlace: '.self::LINK]], $this->logged);
        $this->http->assertNothingSent();
    }

    public function test_provider_defaults_to_log_and_is_case_insensitive(): void
    {
        $this->http->fake();
        $this->sender([])->send('ana@example.com', self::LINK, 15);
        $this->sender(['MAIL_PROVIDER' => 'LOG'])->send('ana@example.com', self::LINK, 15);
        $this->assertCount(2, $this->logged);
    }

    public function test_resend_posts_the_same_json_as_node(): void
    {
        $this->http->fake(['api.resend.com/*' => Factory::response('{}', 200)]);
        $this->sender(['MAIL_PROVIDER' => 'resend', 'RESEND_API_KEY' => 're_key', 'MAIL_FROM' => 'Ruta <a@b.example>'])
            ->send('ana@example.com', self::LINK, 15);

        $mail = LoginEmail::compose(self::LINK, 15);
        $this->http->assertSent(function (Request $r) use ($mail) {
            return $r->method() === 'POST'
                && $r->url() === 'https://api.resend.com/emails'
                && $r->header('Authorization') === ['Bearer re_key']
                && $r->body() === json_encode(
                    ['from' => 'Ruta <a@b.example>', 'to' => ['ana@example.com'], 'subject' => $mail->subject, 'html' => $mail->html, 'text' => $mail->text],
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                );
        });
    }

    public function test_postmark_posts_the_same_json_as_node(): void
    {
        $this->http->fake(['api.postmarkapp.com/*' => Factory::response('{}', 200)]);
        $this->sender(['MAIL_PROVIDER' => 'postmark', 'POSTMARK_TOKEN' => 'pm'])->send('ana@example.com', self::LINK, 15);

        $mail = LoginEmail::compose(self::LINK, 15);
        $this->http->assertSent(fn (Request $r) => $r->url() === 'https://api.postmarkapp.com/email'
            && $r->header('X-Postmark-Server-Token') === ['pm']
            && $r->header('Accept') === ['application/json']
            && $r->data() === [
                'From' => LoginEmail::DEFAULT_FROM, 'To' => 'ana@example.com', 'Subject' => $mail->subject,
                'HtmlBody' => $mail->html, 'TextBody' => $mail->text, 'MessageStream' => 'outbound',
            ]);
    }

    public function test_a_rejected_http_provider_throws(): void
    {
        $this->http->fake(['api.resend.com/*' => Factory::response('nope', 422)]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('resend: 422 nope');
        $this->sender(['MAIL_PROVIDER' => 'resend'])->send('ana@example.com', self::LINK, 15);
    }

    public function test_unknown_provider_throws(): void
    {
        $this->expectExceptionMessage('MAIL_PROVIDER desconocido: carta');
        $this->sender(['MAIL_PROVIDER' => 'carta'])->send('ana@example.com', self::LINK, 15);
    }

    /** @return array<string, array{array<string, string|null>, string}> */
    public static function dsns(): array
    {
        return [
            'defaults' => [[], 'smtp://localhost:1025'],
            'mailpit' => [['SMTP_HOST' => 'mailpit', 'SMTP_PORT' => '1025'], 'smtp://mailpit:1025'],
            'auth' => [['SMTP_HOST' => 'smtp.example', 'SMTP_PORT' => '587', 'SMTP_USER' => 'u@x', 'SMTP_PASS' => 'p:/w'], 'smtp://u%40x:p%3A%2Fw@smtp.example:587'],
            'user without pass' => [['SMTP_HOST' => 'h', 'SMTP_USER' => 'u'], 'smtp://u:@h:1025'],
            'secure' => [['SMTP_HOST' => 'h', 'SMTP_PORT' => '465', 'SMTP_SECURE' => 'true'], 'smtps://h:465'],
            'insecure' => [['SMTP_HOST' => 'h', 'SMTP_INSECURE' => 'true'], 'smtp://h:1025?verify_peer=0'],
        ];
    }

    /** @param array<string, string|null> $env */
    #[DataProvider('dsns')]
    public function test_smtp_dsn_is_built_from_smtp_vars(array $env, string $dsn): void
    {
        $this->assertSame($dsn, $this->sender(['MAIL_PROVIDER' => 'smtp', ...$env])->smtpDsn());
    }

    /** @return array<string, array{array<string, string|null>, string, ?string}> */
    public static function deliveries(): array
    {
        return [
            'log' => [[], 'mailbox', 'http://localhost:8025'],
            'log with mailbox url' => [['MAILBOX_URL' => 'http://buzon:9'], 'mailbox', 'http://buzon:9'],
            'smtp mailpit' => [['MAIL_PROVIDER' => 'smtp', 'SMTP_HOST' => 'Mailpit'], 'mailbox', 'http://localhost:8025'],
            'smtp 127.0.0.1' => [['MAIL_PROVIDER' => 'smtp', 'SMTP_HOST' => '127.0.0.1'], 'mailbox', 'http://localhost:8025'],
            'smtp without host' => [['MAIL_PROVIDER' => 'smtp'], 'email', null],
            'smtp real' => [['MAIL_PROVIDER' => 'smtp', 'SMTP_HOST' => 'smtp.example'], 'email', null],
            'resend' => [['MAIL_PROVIDER' => 'resend', 'SMTP_HOST' => 'mailpit'], 'email', null],
        ];
    }

    /** @param array<string, string|null> $env */
    #[DataProvider('deliveries')]
    public function test_delivery_mode(array $env, string $mode, ?string $mailboxUrl): void
    {
        $delivery = $this->sender($env)->delivery();
        $this->assertSame($mode, $delivery->mode);
        $this->assertSame($mailboxUrl, $delivery->mailboxUrl);
    }
}
