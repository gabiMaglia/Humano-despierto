import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadCertificate } = vi.hoisted(() => ({ loadCertificate: vi.fn() }));
vi.mock("./data", () => ({ loadCertificate }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import CertificadoLayout from "./layout";

const run = (code: string) => CertificadoLayout({ children: null, params: Promise.resolve({ code }) });

describe("D-47 / D-108 · /certificado/[code]", () => {
  beforeEach(() => loadCertificate.mockReset());

  it("un código inexistente da 404 desde el layout, antes del streaming de loading.tsx", async () => {
    loadCertificate.mockResolvedValue(null);
    await expect(run("0".repeat(32))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("un código válido deja pasar", async () => {
    loadCertificate.mockResolvedValue({ studentName: "A" });
    await expect(run("a".repeat(32))).resolves.toBeDefined();
  });
});
