import { defineConfig } from "@playwright/test";

// Puerto y host fijos (T-040 ronda 2): tienen que figurar tal cual en `additional_redirect_urls`
// de supabase/config.toml, y SITE_URL tiene que ser el mismo origen que usa el navegador o la
// cookie del verificador PKCE no viaja y el link de recuperación cae en /entrar?error=link.
const E2E_PORT = 3101;
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // next dev compila cada ruta la primera vez que se pide; el margen es para eso, no para el test.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 0,
  workers: 1,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    url: baseURL,
    // Un server ajeno en el puerto podría tener otro SITE_URL; mejor fallar que probar con él.
    reuseExistingServer: false,
    env: { SITE_URL: baseURL },
    timeout: 120_000,
  },
  projects: [
    { name: "stack", testMatch: /stack\.setup\.ts/ },
    { name: "chromium", use: { browserName: "chromium" }, dependencies: ["stack"] },
  ],
});
