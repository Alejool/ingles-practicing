<?php

namespace Tests\Feature\Pulse;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Ruta\Shared\Domain\Hashing;
use Tests\TestCase;

/** /api/pulse contra Postgres (`ruta_test`): apagado, sin dispositivo y upsert con `greatest`. */
final class RecordBeatTest extends TestCase
{
    use DatabaseTransactions;

    private const DEVICE = 'pulso-dispositivo-1';

    protected function setUp(): void
    {
        parent::setUp();
        config(['ruta.pulse_enabled' => true, 'ruta.ip_pepper' => 'pimienta']);
    }

    private function beat(string $body, ?string $device = self::DEVICE): \Illuminate\Testing\TestResponse
    {
        $server = $device !== null ? ['HTTP_X_DEVICE_ID' => $device] : [];

        return $this->call('POST', '/api/pulse', server: $server, content: $body);
    }

    private function row(): ?object
    {
        return DB::selectOne('select track, plan_day, done_days, streak, seen from pulse where anon = ?',
            [Hashing::anonPulse(self::DEVICE, 'pimienta')]);
    }

    public function test_disabled_answers_off_before_reading_the_body(): void
    {
        config(['ruta.pulse_enabled' => false]);
        $r = $this->beat('{roto');
        $r->assertOk();
        $this->assertSame('{"ok":true,"off":true}', $r->getContent());
        $this->assertNull($this->row());
    }

    public function test_method_is_checked_before_disabled(): void
    {
        config(['ruta.pulse_enabled' => false]);
        $this->call('GET', '/api/pulse')->assertStatus(405);
    }

    public function test_without_device_nothing_is_stored(): void
    {
        $this->assertSame('{"ok":true}', $this->beat('{"planDay":3}', null)->getContent());
        $this->assertSame(0, DB::scalar('select count(*)::int from pulse'));
    }

    public function test_body_over_8_kb_is_413(): void
    {
        $this->beat('{"x":"'.str_repeat('a', 8 * 1024).'"}')->assertStatus(413);
    }

    public function test_second_beat_of_the_day_keeps_the_greatest(): void
    {
        $this->beat('{"track":"a2b1","planDay":12,"doneDays":10,"streak":4,"seen":["panel"]}')->assertOk();
        $this->beat('{"track":"b1b2","planDay":5,"doneDays":11,"streak":1,"seen":["quiz"]}')->assertOk();

        $row = $this->row();
        $this->assertSame(['b1b2', 12, 11, 4, 'quiz'], [$row->track, $row->plan_day, $row->done_days, $row->streak, $row->seen]);
        $this->assertSame(1, DB::scalar('select count(*)::int from pulse'));
    }
}
