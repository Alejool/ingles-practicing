/* Ruta B1 → B2 · service worker
 *
 * Las tres constantes de abajo las reescribe `scripts/precache.mts` después de
 * cada build, porque los bundles llevan un hash en el nombre y no se pueden
 * listar a mano. No las edites: se regeneran solas.
 *
 *   CACHE_VERSION  sale del contenido del build, así que cada despliegue
 *                  invalida lo viejo sin que nadie tenga que acordarse.
 *   SHELL_FILES    el esqueleto: html, css, JS de arranque, iconos, manifest.
 *                  Se descarga entero al instalar, y con eso la app abre sin red.
 *   CONTENT_FILES  el contenido de las rutas y las lecturas. NO se descarga al
 *                  instalar —quien estudia una ruta no necesita la otra—, pero
 *                  la app lo pide en segundo plano al arrancar y aquí se guarda.
 *                  También se puede pedir su descarga con un mensaje WARM.
 *
 * Estrategias:
 *   - navegación → red primero, index.html cacheado como respaldo offline
 *   - mismo origen → cache-first, y lo nuevo se guarda al vuelo
 *   - Google Fonts → stale-while-revalidate en una caché que sobrevive a los despliegues
 *   - cualquier POST (la API) → siempre a la red
 */
const CACHE_VERSION = "ruta-b1b2-dev";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];
const CONTENT_FILES = [];

const SHELL = CACHE_VERSION + "-shell";
const FONTS = "ruta-b1b2-fonts";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL)
      // allSettled: que un icono que falte no tire abajo la instalación entera.
      .then(c => Promise.allSettled(SHELL_FILES.map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  const tipo = event.data && event.data.type;
  if (tipo === "SKIP_WAITING") { self.skipWaiting(); return; }

  /* La app pide guardar el contenido que ya está usando, para el próximo vuelo. */
  if (tipo === "WARM") {
    event.waitUntil(
      caches.open(SHELL).then(async cache => {
        const faltan = [];
        for (const f of CONTENT_FILES) {
          if (!(await cache.match(f, { ignoreSearch: true }))) faltan.push(f);
        }
        await Promise.allSettled(faltan.map(f => cache.add(f)));
        const clientes = await self.clients.matchAll();
        clientes.forEach(c => c.postMessage({ type: "WARMED", n: faltan.length }));
      })
    );
  }
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // La API nunca se cachea: sesión, cuota y progreso cambian a cada momento.
  // Sin esto, una respuesta "no has iniciado sesión" se quedaría pegada.
  if (url.pathname.startsWith("/api/") || req.headers.has("authorization")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html", { ignoreSearch: true }))
    );
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONTS).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => {
            if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit =>
        hit || fetch(req).then(res => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(SHELL).then(c => c.put(req, copy));
          }
          return res;
        })
      )
    );
  }
});
