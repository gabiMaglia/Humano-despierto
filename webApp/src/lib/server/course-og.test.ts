import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicSupabaseClient, createServiceRoleClient } = vi.hoisted(() => ({
  getPublicSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/supabase-public", () => ({ getPublicSupabaseClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { MAX_COVER_BYTES } from "@/lib/validation/image";
import { OG_COVER_KINDS, getCourseOgData, loadCoverForOg } from "./course-og";

const COVER = "covers/40000000-0000-4000-8000-00000000000a/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg";
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const JPG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const WEBP_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);
const PDF_BYTES = new TextEncoder().encode("%PDF-1.7 hola");

function publicClientReturning(row: unknown, error: unknown = null) {
  const eqStatus = vi.fn(() => ({ maybeSingle: async () => ({ data: row, error }) }));
  const eqSlug = vi.fn(() => ({ eq: eqStatus }));
  const select = vi.fn(() => ({ eq: eqSlug }));
  return { eqSlug, eqStatus, select, client: { from: vi.fn(() => ({ select })) } };
}

function storageReturning(result: { data: Blob | null; error: unknown } | Error) {
  const download = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const from = vi.fn(() => ({ download }));
  return { download, from, client: { storage: { from } } };
}

describe("getCourseOgData", () => {
  beforeEach(() => getPublicSupabaseClient.mockReset());

  it("filtra por slug Y por status published, con el cliente publico", async () => {
    const { client, eqSlug, eqStatus, select } = publicClientReturning({
      title: "Tarot ",
      title_em: "iniciático",
      discipline: "Tarot",
      roman_num: "IV",
      cover_path: COVER,
      teacher: [{ full_name: "Sol Mayor" }],
    });
    getPublicSupabaseClient.mockReturnValue(client);
    expect(await getCourseOgData("tarot-iniciatico")).toEqual({
      title: "Tarot ",
      titleEm: "iniciático",
      discipline: "Tarot",
      romanNum: "IV",
      teacherName: "Sol Mayor",
      coverPath: COVER,
    });
    expect(client.from).toHaveBeenCalledWith("courses");
    expect(String((select.mock.calls[0] as unknown[])[0])).toMatch(/cover_path/);
    expect(eqSlug).toHaveBeenCalledWith("slug", "tarot-iniciatico");
    expect(eqStatus).toHaveBeenCalledWith("status", "published");
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("borrador o inexistente (maybeSingle null): null", async () => {
    getPublicSupabaseClient.mockReturnValue(publicClientReturning(null).client);
    expect(await getCourseOgData("borrador")).toBeNull();
  });

  it("error de la consulta: lanza (no se disfraza de 404)", async () => {
    getPublicSupabaseClient.mockReturnValue(publicClientReturning(null, { message: "boom" }).client);
    await expect(getCourseOgData("x")).rejects.toThrow(/boom/);
  });
});

describe("loadCoverForOg", () => {
  beforeEach(() => createServiceRoleClient.mockReset());

  it("sin portada: null sin crear el cliente de service_role", async () => {
    expect(await loadCoverForOg(null)).toBeNull();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("un path que no es de portada: null sin crear el cliente (defensa aunque la base lo garantice)", async () => {
    for (const p of [
      "avatars/40000000-0000-4000-8000-00000000000a/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg",
      "covers/../x",
      `${COVER}/../../avatars/x.jpg`,
    ]) {
      expect(await loadCoverForOg(p)).toBeNull();
    }
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("path valido + PNG: los mismos bytes, leidos del bucket uploads", async () => {
    const s = storageReturning({ data: new Blob([PNG_BYTES]), error: null });
    createServiceRoleClient.mockReturnValue(s.client);
    const out = await loadCoverForOg(COVER);
    expect(new Uint8Array(out!)).toEqual(PNG_BYTES);
    expect(s.from).toHaveBeenCalledWith("uploads");
    expect(s.download).toHaveBeenCalledWith(COVER);
  });

  it("JPG pasa", async () => {
    createServiceRoleClient.mockReturnValue(storageReturning({ data: new Blob([JPG_BYTES]), error: null }).client);
    expect(await loadCoverForOg(COVER)).not.toBeNull();
  });

  it("download con error o que lanza: null (la tarjeta cae a la generativa, nunca un 500)", async () => {
    createServiceRoleClient.mockReturnValue(storageReturning({ data: null, error: { message: "not found" } }).client);
    expect(await loadCoverForOg(COVER)).toBeNull();
    createServiceRoleClient.mockReturnValue(storageReturning(new Error("red caida")).client);
    expect(await loadCoverForOg(COVER)).toBeNull();
  });

  it("mas grande que MAX_COVER_BYTES: null", async () => {
    const big = new Uint8Array(MAX_COVER_BYTES + 1);
    big.set(PNG_BYTES);
    createServiceRoleClient.mockReturnValue(storageReturning({ data: new Blob([big]), error: null }).client);
    expect(await loadCoverForOg(COVER)).toBeNull();
  });

  it("bytes que no son imagen (PDF): null", async () => {
    createServiceRoleClient.mockReturnValue(storageReturning({ data: new Blob([PDF_BYTES]), error: null }).client);
    expect(await loadCoverForOg(COVER)).toBeNull();
  });

  it("webp: null, porque resvg no la pinta (chequeo de Task 8 Step 1: 200 con la portada ausente)", async () => {
    expect(OG_COVER_KINDS).toEqual(["jpg", "png"]);
    createServiceRoleClient.mockReturnValue(storageReturning({ data: new Blob([WEBP_BYTES]), error: null }).client);
    expect(await loadCoverForOg(COVER)).toBeNull();
  });
});
