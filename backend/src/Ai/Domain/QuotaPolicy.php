<?php

namespace Ruta\Ai\Domain;

use DateTimeImmutable;
use DateTimeZone;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\IsoInstant;

/**
 * Las cuatro barreras de la cuota de IA (`comprobar()` y `medir()` de _quota.mts),
 * sin base: las sumas llegan en `QuotaUsage`. Mismos mensajes, letra por letra.
 *
 *   1. ritmo      — llamadas por minuto de un mismo dispositivo o IP
 *   2. persona    — anónimo (de por vida o por día, por dispositivo y por IP) o registrado (día y mes)
 *   3. despliegue — tope diario de créditos
 *   4. dinero     — tope diario en dólares
 */
final class QuotaPolicy
{
    /** Créditos de reserva por tipo de tarea; el modelo que razona, el doble. */
    private const ESTIMATES = ['writing' => 6, 'speaking' => 6, 'reading' => 5, 'tutor' => 3, 'error' => 2, 'test' => 1];

    private const DEFAULT_ESTIMATE = 3;

    public function __construct(public readonly QuotaLimits $limits) {}

    /** Créditos que gasta un coste dado. Nada baja de 1: toda llamada cuesta algo. */
    public function creditsOf(int $micros): int
    {
        return max(1, (int) ceil($micros / $this->limits->creditMicros));
    }

    /** Lo que se reserva antes de llamar: el coste real no se sabe hasta que responde el modelo. */
    public function estimatedCredits(string $kind, string $model): int
    {
        $n = self::ESTIMATES[$kind] ?? self::DEFAULT_ESTIMATE;

        return str_contains($model, 'reasoner') ? $n * 2 : $n;
    }

    /** Barrera 1. Con `$reserved`, la fila propia ya está escrita y no cuenta. */
    public function assertPace(int $recentCalls, bool $reserved): void
    {
        if ($recentCalls - ($reserved ? 1 : 0) >= $this->limits->perMinute) {
            throw new DomainError('too_fast', 'Vas muy rápido. Espera un minuto y vuelve a intentarlo.');
        }
    }

    public function state(QuotaUsage $usage, ?SessionUser $user, DateTimeImmutable $now): QuotaState
    {
        return $this->measure($usage, $user, $now)['state'];
    }

    /**
     * Barreras 2–4. `$cost` son los créditos de esta llamada; con `$reserved`, su fila
     * ya está en las sumas y se descuenta para hacer las mismas preguntas que antes de
     * escribirla, viendo también lo que hayan reservado los demás entretanto.
     */
    public function check(QuotaUsage $usage, ?SessionUser $user, int $cost, bool $reserved, DateTimeImmutable $now): QuotaState
    {
        $own = $reserved ? $cost : 0;
        ['state' => $state, 'globalFree' => $globalFree] = $this->measure($usage, $user, $now);
        // Sin recortar a cero: si entre todos se han pasado, tiene que salir negativo.
        $freeGlobal = $globalFree + $own;
        $free = $state->limit - $state->used + $own;

        // El despliegue se comprueba antes que lo personal para dar el mensaje correcto.
        if ($freeGlobal <= 0) {
            throw new DomainError('global_limit',
                'Hoy se ha alcanzado el límite de uso compartido de la app. Vuelve mañana o usa tu propia clave en Ajustes.');
        }
        if ($freeGlobal < $cost) {
            throw new DomainError('global_limit',
                'Al presupuesto compartido de hoy ya no le cabe una tarea de este tamaño. Prueba mañana, con algo más corto, '
                .'o pon tu propia clave en Ajustes.');
        }

        $user !== null
            ? $this->checkUser($state, $free, $cost, $own)
            : $this->checkAnonymous($state, $free, $cost);

        return $state;
    }

