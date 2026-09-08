/**
 * POST /api/ai/chat  ·  el único punto por el que se habla con DeepSeek.
 *
 * La clave nunca sale de aquí. El cliente manda `{kind, payload}` acotado y
 * los mensajes los compone el servidor (shared/prompts.ts), así que este
 * endpoint no se puede usar como un chatbot de propósito general.
 *
 * El consumo se apunta ANTES de empezar a transmitir: si alguien corta la
 * conexión a mitad, la llamada ya está contada. Los tokens reales se
 * actualizan al final, cuando DeepSeek los envía en el último evento.
 */

import { preflight, corsHeaders, json, fail, ApiError, clientIp, hashIp, readJson, deviceId, num } from "./_http.mts";
import { currentUser } from "./_auth.mts";
import { assertCanSpend, recordUsage, readQuota, limits, costeMicros, creditosEstimados } from "./_quota.mts";
import { q } from "./_db.mts";
import { buildMessages, isKind, PayloadError } from "../../shared/prompts.ts";

const MODELS = ["deepseek-chat", "deepseek-reasoner"];

export default async (req: Request): Promise<Response> => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    if (req.method !== "POST") throw new ApiError(405, "method_not_allowed", "Método no permitido.");

    const body = await readJson(req);
    const kind = body?.kind;
    if (!isKind(kind)) throw new ApiError(422, "bad_kind", "Tipo de petición no reconocido.");

    const model = MODELS.includes(body?.model) ? body.model : MODELS[0];
    const dev = deviceId(req, body);
    const ipHash = await hashIp(clientIp(req));
    const user = await currentUser(req);

    let messages;
    try {
      messages = buildMessages(kind, body?.payload ?? {});
    } catch (e) {
      if (e instanceof PayloadError) throw new ApiError(422, "bad_payload", e.message);
      throw e;
    }

    await assertCanSpend(user, dev, ipHash, kind, model);

    const L = limits();
    // La fila se abre ANTES de llamar, con el coste estimado ya cargado: si la
    // respuesta se corta a mitad, la llamada ha consumido cuota igualmente.
    const reserva = creditosEstimados(kind, model) * L.creditMicros;
    const usageRow = await q<{ id: string }>(
      `insert into ai_usage (user_id, device_id, ip_hash, kind, model, cost_micros)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [user?.id ?? null, dev || null, ipHash, kind, model, reserva]
    );
    const usageId = usageRow[0]?.id;

    const upstream = await fetch(process.env.DEEPSEEK_URL || "https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY || ""}` },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        temperature: kind === "test" ? 0 : 1,
        max_tokens: Math.min(num("AI_MAX_TOKENS", L.maxTokens), 4096),
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = (await upstream.text().catch(() => "")).slice(0, 500);
      console.error("[ai] upstream", upstream.status, detail);
      // No se le cobra a nadie una llamada que el proveedor rechazó.
      if (usageId) await q(`update ai_usage set ok = false where id = $1`, [usageId]).catch(() => {});
      const code = upstream.status === 402 ? "provider_no_credit" : "provider_error";
      const msg = upstream.status === 402
        ? "El servicio de IA se ha quedado sin saldo. Avisa a quien administra la app."
        : "El servicio de IA no está respondiendo. Inténtalo en un momento.";
      throw new ApiError(502, code, msg);
    }

    // Deja pasar el stream intacto y, de camino, se queda con el recuento de tokens.
    const decoder = new TextDecoder();
    let buf = "";
    let prompt = 0;
    let completion = 0;

    const meter = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        buf += decoder.decode(chunk, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            if (j.usage) {
              prompt = j.usage.prompt_tokens || 0;
              completion = j.usage.completion_tokens || 0;
            }
          } catch { /* fragmento parcial: llegará entero en el siguiente chunk */ }
        }
      },
      async flush() {
        // Al terminar, la reserva se sustituye por lo que costó de verdad.
        if (!usageId || (!prompt && !completion)) return;
        const micros = costeMicros(model, prompt, completion);
        await q(
          `update ai_usage set prompt_tokens = $2, completion_tokens = $3, cost_micros = $4 where id = $1`,
          [usageId, prompt, completion, micros]
        ).catch(() => {});
      },
    });

    const quota = await readQuota(user, dev, ipHash);

    return new Response(upstream.body.pipeThrough(meter), {
      status: 200,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        // El front pinta el contador sin pedir /api/quota otra vez.
        "X-Quota-Remaining": String(Math.max(0, quota.remaining - 1)),
        "X-Quota-Limit": String(quota.limit),
        "X-Quota-Window": quota.window,
      },
    });
  } catch (e) {
    return fail(req, e);
  }
};

export const config = { path: "/api/ai/chat" };
