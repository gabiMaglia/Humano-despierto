// Validacion del avatar por sus BYTES, no por la extension ni el Content-Type: los dos los decide
// quien sube. Sin `server-only`: el formulario reusa el tope de tamano para avisar antes de enviar.
// SVG queda afuera a proposito: es HTML con scripts, no una imagen.

export type ImageKind = "jpg" | "png" | "webp";

export const IMAGE_MIME: Record<ImageKind, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const AVATAR_ACCEPT = Object.values(IMAGE_MIME).join(",");

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Espejo de `profiles_avatar_path_no_locator` (0028). */
export const AVATAR_PATH_RE = new RegExp(`^avatars/${UUID}/${UUID}\\.(jpg|png|webp)$`);

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);
}

export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // RIFF es un contenedor (WAV, AVI usan el mismo): WEBP se confirma en el byte 8.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export function exceedsAvatarLimit(size: number): boolean {
  return size > MAX_AVATAR_BYTES;
}

export type AvatarCheck = { ok: true; kind: ImageKind } | { ok: false; error: string };

export function checkAvatarBytes(bytes: Uint8Array): AvatarCheck {
  if (bytes.byteLength === 0) return { ok: false, error: "Elegí una imagen." };
  if (exceedsAvatarLimit(bytes.byteLength)) return { ok: false, error: "La imagen pesa más de 2 MB." };
  const kind = detectImageKind(bytes);
  if (!kind) return { ok: false, error: "La imagen tiene que ser JPG, PNG o WEBP." };
  return { ok: true, kind };
}

export function buildAvatarPath(userId: string, fileId: string, kind: ImageKind): string {
  return `avatars/${userId}/${fileId}.${kind}`;
}
