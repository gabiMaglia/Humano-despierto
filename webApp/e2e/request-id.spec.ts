import { ALUMNA, assertStackUp, expect, loginAs, test } from "./fixtures";

// D-49: el proxy ata un x-request-id a cada request, también al POST de una Server Action.
// Que ese id sea el de cada línea de log (y el digest de error.tsx) no se ve desde el navegador:
// requiere capturar la salida del servidor, y queda como deuda.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test("la respuesta de una Server Action lleva un x-request-id propio por request", async ({ browser, request }) => {
  await assertStackUp(request);
  const ids: string[] = [];

  // Entrar dispara postLoginDestinationAction: un POST de Server Action a /entrar.
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      page.on("response", (res) => {
        if (res.request().method() === "POST" && new URL(res.url()).pathname === "/entrar") {
          const id = res.headers()["x-request-id"];
          if (id) ids.push(id);
        }
      });
      await loginAs(page, ALUMNA, "/panel");
    } finally {
      await ctx.close();
    }
  }

  expect(ids).toHaveLength(2);
  for (const id of ids) expect(id).toMatch(UUID);
  expect(ids[1]).not.toBe(ids[0]);
});
