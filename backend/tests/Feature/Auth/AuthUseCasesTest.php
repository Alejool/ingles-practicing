<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Ruta\Auth\Application\Logout;
use Ruta\Auth\Application\RequestLoginLink;
use Ruta\Auth\Application\RequestLoginLinkCommand;
use Ruta\Auth\Application\ResolveSession;
use Ruta\Auth\Application\VerifyLoginLink;
use Ruta\Auth\Domain\Email;
use Ruta\Auth\Domain\LoginLinkSender;
use Ruta\Auth\Infrastructure\AuthRepository;
use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\Hashing;
use Tests\Support\RecordingLinkSender;
use Tests\TestCase;

/**
 * Casos de uso de Auth contra Postgres (`ruta_test`). Cada test corre en una
 * transacción que se deshace: no queda ninguna fila.
 */
final class AuthUseCasesTest extends TestCase
{
    use DatabaseTransactions;

    private RecordingLinkSender $mail;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'ruta.app_url' => 'http://app.test',
            'ruta.return_to_origins' => 'https://permitido.example',
            'ruta.accounts_enabled' => true,
            'ruta.login_link_minutes' => 15,
            'ruta.login_max_per_email_hour' => 4,
            'ruta.login_max_per_ip_hour' => 12,
            'ruta.session_days' => 60,
        ]);
        $this->mail = new RecordingLinkSender;
        $this->app->instance(LoginLinkSender::class, $this->mail);
    }

    private function request(string $email, string $ipHash = 'ip-a', ?string $origin = null): void
    {
        app(RequestLoginLink::class)->handle(new RequestLoginLinkCommand(Email::fromRaw($email), $ipHash, $origin));
    }

    private function assertDomainError(string $code, callable $fn, ?string $message = null): void
    {
        try {
            $fn();
            $this->fail("debía lanzar $code");
        } catch (DomainError $e) {
            $this->assertSame($code, $e->errorCode);
            if ($message !== null) {
                $this->assertSame($message, $e->getMessage());
            }
        }
    }

    /* ───────── RequestLoginLink ───────── */

    public function test_request_stores_a_hashed_token_and_sends_the_link(): void
    {
        $result = app(RequestLoginLink::class)->handle(
            new RequestLoginLinkCommand(Email::fromRaw('ana@example.com'), 'ip-a', 'https://permitido.example/x'),
        );

        $this->assertSame(15, $result->minutes);
        $this->assertSame('mailbox', $result->delivery->mode);
        $token = $this->mail->lastToken();
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $token);
        $this->assertSame("https://permitido.example/api/auth/verify?token=$token", $this->mail->sent[0]['link']);
        $this->assertSame(15, $this->mail->sent[0]['minutes']);

        $row = DB::selectOne(
            "select email, ip_hash, return_to, used_at, round(extract(epoch from (expires_at - created_at)))::int as s
               from login_tokens where token_hash = ?", [Hashing::sha256Hex($token)]);
        $this->assertNotNull($row);
        $this->assertSame(['ana@example.com', 'ip-a', 'https://permitido.example', null, 900],
            [$row->email, $row->ip_hash, $row->return_to, $row->used_at, $row->s]);
    }

    public function test_without_return_to_the_link_uses_app_url_without_trailing_slashes(): void
    {
        config(['ruta.app_url' => 'http://app.test//']);
        $this->request('ana@example.com', origin: 'https://ajeno.example');
        $this->assertStringStartsWith('http://app.test/api/auth/verify?token=', $this->mail->sent[0]['link']);
    }

    public function test_fifth_link_for_an_email_in_an_hour_is_rejected_without_writing(): void
    {
        for ($i = 0; $i < 4; $i++) {
            $this->request('ana@example.com', "ip-$i");
        }
        $this->assertDomainError('too_many_links', fn () => $this->request('ana@example.com', 'ip-9'),
            'Se han pedido demasiados enlaces. Espera una hora.');
        $this->assertSame(4, DB::scalar("select count(*)::int from login_tokens where email = 'ana@example.com'"));
        $this->assertCount(4, $this->mail->sent);
    }

    public function test_thirteenth_link_from_an_ip_in_an_hour_is_rejected(): void
    {
        for ($i = 0; $i < 12; $i++) {
            $this->request("u$i@example.com", 'ip-same');
        }
        $this->assertDomainError('too_many_links', fn () => $this->request('otra@example.com', 'ip-same'));
    }

    public function test_links_older_than_an_hour_do_not_count(): void
    {
        for ($i = 0; $i < 4; $i++) {
            DB::insert("insert into login_tokens (email, token_hash, expires_at, ip_hash, created_at)
                        values ('ana@example.com', ?, now(), 'ip-x', now() - interval '61 minutes')", ["viejo-$i"]);
        }
        $this->request('ana@example.com');
        $this->assertCount(1, $this->mail->sent);
    }

    public function test_limits_come_from_config(): void
    {
        config(['ruta.login_max_per_email_hour' => 1]);
        $this->request('ana@example.com');
        $this->assertDomainError('too_many_links', fn () => $this->request('ana@example.com'));
    }

    public function test_a_failed_send_is_mail_failed_and_keeps_the_token(): void
    {
        $this->mail->fail = true;
        $this->assertDomainError('mail_failed', fn () => $this->request('ana@example.com'),
            'No se pudo enviar el correo. Inténtalo en un momento.');
        $this->assertSame(1, DB::scalar("select count(*)::int from login_tokens where email = 'ana@example.com'"));
    }

    public function test_tokens_expired_more_than_a_day_ago_are_cleaned_up(): void
    {
        DB::insert("insert into login_tokens (email, token_hash, expires_at, ip_hash)
                    values ('vieja@example.com', 'caducado-hace-dias', now() - interval '25 hours', 'ip-x'),
                           ('reciente@example.com', 'caducado-hace-poco', now() - interval '23 hours', 'ip-x')");
        $this->request('ana@example.com');
        $left = DB::select("select token_hash from login_tokens where token_hash like 'caducado-%'");
        $this->assertSame(['caducado-hace-poco'], array_map(fn ($r) => $r->token_hash, $left));
    }

    public function test_accounts_off_is_reported_with_the_node_message(): void
    {
        config(['ruta.accounts_enabled' => false]);
        $this->assertDomainError('accounts_off', fn () => app(RequestLoginLink::class)->assertAccountsEnabled(),
            'Esta instalación no usa cuentas: se estudia sin registrarse y el progreso se guarda en tu dispositivo.');
    }

    /* ───────── VerifyLoginLink ───────── */

    public function test_verify_without_token_is_error(): void
    {
        $this->assertSame('http://app.test/#auth=error', app(VerifyLoginLink::class)->handle('', null));
    }

    public function test_verify_unknown_token_is_expired(): void
    {
        $this->assertSame('http://app.test/#auth=expired', app(VerifyLoginLink::class)->handle('nada', null));
    }

    public function test_verify_expired_token_is_expired(): void
    {
        DB::insert("insert into login_tokens (email, token_hash, expires_at, ip_hash)
                    values ('ana@example.com', ?, now() - interval '1 second', 'ip-x')", [Hashing::sha256Hex('caducado')]);
        $this->assertSame('http://app.test/#auth=expired', app(VerifyLoginLink::class)->handle('caducado', null));
    }

    public function test_verify_creates_user_and_session_marks_the_link_used_and_returns_to_its_origin(): void
    {
        $this->request('ana@example.com', origin: 'https://permitido.example');
        $location = app(VerifyLoginLink::class)->handle($this->mail->lastToken(), str_repeat('u', 400));

        $this->assertMatchesRegularExpression('~^https://permitido\.example/#auth=[A-Za-z0-9_-]{43}$~', $location);
        $session = substr($location, strpos($location, '#auth=') + 6);
        $row = DB::selectOne(
            "select u.email, u.last_seen_at, s.user_agent, round(extract(epoch from (s.expires_at - s.created_at)) / 86400)::int as days
               from sessions s join users u on u.id = s.user_id where s.token_hash = ?", [Hashing::sha256Hex($session)]);
        $this->assertSame('ana@example.com', $row->email);
        $this->assertNull($row->last_seen_at);
        $this->assertSame(str_repeat('u', 300), $row->user_agent);
        $this->assertSame(60, $row->days);
        $this->assertNotNull(DB::scalar('select used_at from login_tokens where token_hash = ?', [Hashing::sha256Hex($this->mail->lastToken())]));

        $this->assertSame('http://app.test/#auth=expired', app(VerifyLoginLink::class)->handle($this->mail->lastToken(), null));
    }

    /**
     * Consumir el enlace es una sola sentencia: dos verificaciones simultáneas del mismo
     * token no pueden abrir dos sesiones (la segunda no encuentra nada que consumir).
     */
    public function test_consuming_a_link_is_atomic_and_only_once(): void
    {
        $this->request('ana@example.com', origin: 'https://permitido.example');
        $hash = Hashing::sha256Hex($this->mail->lastToken());
        $repo = app(AuthRepository::class);

        $first = $repo->consumeLoginToken($hash);
        $this->assertSame(['email' => 'ana@example.com', 'returnTo' => 'https://permitido.example'],
            ['email' => $first['email'] ?? null, 'returnTo' => $first['returnTo'] ?? null]);
        $this->assertNull($repo->consumeLoginToken($hash));
        $this->assertNotNull(DB::scalar('select used_at from login_tokens where token_hash = ?', [$hash]));
    }

    public function test_consuming_an_expired_link_returns_null_and_leaves_it_unused(): void
    {
        DB::insert("insert into login_tokens (email, token_hash, expires_at, ip_hash)
                    values ('ana@example.com', 'caducado-atomico', now() - interval '1 second', 'ip-x')");
        $this->assertNull(app(AuthRepository::class)->consumeLoginToken('caducado-atomico'));
        $this->assertNull(DB::scalar("select used_at from login_tokens where token_hash = 'caducado-atomico'"));
    }

    public function test_verify_twice_for_one_email_upserts_the_user(): void
    {
        $this->request('ana@example.com');
        $first = $this->mail->lastToken();
        $this->request('ana@example.com');
        app(VerifyLoginLink::class)->handle($first, null);
        app(VerifyLoginLink::class)->handle($this->mail->lastToken(), null);

        $users = DB::select("select id, last_seen_at from users where email = 'ana@example.com'");
        $this->assertCount(1, $users);
        $this->assertNotNull($users[0]->last_seen_at);
        $this->assertSame(2, DB::scalar('select count(*)::int from sessions where user_id = ?', [$users[0]->id]));
        $this->assertSame('', DB::scalar('select user_agent from sessions where user_id = ? limit 1', [$users[0]->id]));
    }

    public function test_session_days_come_from_config(): void
    {
        config(['ruta.session_days' => 7]);
        $this->request('ana@example.com');
        $location = app(VerifyLoginLink::class)->handle($this->mail->lastToken(), null);
        $hash = Hashing::sha256Hex(substr($location, strpos($location, '#auth=') + 6));
        $this->assertSame(7, DB::scalar(
            'select round(extract(epoch from (expires_at - created_at)) / 86400)::int from sessions where token_hash = ?', [$hash]));
    }

    public function test_without_app_url_the_redirect_is_relative(): void
    {
        config(['ruta.app_url' => '']);
        $this->assertSame('/#auth=error', app(VerifyLoginLink::class)->handle('', null));
    }

    /* ───────── ResolveSession y Logout ───────── */

    private function sessionFor(string $email): string
    {
        $this->request($email);
        $location = app(VerifyLoginLink::class)->handle($this->mail->lastToken(), null);

        return substr($location, strpos($location, '#auth=') + 6);
    }

    public function test_resolve_without_or_with_unknown_token_is_anonymous(): void
    {
        $this->assertNull(app(ResolveSession::class)->handle(null));
        $this->assertNull(app(ResolveSession::class)->handle('no-existe'));
    }

    public function test_resolve_returns_the_user_and_touches_session_and_user(): void
    {
        $token = $this->sessionFor('ana@example.com');
        DB::update("update sessions set last_used_at = now() - interval '1 day' where token_hash = ?", [Hashing::sha256Hex($token)]);

        $user = app(ResolveSession::class)->handle($token);

        $this->assertNotNull($user);
        $this->assertSame('ana@example.com', $user->email);
        $this->assertSame(0, $user->dailyBonus);
        $this->assertFalse($user->blocked);
        $row = DB::selectOne("select s.last_used_at > now() - interval '1 minute' as fresh, u.last_seen_at
                                from sessions s join users u on u.id = s.user_id where s.token_hash = ?", [Hashing::sha256Hex($token)]);
        $this->assertTrue($row->fresh);
        $this->assertNotNull($row->last_seen_at);
    }

    public function test_expired_session_is_anonymous(): void
    {
        $token = $this->sessionFor('ana@example.com');
        DB::update("update sessions set expires_at = now() - interval '1 second' where token_hash = ?", [Hashing::sha256Hex($token)]);
        $this->assertNull(app(ResolveSession::class)->handle($token));
    }

    public function test_blocked_user_is_account_blocked(): void
    {
        $token = $this->sessionFor('ana@example.com');
        DB::update("update users set blocked = true where email = 'ana@example.com'");
        $this->assertDomainError('account_blocked', fn () => app(ResolveSession::class)->handle($token), 'Esta cuenta está bloqueada.');
    }

    public function test_require_without_session_is_not_authenticated(): void
    {
        $this->assertDomainError('not_authenticated', fn () => app(ResolveSession::class)->require(null), 'Inicia sesión para continuar.');
    }

    public function test_logout_deletes_only_that_session(): void
    {
        $one = $this->sessionFor('ana@example.com');
        $two = $this->sessionFor('ana@example.com');

        app(Logout::class)->handle($one);
        app(Logout::class)->handle(null);

        $this->assertNull(app(ResolveSession::class)->handle($one));
        $this->assertNotNull(app(ResolveSession::class)->handle($two));
    }
}
