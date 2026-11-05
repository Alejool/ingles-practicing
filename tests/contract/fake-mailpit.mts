/**
 * Buzón mínimo con la API de Mailpit que usa la batería, para correrla sin
 * Docker (el stack de `compose.node.yml` usa el Mailpit de verdad).
 *
 *   SMTP  :FAKE_SMTP_PORT (1025)  recibe sin autenticación ni TLS
 *   HTTP  :FAKE_MAILPIT_PORT (8026)
 *         GET /api/v1/search?query=to:"<dirección>"   → { messages: [{ ID, Subject, To }] }, del más nuevo al más viejo
 *         GET /api/v1/message/<ID>                    → { ID, Subject, To, Text, HTML }
 *
 *   node --experimental-strip-types tests/contract/fake-mailpit.mts
 */

import net from "node:net";
import http from "node:http";
import { pathToFileURL } from "node:url";

interface Mensaje {
  ID: string;
  Subject: string;
  To: Array<{ Address: string }>;
  Text: string;
  HTML: string;
}

const mensajes: Mensaje[] = [];

function cabeceras(bloque: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const linea of bloque.replace(/\r\n[ \t]+/g, " ").split("\r\n")) {
    const i = linea.indexOf(":");
    if (i > 0) out[linea.slice(0, i).trim().toLowerCase()] = linea.slice(i + 1).trim();
  }
  return out;
}

function quotedPrintable(s: string): Buffer {
  const limpio = s.replace(/=\r\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < limpio.length; i++) {
    if (limpio[i] === "=" && /^[0-9A-F]{2}$/i.test(limpio.slice(i + 1, i + 3))) {
      bytes.push(parseInt(limpio.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(limpio[i], "utf8"));
    }
  }
  return Buffer.from(bytes);
}

function decodificar(cuerpo: string, codificacion = ""): string {
  const c = codificacion.toLowerCase();
  if (c === "quoted-printable") return quotedPrintable(cuerpo).toString("utf8");
  if (c === "base64") return Buffer.from(cuerpo.replace(/\s+/g, ""), "base64").toString("utf8");
  return cuerpo;
}

/** `=?UTF-8?Q?…?=` y `=?UTF-8?B?…?=` de las cabeceras. */
function palabrasCodificadas(s: string): string {
  return s
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([QB])\?([^?]*)\?=/gi, (_m, _cs, tipo: string, texto: string) =>
      tipo.toUpperCase() === "B"
        ? Buffer.from(texto, "base64").toString("utf8")
        : quotedPrintable(texto.replace(/_/g, " ")).toString("utf8"));
}

function partes(cabs: Record<string, string>, cuerpo: string, out: { text: string; html: string }): void {
  const tipo = cabs["content-type"] || "text/plain";
  const limite = tipo.match(/boundary="?([^";]+)"?/i)?.[1];
  if (/^multipart\//i.test(tipo) && limite) {
    for (const trozo of cuerpo.split(`--${limite}`).slice(1)) {
      if (trozo.startsWith("--")) break;
      const sep = trozo.indexOf("\r\n\r\n");
      if (sep < 0) continue;
      partes(cabeceras(trozo.slice(2, sep)), trozo.slice(sep + 4).replace(/\r\n$/, ""), out);
    }
    return;
  }
  const texto = decodificar(cuerpo, cabs["content-transfer-encoding"]);
  if (/^text\/html/i.test(tipo)) out.html ||= texto;
  else if (/^text\/plain/i.test(tipo)) out.text ||= texto;
}

function guardar(datos: string, destinatarios: string[]): void {
  const sep = datos.indexOf("\r\n\r\n");
  const cabs = cabeceras(datos.slice(0, sep));
  const out = { text: "", html: "" };
  partes(cabs, datos.slice(sep + 4), out);
  mensajes.push({
    ID: String(mensajes.length + 1),
    Subject: palabrasCodificadas(cabs.subject || ""),
    To: destinatarios.map(Address => ({ Address })),
    Text: out.text,
    HTML: out.html,
  });
  if (mensajes.length > 5000) mensajes.shift();
}

function smtp(socket: net.Socket): void {
  let buffer = "";
  let enDatos = false;
  let para: string[] = [];
  const di = (s: string) => socket.write(s + "\r\n");
  di("220 fake-mailpit ESMTP");
  socket.on("data", chunk => {
    buffer += chunk.toString("utf8");
    for (;;) {
      if (enDatos) {
        const fin = buffer.indexOf("\r\n.\r\n");
        if (fin < 0) return;
        const datos = buffer.slice(0, fin).replace(/^\.\./gm, ".");
        buffer = buffer.slice(fin + 5);
        enDatos = false;
        guardar(datos, para);
        para = [];
        di("250 OK");
        continue;
      }
      const i = buffer.indexOf("\r\n");
      if (i < 0) return;
      const linea = buffer.slice(0, i);
      buffer = buffer.slice(i + 2);
      const cmd = linea.slice(0, 4).toUpperCase();
      if (cmd === "EHLO") { socket.write("250-fake-mailpit\r\n250 8BITMIME\r\n"); }
      else if (cmd === "HELO") di("250 fake-mailpit");
      else if (cmd === "MAIL") { para = []; di("250 OK"); }
      else if (cmd === "RCPT") { para.push((linea.match(/<([^>]*)>/)?.[1] || "").toLowerCase()); di("250 OK"); }
      else if (cmd === "DATA") { enDatos = true; di("354 End data with <CR><LF>.<CR><LF>"); }
      else if (cmd === "QUIT") { di("221 Bye"); socket.end(); return; }
      else di("250 OK");
    }
  });
  socket.on("error", () => {});
}

function api(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url || "/", "http://fake");
  const enviar = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/api/v1/search") {
    const q = (url.searchParams.get("query") || "").match(/^to:"?([^"]*)"?$/i)?.[1]?.toLowerCase() ?? "";
    const encontrados = mensajes.filter(m => m.To.some(t => t.Address.includes(q))).reverse();
    return enviar(200, { messages: encontrados.map(({ ID, Subject, To }) => ({ ID, Subject, To })) });
  }
  const m = url.pathname.match(/^\/api\/v1\/message\/([^/]+)$/);
  if (m) {
    const msg = mensajes.find(x => x.ID === m[1]);
    return msg ? enviar(200, msg) : enviar(404, { error: "not found" });
  }
  enviar(404, { error: "not found" });
}

export function arrancar(): void {
  const puertoSmtp = Number(process.env.FAKE_SMTP_PORT || 1025);
  const puertoApi = Number(process.env.FAKE_MAILPIT_PORT || 8026);
  net.createServer(smtp).listen(puertoSmtp, "127.0.0.1");
  http.createServer(api).listen(puertoApi, "127.0.0.1", () =>
    console.log(`[fake-mailpit] smtp :${puertoSmtp} · api :${puertoApi}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) arrancar();
