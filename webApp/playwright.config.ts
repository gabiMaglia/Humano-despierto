import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

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
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "stack", testMatch: /stack\.setup\.ts/ },
    { name: "chromium", use: { browserName: "chromium" }, dependencies: ["stack"] },
  ],
});
