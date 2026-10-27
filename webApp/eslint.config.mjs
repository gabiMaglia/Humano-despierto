import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefactos de Playwright.
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
  ]),
  // useActionState/withRateLimit fijan la firma (prev, formData): el guion bajo marca lo que no se usa.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // T-051: toda salida pasa por lib/server/log.ts (los tests quedan fuera, spían console).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/server/log.ts", "src/**/*.test.{ts,tsx}"],
    rules: { "no-console": "error" },
  },
]);

export default eslintConfig;
