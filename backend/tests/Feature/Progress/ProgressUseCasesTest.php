<?php

namespace Tests\Feature\Progress;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Progress\Application\GetProgress;
use Ruta\Progress\Application\PutProgress;
use Ruta\Progress\Application\PutProgressCommand;
use Ruta\Shared\Domain\DomainError;
use Tests\TestCase;

/** GetProgress / PutProgress contra Postgres (`ruta_test`), en transacciones que se deshacen. */
final class ProgressUseCasesTest extends TestCase
{
    use DatabaseTransactions;

    private const ISO = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/';

    private SessionUser $user;

    protected function setUp(): void
    {
        parent::setUp();
        $id = (string) DB::scalar("insert into users (email) values ('p@example.com') returning id");
        $this->user = new SessionUser($id, 'p@example.com', 0, false);
    }

    private static function data(string $json): \stdClass
    {
        $data = json_decode($json, false, flags: JSON_THROW_ON_ERROR);
        self::assertInstanceOf(\stdClass::class, $data);

        return $data;
    }

    /** @return array{version: int, updatedAt: string} */
    private function save(string $json, int|float $version = 0): array
    {
        $saved = app(PutProgress::class)->handle($this->user, new PutProgressCommand(self::data($json), $version));

        return ['version' => $saved->version, 'updatedAt' => $saved->updatedAt];
    }

    private function encodeGet(): string
    {
        return json_encode(app(GetProgress::class)->handle($this->user)->toArray(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public function test_nothing_saved(): void
    {
        $this->assertSame('{"data":null,"version":0,"updatedAt":null}', $this->encodeGet());
    }

    public function test_first_put_creates_version_one_whatever_version_was_sent(): void
    {
        $saved = $this->save('{"a":1}', 7);
        $this->assertSame(1, $saved['version']);
        $this->assertMatchesRegularExpression(self::ISO, $saved['updatedAt']);
        $this->assertSame('{"data":{"a":1},"version":1,"updatedAt":"'.$saved['updatedAt'].'"}', $this->encodeGet());
    }

    public function test_put_with_the_right_version_increments(): void
    {
        $this->save('{"n":1}');
        $this->assertSame(2, $this->save('{"n":2}', 1)['version']);
        $this->assertSame(3, $this->save('{"n":3}', 2)['version']);
        $this->assertStringContainsString('"data":{"n":3}', $this->encodeGet());
    }

    public function test_stale_version_is_a_conflict_with_the_server_copy(): void
    {
        $this->save('{"n":1}');
        $v2 = $this->save('{"n":2}', 1);
        try {
            $this->save('{"n":99}', 1);
            $this->fail('debía haber conflicto');
        } catch (DomainError $e) {
            $this->assertSame('version_conflict', $e->errorCode);
            $this->assertSame('Hay una versión más reciente en el servidor.', $e->getMessage());
            $this->assertSame('{"server":{"data":{"n":2},"version":2,"updatedAt":"'.$v2['updatedAt'].'"}}',
                json_encode($e->extra, JSON_UNESCAPED_SLASHES));
        }
    }

    public function test_a_fractional_version_never_matches(): void
    {
        $this->save('{"n":1}');
        $this->expectException(DomainError::class);
        $this->save('{"n":2}', 1.5);
    }

    public function test_data_comes_back_identical(): void
    {
        $this->save('{"vacio":{},"lista":[],"cero":0.0,"decimal":1.5,"texto":"ñandú «ü» → 😀","ruta":"a/b/c","anidado":{"dias":[{"hecho":true,"nota":null}]}}');
        $out = $this->encodeGet();
        $this->assertStringContainsString('"vacio":{}', $out);
        $this->assertStringContainsString('"lista":[]', $out);
        $this->assertStringContainsString('"cero":0,', $out);
        $this->assertStringContainsString('"decimal":1.5', $out);
        $this->assertStringContainsString('"texto":"ñandú «ü» → 😀"', $out);
        $this->assertStringContainsString('"ruta":"a/b/c"', $out);
        $this->assertStringContainsString('"anidado":{"dias":[{"nota":null,"hecho":true}]}', $out, 'orden de claves de jsonb, como Node');
    }

    public function test_updated_at_is_utc_iso_with_milliseconds_even_with_another_session_timezone(): void
    {
        DB::statement("set local timezone to 'America/Bogota'");
        $saved = $this->save('{"a":1}');
        $this->assertMatchesRegularExpression(self::ISO, $saved['updatedAt']);
        $utc = (string) DB::scalar("select to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from progress where user_id = ?", [$this->user->id]);
        $this->assertSame($utc, $saved['updatedAt']);
    }
}
