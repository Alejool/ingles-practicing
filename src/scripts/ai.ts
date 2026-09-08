/**
 * Correcciones con IA.
 *
 * Dos modos:
 *   compartido — pasa por /api/ai/chat. La clave está en el servidor y hay cuota.
 *   clave propia — va directo a DeepSeek con la clave de quien la pone, sin tocar
 *                  la cuota compartida. Los prompts se componen con el mismo
 *                  módulo que usa el servidor, así que el resultado es idéntico.
 */

import { buildMessages, PayloadError } from "../../shared/prompts";
import type { AiKind } from "../../shared/prompts";
import * as api from "./api";
import { S, save, touchDay } from "./state";
import { $, $$, el, toast } from "./dom";
import { go } from "./nav";
import { encolar, setLanzador, setAviso, arrancarCola } from "./queue";

export const AI_MODELS: Array<[string, string]> = [
  ["deepseek-chat", "DeepSeek V3 · rápido y barato. El adecuado para corregir writing y para el tutor."],
  ["deepseek-reasoner", "DeepSeek R1 · razona antes de responder. Mejor para dudas de gramática difíciles; más lento."],
];

export const AI_DEF = {
  url: "https://api.deepseek.com/chat/completions",
  key: "",
  model: "deepseek-chat",
};

export function aiCfg() {
  return Object.assign({}, AI_DEF, S.ai || {});
}

/** Con clave propia se salta la cuota compartida. */
export function usesOwnKey(): boolean {
  return !!aiCfg().key.trim();
}

export function ownKeyEndpoint(): string {
  let u = (aiCfg().url || "").trim().replace(/\/+$/, "");
  if (!u) u = AI_DEF.url;
  try {
    const h = new URL(u);
    if (h.hostname.endsWith("deepseek.com") && !/\/chat\/completions$/.test(h.pathname)) u += "/chat/completions";
  } catch { /* URL a medio escribir en Ajustes */ }
  return u;
}

/** Siempre hay una vía disponible: o el servidor compartido, o la clave propia. */
export function aiReady(): boolean {
  return true;
}

export function aiNote(): HTMLElement {
  const p = el("p", { class: "tiny ai-note", style: "margin-top:6px" });
  paintNote(p);
  return p;
}

function noteText(): string {
  if (usesOwnKey()) return "Usando tu clave de DeepSeek: esto no gasta la cuota compartida.";
  const q = api.session().quota;
  if (!q) return "Las correcciones pasan por el servidor de la app. El resto de módulos funciona sin conexión.";
  // Los créditos miden coste, no llamadas: un texto largo gasta más que un hueco.
  const coste = " Una corrección corta gasta un crédito; un texto largo o el modelo que razona, varios.";
  if (q.authenticated) return `Te quedan ${q.remaining} de ${q.limit} créditos de hoy.` + coste;
  return q.remaining > 0
    ? `Te quedan ${q.remaining} de ${q.limit} créditos de prueba. Entrar con tu correo te da bastantes más.` + coste
    : "Se acabaron los créditos de prueba. Entra con tu correo en el módulo 17 para seguir.";
}

function paintNote(n: HTMLElement): void {
  n.textContent = noteText();
}

export function refreshAi(): void {
  $$(".ai-note").forEach(paintNote);
  $$<HTMLButtonElement>("[data-ai]").forEach(b => { b.disabled = false; });
}

api.onSession(() => refreshAi());

/* ---------- errores ---------- */

export class AiError extends Error {
  code: string | number;
  text?: string;
  data: any;
  constructor(code: string | number, msg: string, text?: string, data: any = null) {
    super(msg);
    this.code = code;
    this.text = text;
    this.data = data;
  }
}

