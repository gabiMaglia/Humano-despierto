import "server-only";
import { parseMailEnv, type MailConfig } from "@/lib/mail/mail-env";

/** Único lugar que le pasa `process.env` a la validación pura. Sin memo: el cache vive en
 * `send.ts`, junto al transporte que se arma con esto. */
export function getMailConfig(): MailConfig {
  return parseMailEnv(process.env);
}
