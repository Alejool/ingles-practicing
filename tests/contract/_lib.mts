/**
 * Utilidades de la batería de contrato. Solo HTTP y SQL: nada importa código
 * del servidor, para que la misma batería valga contra Node y contra Laravel.
 *
 * Variables (con los valores del stack de `compose.node.yml` por defecto):
 *   BASE_URL               servidor bajo prueba                 http://localhost:8080
 *   CONTRACT_DATABASE_URL  la base de ese servidor (nunca Neon)  postgresql://ruta:ruta@localhost:5434/ruta
 *   MAILPIT_URL            API de Mailpit                        http://localhost:8026
 *   FAKE_DEEPSEEK_URL      DeepSeek simulado                     http://localhost:8790
 *   ADMIN_TOKEN            el de `contract.env`                  contract-admin-token
 *   IP_PEPPER              el de `contract.env`                  contract-pepper
 */

import assert from "node:assert/strict";
import { createHash, randomBytes, randomInt } from "node:crypto";
import pg from "pg";

export const BASE_URL = (process.env.BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
export const DATABASE_URL = process.env.CONTRACT_DATABASE_URL || "postgresql://ruta:ruta@localhost:5434/ruta";
export const MAILPIT_URL = (process.env.MAILPIT_URL || "http://localhost:8026").replace(/\/+$/, "");
export const FAKE_URL = (process.env.FAKE_DEEPSEEK_URL || "http://localhost:8790").replace(/\/+$/, "");
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "contract-admin-token";
export const IP_PEPPER = process.env.IP_PEPPER || "contract-pepper";

/** Los valores fijos de `contract.env` que los tests necesitan conocer. */
export const ENV = {
  APP_URL: "http://localhost:8080",
  ALLOWED_ORIGIN: "https://permitido.example",
} as const;

/** Instante ISO 8601 en UTC con milisegundos, como lo serializa la API. */
export const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Las cinco cabeceras CORS, en minúsculas. */
export const CORS = [
  "access-control-allow-origin",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-max-age",
  "vary",
] as const;

if (/neon\.tech|neon\.build/.test(DATABASE_URL)) {
  throw new Error("CONTRACT_DATABASE_URL apunta a Neon: la batería de contrato solo corre contra una base local.");
}

/** Orden de claves de `quota` (anónimo y con cuenta). */
export const CLAVES_ANON = [
  "authenticated", "used", "limit", "remaining", "window", "resetsAt", "globalRemaining", "spentTodayUsd", "budgetUsd",
];
export const CLAVES_USUARIO = [
  "authenticated", "used", "limit", "remaining", "window", "resetsAt",
  "monthlyUsed", "monthlyLimit", "globalRemaining", "spentTodayUsd", "budgetUsd",
];

/* ─────────────── identidades únicas por test ─────────────── */

/** IP privada al azar: cada test cuenta sus límites por separado. */
export function ipUnica(): string {
  return `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

/** Id de dispositivo válido (`[A-Za-z0-9_-]{8,64}`) y único. */
export function dispositivoUnico(prefijo = "ct"): string {
  return `${prefijo}-${randomBytes(9).toString("hex")}`;
}

export function correoUnico(dominio = "contract.test"): string {
  return `ct-${randomBytes(6).toString("hex")}@${dominio}`;
}

export function sha256Hex(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/** `ip_hash` que guarda la API para una IP. */
export function hashIp(ip: string): string {
  return sha256Hex(`${ip}|${IP_PEPPER}`);
}

/* ─────────────── HTTP ─────────────── */

export interface Opciones {
  method?: string;
  headers?: Record<string, string>;
  /** Se serializa con JSON.stringify. */
  json?: unknown;
  /** Cuerpo tal cual (gana a `json`). */
  body?: string;
  /** IP del cliente: va en `X-Forwarded-For` (el stack confía en un proxy). */
  ip?: string;
  device?: string;
  token?: string;
  origin?: string;
}

export interface Respuesta {
  status: number;
  headers: Headers;
  text: string;
  /** El cuerpo parseado, o `undefined` si no es JSON. */
  body: any;
}

function cabeceras(o: Opciones): Record<string, string> {
  const h: Record<string, string> = { "X-Forwarded-For": o.ip ?? ipUnica() };
  if (o.json !== undefined && o.body === undefined) h["Content-Type"] = "application/json";
  if (o.device) h["X-Device-Id"] = o.device;
  if (o.token) h.Authorization = `Bearer ${o.token}`;
  if (o.origin) h.Origin = o.origin;
  return { ...h, ...o.headers };
}

/** Una petición sin seguir redirecciones. Comprueba de paso que nunca hay `Set-Cookie`. */
export async function pedir(ruta: string, o: Opciones = {}): Promise<Respuesta> {
  const res = await enviar(ruta, o);
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, body: parsear(text) };
}

/** Igual que `pedir` pero devuelve la respuesta sin leer, para leer un stream trozo a trozo. */
export async function enviar(ruta: string, o: Opciones = {}): Promise<Response> {
  const body = o.body ?? (o.json !== undefined ? JSON.stringify(o.json) : undefined);
  const res = await fetch(BASE_URL + ruta, {
    method: o.method ?? (body !== undefined ? "POST" : "GET"),
    headers: cabeceras(o),
    body,
    redirect: "manual",
  });
  assert.equal(res.headers.get("set-cookie"), null, `${ruta}: la API no pone cookies`);
  return res;
}

function parsear(text: string): any {
  try { return JSON.parse(text); } catch { return undefined; }
}

/** Comprueba un error JSON `{error:{code, message, …}}`. */
export function esError(r: Respuesta, status: number, code: string, message?: string): void {
  assert.equal(r.status, status, `estado (${r.text.slice(0, 200)})`);
  assert.equal(r.body?.error?.code, code, r.text.slice(0, 200));
  assert.equal(typeof r.body.error.message, "string");
  if (message !== undefined) assert.equal(r.body.error.message, message);
}

/** Ninguna cabecera CORS. */
export function sinCors(h: Headers): void {
  for (const k of CORS.filter(k => k !== "vary")) assert.equal(h.get(k), null, `sin ${k}`);
}

/** Las cinco cabeceras CORS con sus valores exactos. */
export function conCors(h: Headers, origen = ENV.ALLOWED_ORIGIN): void {
  assert.equal(h.get("access-control-allow-origin"), origen);
  assert.equal(h.get("access-control-allow-headers"), "Content-Type, Authorization, X-Device-Id");
  assert.equal(h.get("access-control-allow-methods"), "GET, POST, PUT, OPTIONS");
  assert.equal(h.get("access-control-max-age"), "86400");
  assert.equal(h.get("vary"), "Origin");
}

/** Respuesta JSON normal de la API: charset, `no-store` y CORS. */
export function esJsonApi(r: Respuesta): void {
  assert.equal(r.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(r.headers.get("cache-control"), "no-store");
  conCors(r.headers);
}

/* ─────────────── base de datos ─────────────── */

let pool: pg.Pool | null = null;

/** Consulta de solo lectura sobre la base del servidor bajo prueba. */
export async function consulta<T = Record<string, any>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!/^\s*(select|with)\b/i.test(sql)) throw new Error("consulta() es de solo lectura");
  return (await db().query(sql, params)).rows as T[];
}

export async function fila<T = Record<string, any>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await consulta<T>(sql, params))[0];
}

function db(): pg.Pool {
  // allowExitOnIdle: el proceso de cada archivo de test termina sin cerrar a mano.
  pool ??= new pg.Pool({ connectionString: DATABASE_URL, max: 2, allowExitOnIdle: true });
  return pool;
}

/* ─────────────── correo y sesión ─────────────── */

interface MensajeMailpit {
  ID: string;
  Subject: string;
  To: Array<{ Address: string }>;
}

/** Los mensajes de Mailpit para una dirección, del más nuevo al más viejo. */
export async function buzon(correo: string): Promise<MensajeMailpit[]> {
  const url = `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${correo}"`)}`;
  const res = await fetch(url);
  assert.equal(res.status, 200, "Mailpit responde");
  return ((await res.json()) as { messages: MensajeMailpit[] }).messages ?? [];
}

/** Espera al `n`-ésimo correo de una dirección y devuelve su texto plano y asunto. */
export async function esperarCorreo(correo: string, n = 1): Promise<{ subject: string; text: string; html: string }> {
  for (let i = 0; i < 50; i++) {
    const msgs = await buzon(correo);
    if (msgs.length >= n) {
      const res = await fetch(`${MAILPIT_URL}/api/v1/message/${msgs[0].ID}`);
      const m = (await res.json()) as { Subject: string; Text: string; HTML: string };
      return { subject: m.Subject, text: m.Text, html: m.HTML };
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`No llegó el correo ${n} de ${correo}`);
}

/** El token del enlace mágico de un correo. */
export function tokenDeEnlace(texto: string): string {
  const m = texto.match(/\/api\/auth\/verify\?token=([A-Za-z0-9_%-]+)/);
  assert.ok(m, "el correo trae el enlace de verificación");
  return decodeURIComponent(m[1]);
}

/** Pide un enlace para `correo` y devuelve su token (sin consumirlo). */
export async function pedirEnlace(correo: string, o: Opciones = {}): Promise<string> {
  const previos = (await buzon(correo)).length;
  const r = await pedir("/api/auth/request", { ...o, json: { email: correo } });
  assert.equal(r.status, 200, r.text);
  return tokenDeEnlace((await esperarCorreo(correo, previos + 1)).text);
}

/** Abre una sesión por el camino real (enlace mágico vía Mailpit). */
export async function login(correo = correoUnico()): Promise<{ correo: string; token: string }> {
  const enlace = await pedirEnlace(correo);
  const r = await pedir(`/api/auth/verify?token=${encodeURIComponent(enlace)}`);
  assert.equal(r.status, 302);
  const m = (r.headers.get("location") || "").match(/#auth=(.+)$/);
  assert.ok(m && m[1] !== "error" && m[1] !== "expired", `verify devuelve sesión: ${r.headers.get("location")}`);
  return { correo, token: decodeURIComponent(m[1]) };
}

/* ─────────────── DeepSeek simulado ─────────────── */

/** La última petición que recibió el simulado cuyo cuerpo contiene `marca`. */
export async function ultimaAlSimulado(marca: string): Promise<{ body: any; authorization: string | null } | null> {
  const res = await fetch(`${FAKE_URL}/__last?marca=${encodeURIComponent(marca)}`);
  return res.json() as Promise<any>;
}
