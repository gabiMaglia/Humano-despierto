// Validacion de imagenes subidas (avatar de T-042, portada de T-047) por sus BYTES, no por la
// extension ni el Content-Type: los dos los decide quien sube. Sin `server-only`: los formularios
// reusan los topes para avisar antes de enviar. SVG queda afuera a proposito: es HTML con scripts.

export type ImageKind = "jpg" | "png" | "webp";

export const IMAGE_MIME: Record<ImageKind, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const IMAGE_ACCEPT = Object.values(IMAGE_MIME).join(",");
/** @deprecated alias de T-042; usar IMAGE_ACCEPT. */
export const AVATAR_ACCEPT = IMAGE_ACCEPT;

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_COVER_BYTES = 3 * 1024 * 1024;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Espejo de `profiles_avatar_path_no_locator` (0028). */
export const AVATAR_PATH_RE = new RegExp(`^avatars/${UUID}/${UUID}\\.(jpg|png|webp)$`);

/** Espejo de `courses_cover_path_no_locator` (0030), sin la pertenencia: esa la ata el CHECK al id. */
export const COVER_PATH_RE = new RegExp(`^covers/${UUID}/${UUID}\\.(jpg|png|webp)$`);

const UUID_RE = new RegExp(`^${UUID}$`);
export const isUuid = (value: string) => UUID_RE.test(value);

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

export function exceedsCoverLimit(size: number): boolean {
  return size > MAX_COVER_BYTES;
}

export type ImageCheck = { ok: true; kind: ImageKind } | { ok: false; error: string };
export type AvatarCheck = ImageCheck;

const megabytes = (bytes: number) => `${bytes / (1024 * 1024)} MB`;

export function checkImageBytes(bytes: Uint8Array, maxBytes: number): ImageCheck {
  if (bytes.byteLength === 0) return { ok: false, error: "Elegí una imagen." };
  if (bytes.byteLength > maxBytes) return { ok: false, error: `La imagen pesa más de ${megabytes(maxBytes)}.` };
  const kind = detectImageKind(bytes);
  if (!kind) return { ok: false, error: "La imagen tiene que ser JPG, PNG o WEBP." };
  return { ok: true, kind };
}

export const checkAvatarBytes = (bytes: Uint8Array) => checkImageBytes(bytes, MAX_AVATAR_BYTES);
export const checkCoverBytes = (bytes: Uint8Array) => checkImageBytes(bytes, MAX_COVER_BYTES);

export function buildAvatarPath(userId: string, fileId: string, kind: ImageKind): string {
  return `avatars/${userId}/${fileId}.${kind}`;
}

export function buildCoverPath(courseId: string, fileId: string, kind: ImageKind): string {
  return `covers/${courseId}/${fileId}.${kind}`;
}
