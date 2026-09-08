/**
 * Servidor único: sirve el front estático y la API.
 *
 * Las funciones de netlify/functions/ son handlers estándar (Request → Response),
 * así que aquí solo hay que enrutarlas. El mismo código corre en Netlify y en
 * este servidor: no hay dos versiones de nada.
 *
 *   node server/index.mts
 *
 * Variables: PORT, HOST, TRUST_PROXY, SKIP_MIGRATE, STATIC_DIR.
 */

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { q, migrate, closeDb } from "../netlify/functions/_db.mts";

const gzip = promisify(zlib.gzip);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATIC_DIR = process.env.STATIC_DIR || path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json|javascript)|image\/svg)/;

interface Route {
  path: string;
  handler: (req: Request) => Promise<Response>;
}

async function loadRoutes(): Promise<Route[]> {
  const dir = path.join(ROOT, "netlify", "functions");
  const files = (await fsp.readdir(dir)).filter(f => /\.(mts|mjs)$/.test(f) && !f.startsWith("_"));
  const routes: Route[] = [];
  for (const file of files.sort()) {
    // pathToFileURL: en Windows un import() con ruta absoluta "C:\\…" falla.
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    if (!mod?.config?.path || typeof mod.default !== "function") continue;
    routes.push({ path: mod.config.path, handler: mod.default });
  }
  return routes;
}

function clientIp(req: http.IncomingMessage): string {
  if (TRUST_PROXY) {
    const fwd = String(req.headers["x-forwarded-for"] || "");
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return (req.socket.remoteAddress || "0.0.0.0").replace(/^::ffff:/, "");
}

async function toWebRequest(req: http.IncomingMessage, url: URL): Promise<Request> {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  // Las funciones leen la IP de esta cabecera (es la que pone Netlify).
  headers.set("x-nf-client-connection-ip", clientIp(req));

  let body: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) throw new Error("cuerpo demasiado grande");
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks);
  }

  return new Request(url.toString(), { method: req.method, headers, body, duplex: "half" } as RequestInit);
}

async function sendWebResponse(res: http.ServerResponse, out: Response): Promise<void> {
  const headers: Record<string, string> = {};
  out.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(out.status, headers);
  if (!out.body) return void res.end();
  // Se escribe según llega: así el streaming de las correcciones llega token a token.
  const reader = out.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
    // @ts-expect-error flush existe cuando hay compresión intermedia
    if (typeof res.flush === "function") res.flush();
  }
  res.end();
}

function cacheFor(file: string): string {
  if (/\/_assets\//.test(file)) return "public, max-age=31536000, immutable";
  if (/(sw\.js|manifest\.webmanifest)$/.test(file)) return "no-cache";
  if (file.endsWith(".html")) return "no-cache";
  return "public, max-age=3600";
}

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  let file = path.join(STATIC_DIR, rel);

  if (!file.startsWith(STATIC_DIR)) {
    res.writeHead(403).end("403");
    return;
  }

  let stat = await fsp.stat(file).catch(() => null);
  if (stat?.isDirectory()) {
    file = path.join(file, "index.html");
    stat = await fsp.stat(file).catch(() => null);
  }
  if (!stat) {
    // Una sola página: cualquier ruta desconocida devuelve el shell.
    file = path.join(STATIC_DIR, "index.html");
    stat = await fsp.stat(file).catch(() => null);
    if (!stat) { res.writeHead(404).end("404"); return; }
  }

  const type = MIME[path.extname(file)] || "application/octet-stream";
  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": cacheFor(file),
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };

  if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers).end(); return; }

  const accepts = String(req.headers["accept-encoding"] || "").includes("gzip");
  if (accepts && COMPRESSIBLE.test(type) && stat.size > 1024) {
    const buf = await gzip(await fsp.readFile(file));
    headers["Content-Encoding"] = "gzip";
    headers["Content-Length"] = String(buf.length);
    headers.Vary = "Accept-Encoding";
    res.writeHead(200, headers).end(buf);
    return;
  }

  headers["Content-Length"] = String(stat.size);
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

async function boot(): Promise<void> {
  if (process.env.SKIP_MIGRATE !== "true") {
    const sql = await fsp.readFile(path.join(ROOT, "db", "schema.sql"), "utf8");
    const n = await migrate(sql);
    console.log(`[db] esquema al día (${n} sentencias)`);
  }

  const routes = await loadRoutes();
  console.log(`[api] ${routes.length} endpoints: ${routes.map(r => r.path).join(", ")}`);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/healthz") {
      try {
        await q("select 1", []);
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
           .end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" })
           .end(JSON.stringify({ ok: false, db: false }));
      }
      return;
    }

    const route = routes.find(r => r.path === url.pathname);
    if (route) {
      try {
        await sendWebResponse(res, await route.handler(await toWebRequest(req, url)));
      } catch (e) {
        console.error("[api]", url.pathname, e);
        if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { code: "server_error", message: "Error interno" } }));
      }
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "application/json", "Cache-Control": "no-store" })
         .end(JSON.stringify({ error: { code: "not_found", message: "Endpoint desconocido" } }));
      return;
    }

    try {
      await serveStatic(req, res, url);
    } catch (e) {
      console.error("[static]", url.pathname, e);
      if (!res.headersSent) res.writeHead(500).end("500");
    }
  });

  server.headersTimeout = 65_000;
  server.requestTimeout = 0;          // las correcciones pueden tardar minutos
  server.keepAliveTimeout = 61_000;

  server.listen(PORT, HOST, () => {
    console.log(`[web] escuchando en http://${HOST}:${PORT}  ·  estáticos de ${STATIC_DIR}`);
  });

  const close = () => {
    console.log("[web] cerrando…");
    // Cerrar la base antes de salir: con pglite es lo que suelta la carpeta.
    server.close(() => { closeDb().finally(() => process.exit(0)); });
    setTimeout(() => { closeDb().finally(() => process.exit(0)); }, 8000).unref();
  };
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
}

boot().catch(e => {
  console.error("[boot] no se pudo arrancar:", e);
  process.exit(1);
});