const ERRCOPY: Record<string, string> = {
  network: "No se pudo conectar. Si estás sin internet, la corrección no funciona; el resto de la app sí.",
  api_unreachable: "No encuentro la API. Si estás en `npm run dev`, levanta el backend con `bash start.sh`; el proxy de desarrollo apunta a http://127.0.0.1:8080.",
  sin_servidor: "Esta copia de la app no tiene servidor de correcciones: es solo el estudio, que funciona entero. Si quieres que la IA te corrija aquí, pon tu clave de DeepSeek en Ajustes → Avanzado; pagas tú y no sale de este navegador.",
  anon_limit: "Se acabaron los créditos de prueba. Entra con tu correo y sigues: es gratis y solo pide un email.",
  user_daily_limit: "Has gastado tus créditos de hoy. Se renuevan a medianoche.",
  user_monthly_limit: "Has agotado la cuota de este mes. Se renueva el día 1, o puedes poner tu propia clave en Ajustes.",
  global_limit: "Hoy se alcanzó el presupuesto compartido de la app. Vuelve mañana o usa tu propia clave en Ajustes.",
  too_fast: "Vas muy rápido. Espera un minuto y vuelve a intentarlo.",
  not_authenticated: "Tu sesión caducó. Vuelve a entrar con tu correo.",
  account_blocked: "Esta cuenta está bloqueada.",
  provider_no_credit: "El servicio de IA se quedó sin saldo. Avisa a quien administra la app.",
  provider_error: "El servicio de IA no responde ahora mismo. Inténtalo en un momento.",
  bad_payload: "Falta texto que corregir o es demasiado largo.",
  payload_too_large: "El texto es demasiado largo. Recórtalo y reintenta.",
  server_error: "Error en el servidor. Inténtalo de nuevo.",
  cancelled: "Cancelado.",
  empty: "El modelo no devolvió texto. Reintenta o acorta lo que enviaste.",
  401: "La clave propia es inválida o está mal copiada. Revísala en Ajustes.",
  402: "Tu cuenta de DeepSeek no tiene saldo.",
  404: "Ese endpoint no existe. Revisa la URL en Ajustes.",
  429: "Demasiadas peticiones seguidas. Espera un minuto.",
  500: "Error del servidor de DeepSeek. Reintenta en un momento.",
  503: "El servidor de DeepSeek está saturado.",
};

export function aiCopy(e: any): string {
  if (ERRCOPY[e?.code]) return ERRCOPY[e.code];
  if (e?.message) return e.message;
  return "Algo falló al pedir la corrección.";
}

/** Los límites de cuota son los únicos errores que se resuelven entrando. */
export function needsAccount(e: any): boolean {
  return e?.code === "anon_limit" || e?.code === "not_authenticated";
}

/* ---------- transporte ---------- */

async function readSse(res: Response, onText?: (full: string, delta: string) => void): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let j: any;
      try { j = JSON.parse(payload); } catch { continue; }
      const d = j.choices?.[0]?.delta;
      if (d?.content) {
        full += d.content;
        onText?.(full, d.content);
      }
    }
  }
  return full;
}

export interface StreamOptions {
  onText?: (full: string, delta: string) => void;
  signal?: AbortSignal;
}

/** Pide una corrección. Devuelve el texto completo; lanza AiError. */
export async function streamAi(kind: AiKind, payload: any, opts: StreamOptions = {}): Promise<string> {
  const own = usesOwnKey();
  const cfg = aiCfg();

  let res: Response;
  try {
    if (own) {
      let messages;
      try {
        messages = buildMessages(kind, payload);
      } catch (e) {
        throw new AiError("bad_payload", e instanceof PayloadError ? e.message : "Datos inválidos.");
      }
      res = await fetch(ownKeyEndpoint(), {
        method: "POST",
        signal: opts.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key.trim() },
        body: JSON.stringify({ model: cfg.model, messages, stream: true, temperature: kind === "test" ? 0 : 1 }),
      });
    } else {
      res = await fetch(api.apiUrl("/api/ai/chat"), {
        method: "POST",
        signal: opts.signal,
        headers: api.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ kind, payload, model: cfg.model }),
      });
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw new AiError("cancelled", "cancelado");
    if (err instanceof AiError) throw err;
    throw new AiError("network", "sin conexión");
  }

  if (!res.ok) {
    let code: string | number = res.status;
    let message = "";
    let data: any = null;
    let esJson = false;
    try {
      const j = await res.json();
      esJson = true;
      if (j?.error?.code) { code = j.error.code; message = j.error.message || ""; data = j.error; }
      else if (j?.error?.message) message = j.error.message;
    } catch { /* respuesta sin cuerpo JSON */ }
    // Un 404 que ni siquiera devuelve JSON de la API significa que detrás no hay
    // backend: la app está publicada como archivos sueltos. No es una avería.
    if (!own && !esJson && (res.status === 404 || res.status === 405)) {
      throw new AiError("sin_servidor", "");
    }
    throw new AiError(code, message, undefined, data);
  }

  if (!own) api.noteQuotaHeaders(res);

  let full = "";
  try {
    full = await readSse(res, opts.onText);
  } catch (err: any) {
    if (err?.name === "AbortError") throw new AiError("cancelled", "cancelado", full);
    throw new AiError("network", "conexión interrumpida", full);
  }
  if (!full.trim()) throw new AiError("empty", "respuesta vacía");
  if (!own) api.refreshSession();
  return full;
}

