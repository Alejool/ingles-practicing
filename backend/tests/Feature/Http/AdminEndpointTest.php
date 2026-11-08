<?php

namespace Tests\Feature\Http;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Ruta\Shared\Domain\Hashing;
use Tests\TestCase;

/**
 * /api/admin contra Postgres (`ruta_test`), en transacciones que se deshacen: también
 * `op=schema` (DDL idempotente) y `op=cleanup-test` (sus borrados no se confirman).
 * `/healthz` 503 con la base caída lo cubre HealthControllerTest.
 */
final class AdminEndpointTest extends TestCase
{
    use DatabaseTransactions;

    private const TOKEN = 'token-admin-de-prueba';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'ruta.admin_token' => self::TOKEN, 'ruta.ip_pepper' => 'pimienta',
            'ruta.quota.credit_micros' => 500, 'ruta.quota.global_daily_usd' => 3.0, 'ruta.quota.global_daily' => 6000,
            'ruta.quota.user_daily' => 60, 'ruta.quota.anon_lifetime' => 15,
        ]);
    }

    private function admin(string $method = 'GET', string $query = '', array $server = []): TestResponse
    {
        return $this->call($method, '/api/admin?token='.self::TOKEN.$query, server: $server);
    }

    private function assertError(TestResponse $r, int $status, string $code, string $message): void
    {
        $r->assertStatus($status);
        $this->assertSame(json_encode(['error' => ['code' => $code, 'message' => $message]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $r->getContent());
    }

    private function reading(string $id, string $title): void
    {
        DB::insert("insert into shared_readings (id, track, level, title, data) values (?, 'b1b2', 'B2', ?, '{}')", [$id, $title]);
    }

    public function test_without_admin_token_the_endpoint_does_not_exist(): void
    {
        config(['ruta.admin_token' => '']);
        $this->assertError($this->call('GET', '/api/admin?token='), 404, 'not_found', 'No disponible.');
    }

    public function test_wrong_or_missing_token_is_forbidden(): void
    {
        $this->assertError($this->call('GET', '/api/admin'), 403, 'forbidden', 'Token de administración incorrecto.');
        $this->assertError($this->call('GET', '/api/admin?token=malo'), 403, 'forbidden', 'Token de administración incorrecto.');
        $this->assertError($this->call('POST', '/api/admin?op=schema'), 403, 'forbidden', 'Token de administración incorrecto.');
    }

    public function test_bearer_works_and_the_query_wins(): void
    {
        $this->call('GET', '/api/admin', server: ['HTTP_AUTHORIZATION' => 'Bearer '.self::TOKEN])->assertOk();
        $this->call('GET', '/api/admin?token=malo', server: ['HTTP_AUTHORIZATION' => 'Bearer '.self::TOKEN])->assertStatus(403);
    }

    public function test_report_keys_and_types(): void
    {
        $user = (string) DB::scalar("insert into users (email) values ('admin-informe@example.com') returning id");
        DB::insert("insert into ai_usage (user_id, device_id, ip_hash, kind, model, prompt_tokens, completion_tokens, cost_micros)
                    values (?, 'd', 'ip', 'test', 'deepseek-chat', 10, 20, 1234)", [$user]);
        $this->reading('informe-1', 'Informe');
        DB::insert("insert into pulse (anon, track, plan_day, seen) values ('anon-informe', 'b1b2', 15, 'panel')");

        $r = $this->admin();
        $r->assertOk();
        $b = json_decode((string) $r->getContent(), true);
        $this->assertSame(['presupuesto', 'totales', 'por_dia', 'por_tipo', 'top_del_mes', 'uso', 'biblioteca'], array_keys($b));
        $this->assertSame(['credito_usd' => 0.0005, 'tope_diario_usd' => 3, 'tope_diario_creditos' => 6000,
            'creditos_dia_por_cuenta' => 60, 'creditos_prueba' => 15], $b['presupuesto']);
        $this->assertSame(['usuarios', 'hoy', 'usd_hoy', 'usd_mes', 'tokens_mes'], array_keys($b['totales']));
        $this->assertMatchesRegularExpression('/^\d+\.\d{4}$/', $b['totales']['usd_hoy']);

        $day = $b['por_dia'][0];
        $this->assertSame(['day', 'llamadas', 'personas', 'tokens_entrada', 'tokens_salida', 'usd', 'anonimas'], array_keys($day));
        $this->assertIsString($day['personas'], 'count(distinct) es bigint: Node lo da como cadena');
        $this->assertIsInt($day['llamadas']);
        $this->assertMatchesRegularExpression('/^\d+\.\d{4}$/', $b['por_tipo'][0]['usd']);
        $this->assertMatchesRegularExpression('/^\d+\.\d{5}$/', $b['por_tipo'][0]['usd_por_llamada']);
        $this->assertSame('admin-informe@example.com', $b['top_del_mes'][0]['email']);
        $this->assertSame(['resumen', 'embudo', 'modulos_abiertos'], array_keys($b['uso']));
        $this->assertSame(['track', 'tramo', 'personas', 'dias_hechos_medio', 'activos_7d'], array_keys($b['uso']['embudo'][0]));
        $this->assertSame(['modulo' => 'panel', 'personas' => 1], $b['uso']['modulos_abiertos'][0]);
        $this->assertSame(['id', 'track', 'level', 'topic', 'title', 'words', 'reads', 'hidden', 'dia', 'autor'], array_keys($b['biblioteca'][0]));
        $this->assertNull($b['biblioteca'][0]['autor']);
        $this->assertFalse($b['biblioteca'][0]['hidden']);
    }

    public function test_post_without_a_known_op_and_get_with_op_return_the_report(): void
    {
        foreach ([$this->admin('POST'), $this->admin('POST', '&op=otra'), $this->admin('GET', '&op=schema')] as $r) {
            $r->assertOk();
            $this->assertArrayHasKey('presupuesto', json_decode((string) $r->getContent(), true));
        }
    }

    public function test_schema_applies_schema_sql_and_counts_statements_like_migrate(): void
    {
        $r = $this->admin('POST', '&op=schema');
        $r->assertOk();
        $this->assertSame('{"ok":true,"message":"Esquema aplicado (21 sentencias)."}', $r->getContent());
    }

    public function test_schema_path_is_configurable_and_a_missing_file_is_schema_missing(): void
    {
        config(['ruta.schema_sql' => '/no/existe/schema.sql']);
        $r = $this->admin('POST', '&op=schema');
        $this->assertError($r, 500, 'schema_missing', 'No se encontró db/schema.sql en el despliegue.');
    }

    public function test_hide_and_show(): void
    {
        $this->assertError($this->admin('POST', '&op=hide'), 422, 'bad_id', 'Falta el id del texto.');
        $this->assertError($this->admin('POST', '&op=hide&id=%20%20'), 422, 'bad_id', 'Falta el id del texto.');
        $this->assertError($this->admin('POST', '&op=hide&id=no-existe'), 404, 'not_found', 'No hay ningún texto con ese id.');

        $this->reading('para-ocultar', 'Para ocultar');
        $this->assertSame('{"ok":true,"texto":{"id":"para-ocultar","title":"Para ocultar","hidden":true}}',
            $this->admin('POST', '&op=hide&id=%20para-ocultar%20')->getContent());
        $this->assertSame('{"ok":true,"texto":{"id":"para-ocultar","title":"Para ocultar","hidden":false}}',
            $this->admin('POST', '&op=hide&id=para-ocultar&show=1')->getContent());
        $this->assertStringContainsString('"hidden":true', (string) $this->admin('POST', '&op=hide&id=para-ocultar&show=true')->getContent());
    }

    public function test_cleanup_removes_only_smoke_data(): void
    {
        $smoke = (string) DB::scalar("insert into users (email) values ('x@smoke.test') returning id");
        DB::insert("insert into users (email) values ('x@normal.test')");
        DB::insert("insert into ai_usage (user_id, device_id, ip_hash, kind, model) values (null, 'smoke-1', 'ip', 'test', 'm'), (null, 'normal-1', 'ip', 'test', 'm')");
        DB::insert("insert into login_tokens (email, token_hash, expires_at) values ('x@smoke.test', 'limpieza-1', now()), ('x@normal.test', 'limpieza-2', now())");
        DB::insert('insert into pulse (anon, track) values (?, ?), (?, ?)',
            [Hashing::anonPulse('smoke-1', 'pimienta'), 'b1b2', Hashing::anonPulse('normal-1', 'pimienta'), 'b1b2']);
        $this->reading('smoke-lectura', 'Smoke contrato');
        $this->reading('normal-lectura', 'smoke en minúscula no cuenta');

        $r = $this->admin('POST', '&op=cleanup-test&dev=smoke-1');

        $r->assertOk();
        $this->assertSame('{"ok":true,"borrados":1,"pulsos":1,"lecturas":1}', $r->getContent());
        $this->assertSame(0, DB::scalar('select count(*)::int from users where id = ?', [$smoke]));
        $this->assertSame(1, DB::scalar("select count(*)::int from users where email = 'x@normal.test'"));
        $this->assertSame(['normal-1'], array_map(fn ($x) => $x->device_id, DB::select("select device_id from ai_usage where device_id in ('smoke-1', 'normal-1')")));
        $this->assertSame(1, DB::scalar("select count(*)::int from login_tokens where token_hash in ('limpieza-1', 'limpieza-2')"));
        $this->assertSame(1, DB::scalar('select count(*)::int from pulse where anon in (?, ?)',
            [Hashing::anonPulse('smoke-1', 'pimienta'), Hashing::anonPulse('normal-1', 'pimienta')]));
        $this->assertSame(['normal-lectura'], array_map(fn ($x) => $x->id, DB::select("select id from shared_readings where id in ('smoke-lectura', 'normal-lectura')")));
    }

    public function test_cleanup_without_dev_touches_no_pulse(): void
    {
        $this->assertStringContainsString('"pulsos":0', (string) $this->admin('POST', '&op=cleanup-test')->getContent());
    }
}
