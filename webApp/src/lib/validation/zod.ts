import { z } from "zod";

// Zod 4 prueba `new Function("")` para decidir si compila los schemas (JIT). Con la CSP sin
// 'unsafe-eval' esa sonda sale como violacion aunque Zod atrape el error (T-052: medido en
// /entrar contra el build). jitless la saltea. Todo import de zod pasa por aca (zod.test.ts).
z.config({ jitless: true });

export { z };
