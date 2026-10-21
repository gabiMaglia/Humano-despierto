import "server-only";
import { createHash, randomBytes } from "node:crypto";

// 32 bytes en base64url sin relleno: 43 caracteres que safeNext acepta tal cual en un path.
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

function sha256Hex(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** El token en claro sale una sola vez, en el mail; la base guarda solo el hash. */
export function newInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256Hex(token) };
}

export function hashInvitationToken(token: string): string | null {
  return TOKEN_SHAPE.test(token) ? sha256Hex(token) : null;
}

export function invitationPath(token: string): string {
  return `/invitacion/${token}`;
}
