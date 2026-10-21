import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
      // Mismo destino que `paths["@/*"]` de tsconfig.json; un alias a mano evita sumar vite-tsconfig-paths.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/**/*.test.ts", "src/app/**/actions.test.ts", "src/app/**/route.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    passWithNoTests: false,
    reporters: ["default"],
  },
});
