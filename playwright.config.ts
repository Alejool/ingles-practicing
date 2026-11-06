import { defineConfig } from "@playwright/test";

/**
 * Suite de interfaz del proyecto (specs/rediseno-limpio, fase 1).
 * Corre contra el build servido con `astro preview`, como se publica.
 * En local usa el Edge instalado (sin descargar navegadores); en CI,
 * el Chromium de `npx playwright install chromium`.
 */
const PUERTO = 4329;
const enCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/ui",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: enCI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    channel: enCI ? undefined : "msedge",
    locale: "es-ES",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } } },
    { name: "movil-375", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: "movil-320", use: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    // API de `astro preview` y no su CLI: la CLI pasa sola a segundo plano si
    // detecta un agente (am-i-vibing) y Playwright daría el servidor por caído.
    command: `npm run build:fast && node -e "import('astro').then(({ preview }) => preview({ server: { host: '127.0.0.1', port: ${PUERTO} } }))"`,
    url: `http://127.0.0.1:${PUERTO}/`,
    reuseExistingServer: !enCI,
    timeout: 180_000,
  },
});
