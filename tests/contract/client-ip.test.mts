/**
 * IP del cliente (AC-9). El stack de contrato tiene TRUST_PROXY=1: cuenta la
 * última IP de X-Forwarded-For (la que añadió nuestro proxy); lo de más a la
 * izquierda lo escribe el cliente y no cuenta. Las cabeceras de Netlify y
 * Vercel no se miran. Se observa en `login_tokens.ip_hash`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pedir, fila, correoUnico, ipUnica, hashIp } from "./_lib.mts";

async function ipHashDe(headers: Record<string, string>): Promise<string> {
  const correo = correoUnico();
  const r = await pedir("/api/auth/request", { json: { email: correo }, headers });
  assert.equal(r.status, 200, r.text);
  return (await fila<{ ip_hash: string }>(`select ip_hash from login_tokens where email = $1`, [correo]))!.ip_hash;
}

test("X-Forwarded-For: falsa, real → cuenta la real", async () => {
  const real = ipUnica();
  assert.equal(await ipHashDe({ "X-Forwarded-For": `198.51.100.7, ${real}` }), hashIp(real));
});

test("varias falsas delante y espacios → cuenta la última", async () => {
  const real = ipUnica();
  assert.equal(await ipHashDe({ "X-Forwarded-For": ` 1.1.1.1 ,2.2.2.2,   ${real} ` }), hashIp(real));
});

test("el prefijo ::ffff: de IPv4 mapeada se quita", async () => {
  const real = ipUnica();
  assert.equal(await ipHashDe({ "X-Forwarded-For": `::ffff:${real}` }), hashIp(real));
});

test("X-Nf-Client-Connection-Ip no cambia el ip_hash", async () => {
  const real = ipUnica();
  assert.equal(
    await ipHashDe({ "X-Forwarded-For": real, "X-Nf-Client-Connection-Ip": "203.0.113.9" }),
    hashIp(real));
});

test("X-Vercel-Forwarded-For y X-Real-Ip no cambian el ip_hash", async () => {
  const real = ipUnica();
  assert.equal(
    await ipHashDe({ "X-Forwarded-For": real, "X-Vercel-Forwarded-For": "203.0.113.10", "X-Real-Ip": "203.0.113.11" }),
    hashIp(real));
});

test("la misma IP da el mismo hash en peticiones distintas", async () => {
  const real = ipUnica();
  const a = await ipHashDe({ "X-Forwarded-For": real });
  const b = await ipHashDe({ "X-Forwarded-For": `9.9.9.9, ${real}` });
  assert.equal(a, b);
});