    private function checkUser(QuotaState $state, int $free, int $cost, int $own): void
    {
        $extra = ['quota' => $state->toArray()];
        if ($free <= 0) {
            throw new DomainError('user_daily_limit',
                "Has gastado tus {$state->limit} créditos de hoy. Se renuevan a medianoche.", $extra);
        }
        if ($free < $cost) {
            throw new DomainError('user_daily_limit',
                "Te quedan {$free} créditos y esta tarea necesita unos {$cost}. Prueba con un texto más corto, "
                .'con el modelo rápido, o mañana.', $extra);
        }
        if (($state->monthlyUsed ?? 0) - $own >= ($state->monthlyLimit ?? PHP_INT_MAX)) {
            throw new DomainError('user_monthly_limit',
                'Has agotado tu cuota mensual. Se renueva el día 1, o puedes usar tu propia clave en Ajustes.', $extra);
        }
    }

    /** Sin cuentas no se invita a entrar con el correo: se espera a mañana o se pone la clave propia. */
    private function checkAnonymous(QuotaState $state, int $free, int $cost): void
    {
        $extra = ['quota' => $state->toArray()];
        $l = $this->limits;
        if ($free <= 0) {
            throw new DomainError('anon_limit', match (true) {
                $l->accountsEnabled => "Has gastado los {$state->limit} créditos de prueba. Entra con tu correo para seguir; el resto de la app no necesita cuenta.",
                $l->anonDaily() => "Has gastado tus {$state->limit} créditos de hoy. Vuelven mañana, y el resto de la app sigue funcionando entera.",
                default => "Has gastado los {$state->limit} créditos de esta app. Puedes seguir con tu propia clave de DeepSeek desde Ajustes.",
            }, $extra);
        }
        if ($free < $cost) {
            throw new DomainError('anon_limit', $l->accountsEnabled
                ? "Te quedan {$free} créditos de prueba y esta tarea necesita unos {$cost}. Entra con tu correo y tendrás bastantes más."
                : "Te quedan {$free} créditos y esta tarea necesita unos {$cost}. Prueba con un texto más corto".($l->anonDaily() ? ', o mañana' : '').'.',
                $extra);
        }
    }

    /**
     * El estado, más lo que le queda al despliegue SIN recortar a cero (negativo: cuánto
     * se ha pasado). La reserva lo necesita para distinguir «cabe justo» de «ya no cabía».
     *
     * @return array{state: QuotaState, globalFree: int}
     */
    private function measure(QuotaUsage $usage, ?SessionUser $user, DateTimeImmutable $now): array
    {
        $l = $this->limits;
        $spent = $usage->spentTodayMicros;
        $byCredits = $l->globalDaily - $this->creditsIn($spent);
        $globalFree = $l->globalDailyUsd > 0
            ? min($byCredits, (int) floor(($l->globalDailyUsd * 1e6 - $spent) / $l->creditMicros))
            : $byCredits;
        $tomorrow = IsoInstant::fromDateTime($now->setTimezone(new DateTimeZone('UTC'))->modify('tomorrow'));

        if ($user !== null) {
            $used = $this->creditsIn($usage->userDailyMicros);
            $limit = $l->userDaily + $user->dailyBonus;
            $state = new QuotaState(true, $used, $limit, max(0, $limit - $used), 'día', $tomorrow,
                $this->creditsIn($usage->userMonthlyMicros), $l->userMonthly,
                max(0, $globalFree), $spent / 1e6, $l->globalDailyUsd);
        } else {
            $used = max($this->creditsIn($usage->anonDeviceMicros), $this->creditsIn($usage->anonIpMicros));
            $limit = $l->anonDaily() ? $l->anonDaily : $l->anonLifetime;
            $state = new QuotaState(false, $used, $limit, max(0, $limit - $used), $l->anonDaily() ? 'día' : 'total',
                $l->anonDaily() ? $tomorrow : null, null, null,
                max(0, $globalFree), $spent / 1e6, $l->globalDailyUsd);
        }

        return ['state' => $state, 'globalFree' => $globalFree];
    }

    /** Créditos de una suma de coste (aquí sin mínimo de 1: cero gastado son cero créditos). */
    private function creditsIn(int $micros): int
    {
        return (int) ceil($micros / $this->limits->creditMicros);
    }
}
