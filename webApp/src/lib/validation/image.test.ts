import { describe, expect, it } from "vitest";
import {
  AVATAR_PATH_RE,
  COVER_PATH_RE,
  MAX_AVATAR_BYTES,
  MAX_COVER_BYTES,
  buildAvatarPath,
  buildCoverPath,
  checkAvatarBytes,
  checkCoverBytes,
  detectImageKind,
  isUuid,
} from "./image";

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const WAV = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
const UID = "20000000-0000-4000-8000-00000000000a";
const FILE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function withHeader(size: number, header: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(header);
  return bytes;
}

describe("detectImageKind", () => {
  it("reconoce jpg, png y webp por sus bytes", () => {
    expect(detectImageKind(JPG)).toBe("jpg");
    expect(detectImageKind(PNG)).toBe("png");
    expect(detectImageKind(WEBP)).toBe("webp");
  });

  it("no acepta PDF, SVG ni un RIFF que no es WEBP", () => {
    expect(detectImageKind(PDF)).toBeNull();
    expect(detectImageKind(SVG)).toBeNull();
    expect(detectImageKind(WAV)).toBeNull();
    expect(detectImageKind(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("checkAvatarBytes", () => {
  it("2 MB exactos con cabecera JPEG pasan; un byte mas no", () => {
    expect(checkAvatarBytes(withHeader(MAX_AVATAR_BYTES, JPG))).toEqual({ ok: true, kind: "jpg" });
    const big = checkAvatarBytes(withHeader(MAX_AVATAR_BYTES + 1, JPG));
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toMatch(/2 MB/);
  });

  it("un PDF con nombre .jpg se rechaza por sus bytes", () => {
    const r = checkAvatarBytes(PDF);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JPG, PNG o WEBP/);
  });

  it("vacio se rechaza", () => {
    expect(checkAvatarBytes(new Uint8Array(0)).ok).toBe(false);
  });
});

describe("buildAvatarPath", () => {
  it("arma avatars/<uid>/<uuid>.<ext> y cumple el mismo regex que el CHECK de 0028", () => {
    const path = buildAvatarPath(UID, FILE_ID, "webp");
    expect(path).toBe(`avatars/${UID}/${FILE_ID}.webp`);
    expect(AVATAR_PATH_RE.test(path)).toBe(true);
  });

  it("el regex rechaza nombres libres y extensiones fuera de lista", () => {
    expect(AVATAR_PATH_RE.test(`avatars/${UID}/foto.jpg`)).toBe(false);
    expect(AVATAR_PATH_RE.test(`avatars/${UID}/${FILE_ID}.gif`)).toBe(false);
    expect(AVATAR_PATH_RE.test(`covers/${UID}/${FILE_ID}.jpg`)).toBe(false);
  });
});

const COURSE = "40000000-0000-4000-8000-00000000000a";

describe("checkCoverBytes", () => {
  it("3 MB exactos con cabecera PNG pasan; un byte mas no, con el tope en el mensaje (c.2)", () => {
    expect(checkCoverBytes(withHeader(MAX_COVER_BYTES, PNG))).toEqual({ ok: true, kind: "png" });
    const big = checkCoverBytes(withHeader(MAX_COVER_BYTES + 1, PNG));
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toMatch(/3 MB/);
  });

  it("un PDF renombrado .png se rechaza por sus bytes (c.2)", () => {
    const r = checkCoverBytes(PDF);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JPG, PNG o WEBP/);
  });

  it("el avatar conserva su tope de 2 MB y su mensaje (la generalizacion no lo movio)", () => {
    const avatar = checkAvatarBytes(withHeader(MAX_AVATAR_BYTES + 1, JPG));
    expect(avatar).toEqual({ ok: false, error: "La imagen pesa más de 2 MB." });
    expect(checkCoverBytes(withHeader(MAX_AVATAR_BYTES + 1, JPG)).ok).toBe(true);
  });
});

describe("buildCoverPath / COVER_PATH_RE", () => {
  it("arma covers/<course_id>/<uuid>.<ext> y cumple el regex del CHECK", () => {
    const path = buildCoverPath(COURSE, FILE_ID, "jpg");
    expect(path).toBe(`covers/${COURSE}/${FILE_ID}.jpg`);
    expect(COVER_PATH_RE.test(path)).toBe(true);
  });

  it("rechaza nombre libre, extension fuera de lista y la carpeta de avatares", () => {
    expect(COVER_PATH_RE.test(`covers/${COURSE}/portada.jpg`)).toBe(false);
    expect(COVER_PATH_RE.test(`covers/${COURSE}/${FILE_ID}.svg`)).toBe(false);
    expect(COVER_PATH_RE.test(`avatars/${COURSE}/${FILE_ID}.jpg`)).toBe(false);
  });
});

describe("isUuid", () => {
  it("acepta uuid en minuscula y rechaza lo demas", () => {
    expect(isUuid(COURSE)).toBe(true);
    expect(isUuid("tarot-iniciatico")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(`${COURSE}/../x`)).toBe(false);
  });
});
