<?php

namespace Ruta\Admin\Infrastructure;

use Illuminate\Database\ConnectionInterface;

/** SQL de admin.mts, tal cual. Las filas salen con las columnas en el orden de la consulta. */
final class AdminQueries
{
    public function __construct(private readonly ConnectionInterface $db) {}

    /** @return list<object> */
    public function usageByDay(): array
    {
        $rows = $this->db->select(
            'select day::text,
                    count(*)::int                                as llamadas,
                    count(distinct coalesce(user_id::text, device_id)) as personas,
                    sum(prompt_tokens)::int                      as tokens_entrada,
                    sum(completion_tokens)::int                  as tokens_salida,
                    round(coalesce(sum(cost_micros),0) / 1e6, 4) as usd,
                    count(*) filter (where user_id is null)::int as anonimas
               from ai_usage
              where day > current_date - 30
              group by day
              order by day desc');
        // `personas` es bigint: el driver pg de Node lo da como cadena y PDO como entero.
        foreach ($rows as $row) {
            $row->personas = (string) $row->personas;
        }

        return $rows;
    }

    /** @return list<object> */
    public function usageByKind(): array
    {
        return $this->db->select(
            'select kind,
                    count(*)::int as llamadas,
                    sum(prompt_tokens + completion_tokens)::int as tokens,
                    round(coalesce(sum(cost_micros),0) / 1e6, 4) as usd,
                    round(coalesce(avg(cost_micros),0) / 1e6, 5) as usd_por_llamada
               from ai_usage where day > current_date - 30 group by kind order by usd desc');
    }

    /** @return list<object> */
    public function topOfMonth(): array
    {
        return $this->db->select(
            "select u.email,
                    count(*)::int as llamadas,
                    sum(a.prompt_tokens + a.completion_tokens)::int as tokens,
                    round(coalesce(sum(a.cost_micros),0) / 1e6, 4) as usd
               from ai_usage a join users u on u.id = a.user_id
              where a.created_at >= date_trunc('month', now())
              group by u.email order by usd desc limit 20");
    }

    public function totals(): ?object
    {
        return $this->db->selectOne(
            "select count(*)::int as usuarios,
                    (select count(*)::int from ai_usage where day = current_date) as hoy,
                    (select round(coalesce(sum(cost_micros),0) / 1e6, 4) from ai_usage
                      where day = current_date) as usd_hoy,
                    (select round(coalesce(sum(cost_micros),0) / 1e6, 4) from ai_usage
                      where created_at >= date_trunc('month', now())) as usd_mes,
                    (select coalesce(sum(prompt_tokens + completion_tokens),0)::int from ai_usage
                      where created_at >= date_trunc('month', now())) as tokens_mes
               from users");
    }

    /**
     * Cuántas personas llegaron a cada tramo de diez días del plan y cuántas siguen activas.
     *
     * @return list<object>
     */
    public function funnel(): array
    {
        return $this->db->select(
            'with ultimos as (
               select distinct on (anon) anon, track, plan_day, done_days, streak, day
                 from pulse order by anon, day desc
             )
             select track,
                    width_bucket(plan_day, 1, 121, 12) as tramo,
                    count(*)::int as personas,
                    round(avg(done_days))::int as dias_hechos_medio,
                    count(*) filter (where day > current_date - 7)::int as activos_7d
               from ultimos group by track, tramo order by track, tramo');
    }

    /** @return list<object> */
    public function openedModules(): array
    {
        return $this->db->select(
            "with ultimos as (
               select distinct on (anon) anon, seen from pulse order by anon, day desc
             ), abiertos as (
               select unnest(string_to_array(seen, ',')) as modulo from ultimos where seen <> ''
             )
             select modulo, count(*)::int as personas
               from abiertos where modulo <> '' group by modulo order by personas desc");
    }

    public function pulseSummary(): ?object
    {
        return $this->db->selectOne(
            'select count(distinct anon)::int as personas,
                    count(distinct anon) filter (where day > current_date - 7)::int as activos_7d,
                    count(distinct anon) filter (where day = current_date)::int as hoy,
                    round(avg(plan_day))::int as dia_medio,
                    max(streak)::int as mejor_racha
               from pulse');
    }

    /** @return list<object> */
    public function latestReadings(): array
    {
        return $this->db->select(
            'select r.id, r.track, r.level, r.topic, r.title, r.words, r.reads, r.hidden,
                    r.created_at::date::text as dia, u.email as autor
               from shared_readings r left join users u on u.id = r.author_id
              order by r.id desc limit 40');
    }

    /** Oculta (o vuelve a mostrar) un texto; null si no existe. */
    public function setHidden(string $id, bool $hidden): ?object
    {
        return $this->db->selectOne(
            'update shared_readings set hidden = ? where id = ? returning id, title, hidden', [$hidden, $id]);
    }

    public function statement(string $sql): void
    {
        $this->db->statement($sql);
    }

    /**
     * Lo que dejan las pruebas de humo: cuentas `@smoke.test`, consumo de dispositivos
     * `smoke-%`, sus enlaces, el latido del dispositivo dado y las lecturas `Smoke…`.
     *
     * @return array{users: int, pulses: int, readings: int}
     */
    public function deleteSmokeData(?string $pulseAnon): array
    {
        $users = count($this->db->select("delete from users where email like '%@smoke.test' returning email"));
        $this->db->delete("delete from ai_usage where device_id like 'smoke-%'");
        $this->db->delete("delete from login_tokens where email like '%@smoke.test'");
        $pulses = $pulseAnon === null ? 0 : count($this->db->select('delete from pulse where anon = ? returning anon', [$pulseAnon]));
        $readings = count($this->db->select("delete from shared_readings where title like 'Smoke%' returning id"));

        return ['users' => $users, 'pulses' => $pulses, 'readings' => $readings];
    }
}
