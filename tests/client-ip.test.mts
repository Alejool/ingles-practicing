import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { clientIp, ipDeProxy } from "../netlify/functions/_http.mts";

const VARIABLES = ["PLATAFORMA_API", "VERCEL", "NETLIFY", "NETLIFY_DEV", "SITE_ID"];
const previas = Object.fromEntries(VARIABLES.map(v => [v, process.env[v]]));

function plataforma(env: Record<string, string>): void {
  for (const v of VARIABLES) delete process.env[v];
  Object.assign(process.env, env);
}

function peticion(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/quota", { headers });
}

beforeEach(() => plataforma({}));
after(() => {
  for (const v of VARIABLES) {
    if (previas[v] === undefined) delete process.env[v];
    else process.env[v] = previas[v];
  }
});

test("Netlify: manda su cabecera y X-Forwarded-For no cuenta", () => {
  for (const env of [{ NETLIFY: "true" }, { NETLIFY_DEV: "true" }, { SITE_ID: "abc" }]) {
    plataforma(env);
    assert.equal(clientIp(peticion({ "x-nf-client-connection-ip": "203.0.113.7" })), "203.0.113.7");
    assert.equal(
      clientIp(peticion({ "x-nf-client-connection-ip": "203.0.113.7", "x-forwarded-for": "9.9.9.9, 203.0.113.7" })),
      "203.0.113.7");
    assert.equal(
      clientIp(peticion({
        "x-nf-client-connection-ip": "203.0.113.7", "x-vercel-forwarded-for": "9.9.9.9", "x-real-ip": "9.9.9.9",
      })),
      "203.0.113.7");
    assert.equal(clientIp(peticion({ "x-forwarded-for": "9.9.9.9" })), "0.0.0.0");
  }
});

test("Vercel: manda su cabecera y ni X-Forwarded-For ni la de Netlify cuentan", () => {
  plataforma({ VERCEL: "1" });
  const falsas = { "x-nf-client-connection-ip": "9.9.9.9", "x-forwarded-for": "9.9.9.9" };
  assert.equal(clientIp(peticion({ ...falsas, "x-vercel-forwarded-for": "198.51.100.4" })), "198.51.100.4");
  assert.equal(clientIp(peticion({ ...falsas, "x-real-ip": "198.51.100.4" })), "198.51.100.4");
  assert.equal(clientIp(peticion(falsas)), "0.0.0.0");
});

test("servidor propio: solo vale la IP que puso el adaptador", () => {
  plataforma({ PLATAFORMA_API: "node" });
  assert.equal(
    clientIp(peticion({
      "x-nf-client-connection-ip": "192.0.2.10", "x-forwarded-for": "9.9.9.9",
      "x-vercel-forwarded-for": "9.9.9.9", "x-real-ip": "9.9.9.9",
    })),
    "192.0.2.10");
});

test("servidor propio gana aunque el entorno traiga variables de otra plataforma", () => {
  plataforma({ PLATAFORMA_API: "node", VERCEL: "1", NETLIFY: "true" });
  assert.equal(
    clientIp(peticion({ "x-nf-client-connection-ip": "192.0.2.10", "x-vercel-forwarded-for": "9.9.9.9" })),
    "192.0.2.10");
});

test("plataforma desconocida: ninguna cabecera es de fiar", () => {
  assert.equal(
    clientIp(peticion({
      "x-nf-client-connection-ip": "9.9.9.9", "x-forwarded-for": "9.9.9.9",
      "x-vercel-forwarded-for": "9.9.9.9", "x-real-ip": "9.9.9.9",
    })),
    "0.0.0.0");
});

test("sin proxy de confianza manda el socket, diga lo que diga X-Forwarded-For", () => {
  assert.equal(ipDeProxy("192.0.2.10", "9.9.9.9", 0), "192.0.2.10");
  assert.equal(ipDeProxy("::ffff:192.0.2.10", "9.9.9.9, 8.8.8.8", 0), "192.0.2.10");
  assert.equal(ipDeProxy("", "9.9.9.9", 0), "0.0.0.0");
});

test("con un proxy de confianza vale el último salto, no el primero", () => {
  // El cliente manda «9.9.9.9» y el proxy añade detrás la IP que de verdad vio.
  assert.equal(ipDeProxy("10.0.0.2", "9.9.9.9, 203.0.113.7", 1), "203.0.113.7");
  assert.equal(ipDeProxy("10.0.0.2", "203.0.113.7", 1), "203.0.113.7");
  assert.equal(ipDeProxy("10.0.0.2", " 9.9.9.9 ,, ::ffff:203.0.113.7 ", 1), "203.0.113.7");
});

test("con un proxy de confianza y sin cabecera manda el socket", () => {
  assert.equal(ipDeProxy("10.0.0.2", "", 1), "10.0.0.2");
});

test("con dos proxies de confianza se descuentan dos saltos", () => {
  assert.equal(ipDeProxy("10.0.0.2", "9.9.9.9, 203.0.113.7, 172.16.0.5", 2), "203.0.113.7");
  // Menos saltos de los prometidos: nunca se sale de la cadena.
  assert.equal(ipDeProxy("10.0.0.2", "203.0.113.7", 3), "203.0.113.7");
});
