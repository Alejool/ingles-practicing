/**
 * Cuotas de IA, medidas por coste.
 *
 * Contar llamadas mentía: un writing de 400 palabras con el modelo que razona
 * cuesta diez veces un open cloze, y ambos gastaban «1». Aquí la unidad es el
 * **crédito** (`QUOTA_CREDIT_MICROS`, por defecto medio milésimo de dólar), y
 * cada llamada gasta los que costó de verdad, calculados con los tokens que
 * devuelve el proveedor. En la práctica: un hueco de Use of English vale 1
 * crédito, una corrección de writing 3, un texto largo 6, y el modelo que
 * razona el doble.
 *
 * Cuatro barreras, de menor a mayor alcance:
 *   1. ritmo      — llamadas por minuto de un mismo dispositivo o IP
 *   2. persona    — anónimo (de por vida por dispositivo, y por IP) o registrado (día y mes)
 *   3. despliegue — tope diario de créditos
 *   4. dinero     — tope diario en dólares, que es el que evita la factura sorpresa
 *
 * El anónimo se cuenta por dispositivo Y por IP: borrar el localStorage no
 * devuelve los créditos gastados, porque la IP sigue contando.
 */

import { q, scalar } from "./_db.mts";
import { ApiError, num } from "./_http.mts";
import type { SessionUser } from "./_auth.mts";

/* ─────────────── precios ─────────────── */

interface Precio {
  /** Dólares por millón de tokens de entrada. */
  in: number;
  /** Dólares por millón de tokens de salida. */
  out: number;
}

function precioNum(nombre: string, def: number): number {
  const v = Number(process.env[nombre]);
  return Number.isFinite(v) && v >= 0 ? v : def;
}

/**
 * Precios por millón de tokens. Los de DeepSeek cambian de vez en cuando, así
 * que se pueden ajustar por variable de entorno sin tocar código.
 */
function precios(): Record<string, Precio> {
  return {
    "deepseek-chat": {
      in: precioNum("PRICE_CHAT_IN", 0.27),
      out: precioNum("PRICE_CHAT_OUT", 1.10),
    },
    "deepseek-reasoner": {
      in: precioNum("PRICE_REASONER_IN", 0.55),
      out: precioNum("PRICE_REASONER_OUT", 2.19),
    },
  };
}

function precioDe(model: string): Precio {
  const tabla = precios();
  if (tabla[model]) return tabla[model];
  // Un modelo desconocido se cobra al precio del más caro: nunca subestimar.
  return Object.values(tabla).reduce((a, b) => (b.out > a.out ? b : a));
}

/** Lo que costó una llamada, en millonésimas de dólar. */
export function costeMicros(model: string, promptTokens: number, completionTokens: number): number {
  const p = precioDe(model);
  const usd = (promptTokens / 1e6) * p.in + (completionTokens / 1e6) * p.out;
  return Math.max(0, Math.round(usd * 1e6));
}

/* ─────────────── límites ─────────────── */

export interface QuotaLimits {
  anonLifetime: number;
  /**
   * "total" = los créditos de prueba se gastan una vez y se acaban (lo normal
   * cuando hay cuentas: el siguiente paso es entrar con el correo).
   * "dia"   = se renuevan cada día. Es lo que quieres si publicas la app sin
   *           correo y sin cuentas: la gente entra, estudia y al día siguiente
   *           vuelve a tener corrección. El techo en dólares sigue mandando.
   */
  anonWindow: "total" | "dia";
  anonDaily: number;
  /** Sin correo configurado no hay cuentas: cambia lo que se ofrece y lo que se dice. */
  accountsEnabled: boolean;
  anonIpWindowDays: number;
  userDaily: number;
  userMonthly: number;
  globalDaily: number;
  perMinute: number;
  maxTokens: number;
  /** Cuánto vale un crédito, en millonésimas de dólar. */
  creditMicros: number;
  /** Techo de gasto del despliegue por día, en dólares. */
  globalDailyUsd: number;
}

export function limits(): QuotaLimits {
  return {
    anonLifetime: num("QUOTA_ANON_LIFETIME", 15),
    anonWindow: (process.env.QUOTA_ANON_WINDOW || "").toLowerCase() === "dia" ? "dia" : "total",
    anonDaily: num("QUOTA_ANON_DAILY", 20),
    accountsEnabled: process.env.ACCOUNTS_ENABLED !== "false"
      && (process.env.MAIL_PROVIDER || "log").toLowerCase() !== "none",
    anonIpWindowDays: num("QUOTA_ANON_IP_WINDOW_DAYS", 30),
    userDaily: num("QUOTA_USER_DAILY", 60),
    userMonthly: num("QUOTA_USER_MONTHLY", 900),
    globalDaily: num("QUOTA_GLOBAL_DAILY", 6000),
    perMinute: num("QUOTA_PER_MINUTE", 6),
    maxTokens: num("AI_MAX_TOKENS", 2048),
    // Medio milésimo de dólar. Fino a propósito: con un crédito más gordo, un
    // writing largo y un hueco acababan costando lo mismo.
    creditMicros: Math.max(1, num("QUOTA_CREDIT_MICROS", 500)),
    globalDailyUsd: Math.max(0, Number(process.env.QUOTA_GLOBAL_DAILY_USD ?? 3) || 0),
  };
}

