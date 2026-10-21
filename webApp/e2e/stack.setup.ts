import { test as setup } from "@playwright/test";
import { assertStackUp } from "./fixtures";

// Proyecto del que dependen todos los specs: sin stack, la corrida se corta aca con el comando
// a ejecutar, en vez de que cada spec muera por timeout.
setup("stack local de Supabase arriba", async ({ request }) => {
  await assertStackUp(request);
});
