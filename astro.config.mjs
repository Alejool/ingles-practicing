// @ts-check
import { defineConfig } from "astro/config";

/**
 * En `astro dev` el front se sirve en :4321 y ahí NO hay API: las funciones
 * corren en el contenedor (o en `npm start`) en :8080. Este proxy manda
 * /api/* y /healthz al backend, así que el front en desarrollo funciona igual
 * que en producción, mismo origen y sin CORS.
 *
 * Si tu backend está en otro sitio: DEV_API_TARGET=http://192.168.1.50:8080 npm run dev
 */
const API_TARGET = process.env.DEV_API_TARGET || "http://127.0.0.1:8080";

export default defineConfig({
  /**
   * Si la publicas en un subdirectorio (GitHub Pages, por ejemplo),
   * pon aquí `site` y `base` y todo seguirá funcionando:
   *   site: "https://tuusuario.github.io",
   *   base: "/ruta-b1b2",
   */
  output: "static",
  trailingSlash: "ignore",
  compressHTML: true,
  build: {
    inlineStylesheets: "auto",
    assets: "_assets",
  },
  vite: {
    build: {
      target: "es2022",
    },
    server: {
      proxy: {
        "/api": {
          target: API_TARGET,
          changeOrigin: true,
          // Las correcciones llegan por streaming: sin esto se verían de golpe al final.
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              if (String(proxyRes.headers["content-type"]).includes("event-stream")) {
                proxyRes.headers["x-accel-buffering"] = "no";
              }
            });
          },
        },
        "/healthz": { target: API_TARGET, changeOrigin: true },
      },
    },
  },
});