/** Créditos que gasta un coste dado. Nada baja de 1: toda llamada cuesta algo. */
export function creditosDe(micros: number): number {
  return Math.max(1, Math.ceil(micros / limits().creditMicros));
}

/**
 * Lo que hay que reservar ANTES de llamar, porque el coste real no se sabe
 * hasta que responde el modelo. Es una estimación prudente por tipo de tarea:
 * si luego sale más barato, solo se cobra lo que costó.
 */
export function creditosEstimados(kind: string, model: string): number {
  const razonador = model.includes("reasoner");
  const base: Record<string, number> = {
    writing: 6,   // texto largo de entrada y corrección larga de salida
    speaking: 6,
    reading: 5,   // genera un artículo entero con sus preguntas
    tutor: 3,
    error: 2,
    test: 1,
  };
  const n = base[kind] ?? 3;
  return razonador ? n * 2 : n;
}

/* ─────────────── estado ─────────────── */

export interface QuotaState {
  authenticated: boolean;
  /** Créditos gastados en la ventana. */
  used: number;
  limit: number;
  remaining: number;
  /** Ventana a la que se refiere `limit`: "total" (anónimo) o "día". */
  window: "total" | "día";
  resetsAt: string | null;
  monthlyUsed?: number;
  monthlyLimit?: number;
  globalRemaining: number;
  /** Cuánto se ha gastado hoy en todo el despliegue, en dólares. */
  spentTodayUsd: number;
  budgetUsd: number;
}

/** Créditos de una consulta que suma coste. */
async function creditos(sql: string, params: unknown[]): Promise<number> {
  const micros = Number(await scalar(sql, params)) || 0;
  const L = limits();
  return Math.ceil(micros / L.creditMicros);
}

export async function readQuota(user: SessionUser | null, deviceId: string, ipHash: string): Promise<QuotaState> {
  const L = limits();

  const gastadoHoy = Number(await scalar(
    `select coalesce(sum(cost_micros), 0)::bigint from ai_usage where day = current_date and ok`, [])) || 0;
  const spentTodayUsd = gastadoHoy / 1e6;
  const globalUsados = Math.ceil(gastadoHoy / L.creditMicros);
  const porCreditos = Math.max(0, L.globalDaily - globalUsados);
  const porDinero = L.globalDailyUsd > 0
    ? Math.max(0, Math.floor(((L.globalDailyUsd * 1e6) - gastadoHoy) / L.creditMicros))
    : Infinity;
  const globalRemaining = Math.min(porCreditos, porDinero);

  const comun = { globalRemaining, spentTodayUsd, budgetUsd: L.globalDailyUsd };

  if (user) {
    const daily = await creditos(
      `select coalesce(sum(cost_micros), 0)::bigint from ai_usage where user_id = $1 and day = current_date and ok`, [user.id]);
    const monthly = await creditos(
      `select coalesce(sum(cost_micros), 0)::bigint from ai_usage
        where user_id = $1 and created_at >= date_trunc('month', now()) and ok`, [user.id]);
    const dailyLimit = L.userDaily + (user.daily_bonus || 0);
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return {
      authenticated: true,
      used: daily,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - daily),
      window: "día",
      resetsAt: tomorrow.toISOString(),
      monthlyUsed: monthly,
      monthlyLimit: L.userMonthly,
      ...comun,
    };
  }

  // Con la ventana diaria solo cuenta lo de hoy; con la de siempre, todo.
  const diaria = L.anonWindow === "dia";
  const desdeDispositivo = diaria
    ? `select coalesce(sum(cost_micros), 0)::bigint from ai_usage
        where device_id = $1 and user_id is null and ok and day = current_date`
    : `select coalesce(sum(cost_micros), 0)::bigint from ai_usage
        where device_id = $1 and user_id is null and ok`;
  const byDevice = deviceId ? await creditos(desdeDispositivo, [deviceId]) : 0;
  const byIp = diaria
    ? await creditos(
      `select coalesce(sum(cost_micros), 0)::bigint from ai_usage
        where ip_hash = $1 and user_id is null and ok and day = current_date`,
      [ipHash])
    : await creditos(
      `select coalesce(sum(cost_micros), 0)::bigint from ai_usage
        where ip_hash = $1 and user_id is null and ok
          and created_at >= now() - ($2 || ' days')::interval`,
      [ipHash, String(L.anonIpWindowDays)]);

  const used = Math.max(byDevice, byIp);
  const tope = diaria ? L.anonDaily : L.anonLifetime;
  const manana = new Date();
  manana.setUTCHours(24, 0, 0, 0);
  return {
    authenticated: false,
    used,
    limit: tope,
    remaining: Math.max(0, tope - used),
    window: diaria ? "día" : "total",
    resetsAt: diaria ? manana.toISOString() : null,
    ...comun,
  };
}