/* ---------- pintar la respuesta ---------- */

let aiCtl: AbortController | null = null;

/* ---------- cola offline ---------- */

/**
 * Lo que la cola necesita para reintentar: una petición encolada se lanza igual
 * que una normal, solo que sin nadie mirando.
 */
setLanzador(p => streamAi(p.kind, p.payload));

setAviso(p => {
  toast("Ya está lista tu " + p.rotulo.toLowerCase() + ". Está en Ajustes.");
});

arrancarCola();

/** Rótulo legible de una petición, para la lista de pendientes. */
function rotuloDe(kind: AiKind): string {
  const r: Record<string, string> = {
    writing: "Corrección de Writing",
    speaking: "Evaluación de Speaking",
    reading: "Texto de lectura",
    tutor: "Respuesta del tutor",
    error: "Corrección del cuaderno",
    test: "Prueba de conexión",
  };
  return r[kind] || "Petición a la IA";
}

/** Pide una corrección y la va escribiendo en `out`. */
export async function ask(kind: AiKind, payload: any, out: HTMLElement, btn?: HTMLButtonElement | null): Promise<void> {
  out.innerHTML = "";
  aiCtl = new AbortController();
  const old = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "Corrigiendo…"; }

  const pane = el("div", { class: "fb" }, el("span", { class: "dots" }, "Pensando"));
  const stop = el("button", { class: "btn ghost small", style: "margin-top:10px", type: "button", onclick: () => aiCtl?.abort() }, "Parar");
  out.append(pane, stop);

  try {
    await streamAi(kind, payload, { signal: aiCtl.signal, onText: t => { pane.textContent = t; } });
    touchDay();
    save();
  } catch (e: any) {
    pane.textContent = e.text || "";
    if (e.code !== "cancelled") {
      pane.classList.add("err");
      pane.append(el("div", { style: "margin-top:8px;font-weight:500" }, aiCopy(e)));
      if (needsAccount(e)) {
        pane.append(el("div", { style: "margin-top:10px" },
          el("button", { class: "btn small", type: "button", onclick: () => go("cuenta") }, "Entrar con mi correo")));
      }
      if (e.code === "sin_servidor") {
        pane.append(el("div", { style: "margin-top:10px" },
          el("button", { class: "btn small", type: "button", onclick: () => go("ajustes") }, "Poner mi clave en Ajustes")));
      }
      // Sin red no se pierde el trabajo: la petición espera en la cola y se
      // lanza sola cuando vuelva la conexión.
      if (e.code === "network" || e.code === "api_unreachable" || !navigator.onLine) {
        const id = await encolar({ kind, payload, model: aiCfg().model, rotulo: rotuloDe(kind) });
        if (id !== null) {
          pane.append(el("div", { style: "margin-top:10px" },
            el("span", { class: "chip warn" }, "Guardada"),
            el("span", { class: "tiny", style: "margin-left:8px" },
              "Tu texto queda a salvo. En cuanto vuelva la conexión te la corrijo y te aviso.")));
        }
      }
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = old; }
    stop.remove();
    refreshAi();
  }
}
