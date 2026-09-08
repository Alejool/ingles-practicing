/**
 * GET  /api/admin?token=…            · uso y gasto de los últimos días
 * POST /api/admin?token=…&op=schema  · crea o actualiza las tablas
 * POST /api/admin?token=…&op=hide&id=…        · oculta un texto de la biblioteca
 * POST /api/admin?token=…&op=hide&id=…&show=1 · lo vuelve a mostrar
 *
 * Protegido por ADMIN_TOKEN. Sin esa variable el endpoint no existe.
 */

import { preflight, json, fail, ApiError, sha256Hex } from "./_http.mts";
import { q, migrate } from "./_db.mts";
import { limits } from "./_quota.mts";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function assertAdmin(req: Request): void {
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected) throw new ApiError(404, "not_found", "No disponible.");
  const url = new URL(req.url);
  const given = url.searchParams.get("token") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (given !== expected) throw new ApiError(403, "forbidden", "Token de administración incorrecto.");
}

/** El bundle de Netlify mueve los archivos: se prueban las dos rutas posibles. */
async function readSchema(): Promise<string> {
  const candidates = [new URL("../../db/schema.sql", import.meta.url), join(process.cwd(), "db/schema.sql")];
  for (const c of candidates) {
    try { return await readFile(c as any, "utf8"); } catch { /* siguiente */ }
  }
  throw new ApiError(500, "schema_missing", "No se encontró db/schema.sql en el despliegue.");
}

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    assertAdmin(req);

    if (req.method === "POST" && new URL(req.url).searchParams.get("op") === "schema") {
      const applied = await migrate(await readSchema());
      return json(req, { ok: true, message: `Esquema aplicado (${applied} sentencias).` });
    }

    if (req.method === "POST" && new URL(req.url).searchParams.get("op") === "cleanup-test") {
      // Borra lo que dejan las pruebas: cuentas @smoke.test y su consumo.
      const gone = await q<{ email: string }>(
        `delete from users where email like '%@smoke.test' returning email`, []);
      await q(`delete from ai_usage where kind = 'test' and user_id is null and device_id like 'smoke-%'`, []);
      await q(`delete from ai_usage where device_id like 'smoke-%'`, []);
      await q(`delete from login_tokens where email like '%@smoke.test'`, []);
      // El latido no guarda el id de dispositivo, solo su hash: para borrar el
      // de la prueba hay que volver a calcularlo con la misma pimienta.
      const dev = new URL(req.url).searchParams.get("dev") || "";
      let pulsos = 0;
      if (dev) {
        const anon = await sha256Hex(dev + "|pulse|" + (process.env.IP_PEPPER || ""));
        pulsos = (await q(`delete from pulse where anon = $1 returning anon`, [anon])).length;
      }
      const lecturas = await q(
        `delete from shared_readings where title like 'Smoke%' returning id`, []);
      return json(req, { ok: true, borrados: gone.length, pulsos, lecturas: lecturas.length });
    }

    // Moderación de la biblioteca compartida: ocultar (o volver a mostrar) un
    // texto generado sin tener que entrar a la base de datos a mano.
    if (req.method === "POST" && new URL(req.url).searchParams.get("op") === "hide") {
      const u = new URL(req.url);
      // El id de la biblioteca es texto (lo genera quien publica), no un número.
      const id = (u.searchParams.get("id") || "").trim().slice(0, 64);
      if (!id) throw new ApiError(422, "bad_id", "Falta el id del texto.");
      const hidden = u.searchParams.get("show") !== "1";
      const r = await q<{ id: string; title: string; hidden: boolean }>(
        `update shared_readings set hidden = $2 where id = $1 returning id, title, hidden`, [id, hidden]);
      if (!r.length) throw new ApiError(404, "not_found", "No hay ningún texto con ese id.");
      return json(req, { ok: true, texto: r[0] });
    }

    // Todo se informa también en dólares: es la cifra que de verdad importa.
    const days = await q(
      `select day::text,
              count(*)::int                                as llamadas,
              count(distinct coalesce(user_id::text, device_id)) as personas,
              sum(prompt_tokens)::int                      as tokens_entrada,
              sum(completion_tokens)::int                  as tokens_salida,
              round(coalesce(sum(cost_micros),0) / 1e6, 4) as usd,
              count(*) filter (where user_id is null)::int as anonimas
         from ai_usage
        where day > current_date - 30
        group by day
        order by day desc`, []);

    const byKind = await q(
      `select kind,
              count(*)::int as llamadas,
              sum(prompt_tokens + completion_tokens)::int as tokens,
              round(coalesce(sum(cost_micros),0) / 1e6, 4) as usd,
              round(coalesce(avg(cost_micros),0) / 1e6, 5) as usd_por_llamada
         from ai_usage where day > current_date - 30 group by kind order by usd desc`, []);

    const top = await q(
      `select u.email,
              count(*)::int as llamadas,
              sum(a.prompt_tokens + a.completion_tokens)::int as tokens,
              round(coalesce(sum(a.cost_micros),0) / 1e6, 4) as usd
         from ai_usage a join users u on u.id = a.user_id
        where a.created_at >= date_trunc('month', now())
        group by u.email order by usd desc limit 20`, []);

    const totals = await q(
      `select count(*)::int as usuarios,
              (select count(*)::int from ai_usage where day = current_date) as hoy,
              (select round(coalesce(sum(cost_micros),0) / 1e6, 4) from ai_usage
                where day = current_date) as usd_hoy,
              (select round(coalesce(sum(cost_micros),0) / 1e6, 4) from ai_usage
                where created_at >= date_trunc('month', now())) as usd_mes,
              (select coalesce(sum(prompt_tokens + completion_tokens),0)::int from ai_usage
                where created_at >= date_trunc('month', now())) as tokens_mes
         from users`, []);

    /* ── dónde se cae la gente ── */

    // Cuántas personas distintas llegaron a cada tramo del plan y cuántas
    // siguen vivas: la caída entre tramos es el dato que importa.
    const embudo = await q(
      `with ultimos as (
         select distinct on (anon) anon, track, plan_day, done_days, streak, day
           from pulse order by anon, day desc
       )
       select track,
              width_bucket(plan_day, 1, 121, 12) as tramo,
              count(*)::int as personas,
              round(avg(done_days))::int as dias_hechos_medio,
              count(*) filter (where day > current_date - 7)::int as activos_7d
         from ultimos group by track, tramo order by track, tramo`, []);

    // Módulos que la gente abre de verdad, sobre el total de personas.
    const modulos = await q(
      `with ultimos as (
         select distinct on (anon) anon, seen from pulse order by anon, day desc
       ), abiertos as (
         select unnest(string_to_array(seen, ',')) as modulo from ultimos where seen <> ''
       )
       select modulo, count(*)::int as personas
         from abiertos where modulo <> '' group by modulo order by personas desc`, []);

    const pulso = await q(
      `select count(distinct anon)::int as personas,
              count(distinct anon) filter (where day > current_date - 7)::int as activos_7d,
              count(distinct anon) filter (where day = current_date)::int as hoy,
              round(avg(plan_day))::int as dia_medio,
              max(streak)::int as mejor_racha
         from pulse`, []);

    // Lo último que ha publicado la gente, para poder revisarlo de un vistazo.
    const biblioteca = await q(
      `select r.id, r.track, r.level, r.topic, r.title, r.words, r.reads, r.hidden,
              r.created_at::date::text as dia, u.email as autor
         from shared_readings r left join users u on u.id = r.author_id
        order by r.id desc limit 40`, []);

    const L = limits();
    return json(req, {
      presupuesto: {
        credito_usd: L.creditMicros / 1e6,
        tope_diario_usd: L.globalDailyUsd,
        tope_diario_creditos: L.globalDaily,
        creditos_dia_por_cuenta: L.userDaily,
        creditos_prueba: L.anonLifetime,
      },
      totales: totals[0] ?? null,
      por_dia: days,
      por_tipo: byKind,
      top_del_mes: top,
      uso: {
        resumen: pulso[0] ?? null,
        // Cada tramo son diez días del plan: 1 = días 1–10, 2 = 11–20…
        embudo,
        modulos_abiertos: modulos,
      },
      biblioteca,
    });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/admin" };