/**
 * Lanza si la petición no puede seguir. El mensaje ya está listo para enseñarlo.
 *
 * `kind` y `model` sirven para exigir que quepa la llamada entera: con dos
 * créditos libres no se lanza una corrección que va a costar seis.
 */
export async function assertCanSpend(
  user: SessionUser | null,
  deviceId: string,
  ipHash: string,
  kind = "error",
  model = "deepseek-chat",
): Promise<QuotaState> {
  const L = limits();

  // 1 · ritmo
  const recent = Number(await scalar(
    `select count(*)::int from ai_usage
      where created_at > now() - interval '60 seconds'
        and (($1 <> '' and device_id = $1) or ip_hash = $2)`,
    [deviceId, ipHash])) || 0;
  if (recent >= L.perMinute) {
    throw new ApiError(429, "too_fast", "Vas muy rápido. Espera un minuto y vuelve a intentarlo.");
  }

  const state = await readQuota(user, deviceId, ipHash);
  const coste = creditosEstimados(kind, model);

  // 4 y 3 · el despliegue (se comprueban antes que lo personal para dar el mensaje correcto)
  if (state.globalRemaining <= 0) {
    throw new ApiError(503, "global_limit",
      "Hoy se ha alcanzado el límite de uso compartido de la app. Vuelve mañana o usa tu propia clave en Ajustes.");
  }
  if (state.globalRemaining < coste) {
    throw new ApiError(503, "global_limit",
      "Al presupuesto compartido de hoy ya no le cabe una tarea de este tamaño. Prueba mañana, con algo más corto, " +
      "o pon tu propia clave en Ajustes.");
  }

  // 2 · persona
  if (user) {
    if (state.remaining <= 0) {
      throw new ApiError(429, "user_daily_limit",
        `Has gastado tus ${state.limit} créditos de hoy. Se renuevan a medianoche.`, { quota: state });
    }
    if (state.remaining < coste) {
      throw new ApiError(429, "user_daily_limit",
        `Te quedan ${state.remaining} créditos y esta tarea necesita unos ${coste}. Prueba con un texto más corto, ` +
        "con el modelo rápido, o mañana.", { quota: state });
    }
    if ((state.monthlyUsed ?? 0) >= (state.monthlyLimit ?? Infinity)) {
      throw new ApiError(429, "user_monthly_limit",
        "Has agotado tu cuota mensual. Se renueva el día 1, o puedes usar tu propia clave en Ajustes.", { quota: state });
    }
  } else if (state.remaining <= 0) {
    // Sin cuentas no tiene sentido invitar a entrar con el correo: lo que hay
    // es esperar a mañana o poner la clave propia.
    throw new ApiError(402, "anon_limit",
      L.accountsEnabled
        ? `Has gastado los ${state.limit} créditos de prueba. Entra con tu correo para seguir; el resto de la app no necesita cuenta.`
        : L.anonWindow === "dia"
          ? `Has gastado tus ${state.limit} créditos de hoy. Vuelven mañana, y el resto de la app sigue funcionando entera.`
          : `Has gastado los ${state.limit} créditos de esta app. Puedes seguir con tu propia clave de DeepSeek desde Ajustes.`,
      { quota: state });
  } else if (state.remaining < coste) {
    throw new ApiError(402, "anon_limit",
      L.accountsEnabled
        ? `Te quedan ${state.remaining} créditos de prueba y esta tarea necesita unos ${coste}. Entra con tu correo y tendrás bastantes más.`
        : `Te quedan ${state.remaining} créditos y esta tarea necesita unos ${coste}. Prueba con un texto más corto${L.anonWindow === "dia" ? ", o mañana" : ""}.`,
      { quota: state });
  }

  return state;
}

export async function recordUsage(opts: {
  userId: string | null;
  deviceId: string;
  ipHash: string;
  kind: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  ok?: boolean;
}): Promise<void> {
  const pt = opts.promptTokens || 0;
  const ct = opts.completionTokens || 0;
  // Si el proveedor no informó de tokens, no salimos gratis: se cobra un crédito.
  const micros = pt + ct > 0 ? costeMicros(opts.model, pt, ct) : limits().creditMicros;
  await q(
    `insert into ai_usage (user_id, device_id, ip_hash, kind, model, prompt_tokens, completion_tokens, cost_micros, ok)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      opts.userId, opts.deviceId || null, opts.ipHash, opts.kind.slice(0, 40), opts.model.slice(0, 60),
      pt, ct, micros, opts.ok !== false,
    ]
  );
}
