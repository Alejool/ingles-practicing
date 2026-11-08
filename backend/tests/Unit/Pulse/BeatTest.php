<?php

namespace Tests\Unit\Pulse;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Pulse\Domain\Beat;
use Ruta\Shared\Domain\Tracks;

/** Lo que pulse.mts saca del cuerpo: ruta, `entero()` acotado y módulos de la lista. */
final class BeatTest extends TestCase
{
    private static function beat(string $json): Beat
    {
        return Beat::fromBody(json_decode($json), new Tracks(['a2b1', 'b1b2']));
    }

    public function test_values_as_sent(): void
    {
        $b = self::beat('{"track":"a2b1","planDay":12,"doneDays":10,"streak":4,"seen":["panel","plan","vocab"]}');
        $this->assertSame(['a2b1', 12, 10, 4, 'panel,plan,vocab'], [$b->track, $b->planDay, $b->doneDays, $b->streak, $b->seen]);
    }

    public function test_unknown_or_missing_track_is_b1b2(): void
    {
        $this->assertSame('b1b2', self::beat('{"track":"c1c2"}')->track);
        $this->assertSame('b1b2', self::beat('{}')->track);
        $this->assertSame('b1b2', self::beat('[]')->track);
        $this->assertSame('b1b2', self::beat('null')->track);
    }

    /** @return array<string, array{string, int}> */
    public static function planDays(): array
    {
        return [
            'missing → min' => ['{}', 1], 'null is 0 → min' => ['{"planDay":null}', 1], 'text number' => ['{"planDay":"7"}', 7],
            'rounded up' => ['{"planDay":2.5}', 3], 'rounded down' => ['{"planDay":2.49}', 2], 'over max' => ['{"planDay":999}', 200],
            'under min' => ['{"planDay":-5}', 1], 'garbage → min' => ['{"planDay":"abc"}', 1], 'true is 1' => ['{"planDay":true}', 1],
            'one element list' => ['{"planDay":[9]}', 9], 'two element list → min' => ['{"planDay":[1,2]}', 1],
            'object → min' => ['{"planDay":{}}', 1], 'spaces' => ['{"planDay":" 8 "}', 8],
        ];
    }

    #[DataProvider('planDays')]
    public function test_plan_day_is_an_integer_clamped_to_1_200(string $json, int $expected): void
    {
        $this->assertSame($expected, self::beat($json)->planDay);
    }

    public function test_ranges_of_done_days_and_streak(): void
    {
        $b = self::beat('{"doneDays":500,"streak":500}');
        $this->assertSame([200, 400], [$b->doneDays, $b->streak]);
        $b = self::beat('{"doneDays":-1,"streak":-2.6}');
        $this->assertSame([0, 0], [$b->doneDays, $b->streak]);
    }

    public function test_seen_keeps_known_modules_up_to_twenty(): void
    {
        $this->assertSame('panel,plan', self::beat('{"seen":["panel","hack",3,"plan",null]}')->seen);
        $this->assertSame('', self::beat('{"seen":"panel"}')->seen);
        $many = json_encode(['seen' => array_fill(0, 30, 'quiz')]);
        $this->assertSame(20, count(explode(',', self::beat($many)->seen)));
    }
}
