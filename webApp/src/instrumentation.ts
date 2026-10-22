import type { Instrumentation } from "next";

// `register()` corre una vez por instancia y antes de servir requests (Next 16). T-054 valida
// acá la config de mail (ADR-014): con un error, el servidor no tiene que atender a nadie.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { parseMailEnv } = await import("./lib/mail/mail-env");
  try {
    parseMailEnv(process.env);
  } catch (err) {
    const { log } = await import("./lib/server/log");
    await log.error("config_invalid", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportRequestError } = await import("./lib/server/request-error");
  await reportRequestError(err, request, context);
};
