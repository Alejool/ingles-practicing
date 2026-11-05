/**
 * DeepSeek simulado para los tests de contrato. Ni una llamada real.
 *
 * El modo de cada respuesta lo elige el texto que llega en la petición: la
 * marca `FAKE:<modo>` en cualquier parte del cuerpo (los tests la ponen en el
 * payload, que el servidor copia en los mensajes). Sin marca → `ok`.
 *
 *   ok       stream SSE con contenido y evento final de `usage`
 *   lento    el mismo stream, con una pausa entre trozos
 *   sin_uso  el stream sin evento de `usage`
 *   402      402 con un JSON de error (sin saldo)
 *   500      500 con un JSON de error
 *   caido    corta la conexión sin responder
 *
 * Además guarda las últimas peticiones recibidas: `GET /__last` devuelve la
 * última (cuerpo JSON parseado y cabecera Authorization), para que los tests
 * comprueben modelo, temperatura y mensajes; `GET /__last?marca=<texto>`, la
 * última cuyo cuerpo contiene ese texto.
 *
 *   node --experimental-strip-types tests/contract/fake-deepseek.mts   (FAKE_PORT, por defecto 8790)
 */

import http from "node:http";
import { pathToFileURL } from "node:url";

export type Modo = "ok" | "lento" | "sin_uso" | "402" | "500" | "caido";

export const MODOS: Modo[] = ["ok", "lento", "sin_uso", "402", "500", "caido"];

export const USO = { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 };

/** Pausa entre trozos en el modo `lento`. */
export const PAUSA_LENTO_MS = 400;

export function modoDe(cuerpo: string): Modo {
  const m = cuerpo.match(/FAKE:(ok|lento|sin_uso|402|500|caido)\b/);
  return (m ? m[1] : "ok") as Modo;
}

function evento(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/** Los trozos exactos que emite el simulado. El test compara el cuerpo recibido con su concatenación. */
export function trozos(modo: Modo): string[] {
  const delta = (content: string) => evento({
    id: "fake-1", object: "chat.completion.chunk", created: 1700000000, model: "deepseek-chat",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  });
  const salida = [delta("OK"), delta(" ¿Qué tal?"), delta(" ñandú → 😀")];
  if (modo !== "sin_uso") {
    salida.push(evento({
      id: "fake-1", object: "chat.completion.chunk", created: 1700000000, model: "deepseek-chat",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: USO,
    }));
  }
  salida.push("data: [DONE]\n\n");
  return salida;
}

export function cuerpoEsperado(modo: Modo): string {
  return trozos(modo).join("");
}

interface Recibida {
  body: any;
  authorization: string | null;
}

export function arrancar(puerto = Number(process.env.FAKE_PORT || 8790), host = "0.0.0.0"): http.Server {
  const recibidas: Recibida[] = [];

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://fake");

    if (req.method === "GET" && url.pathname === "/__last") {
      // `?marca=…`: la última cuyo cuerpo contiene ese texto (los archivos de test corren en paralelo).
      const marca = url.searchParams.get("marca");
      const candidatas = marca ? recibidas.filter(r => JSON.stringify(r.body).includes(marca)) : recibidas;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(candidatas[candidatas.length - 1] ?? null));
      return;
    }
    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
      return;
    }

    const partes: Buffer[] = [];
    for await (const c of req) partes.push(c as Buffer);
    const texto = Buffer.concat(partes).toString("utf8");
    let body: any = null;
    try { body = JSON.parse(texto); } catch { body = texto; }
    recibidas.push({ body, authorization: req.headers.authorization ?? null });
    if (recibidas.length > 50) recibidas.shift();

    const modo = modoDe(texto);
    if (modo === "caido") {
      req.socket.destroy();
      return;
    }
    if (modo === "402" || modo === "500") {
      res.writeHead(Number(modo), { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: modo === "402" ? "Insufficient Balance" : "Internal error", type: "fake" } }));
      return;
    }

    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" });
    for (const t of trozos(modo)) {
      res.write(t);
      if (modo === "lento") await new Promise(r => setTimeout(r, PAUSA_LENTO_MS));
    }
    res.end();
  });

  server.listen(puerto, host, () => console.log(`[fake-deepseek] escuchando en :${puerto}`));
  const cerrar = () => server.close(() => process.exit(0));
  process.on("SIGTERM", cerrar);
  process.on("SIGINT", cerrar);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) arrancar();
