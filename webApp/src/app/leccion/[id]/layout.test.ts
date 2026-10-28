import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLessonPlayerData } = vi.hoisted(() => ({ getLessonPlayerData: vi.fn() }));
vi.mock("@/lib/server/lesson-player", () => ({ getLessonPlayerData }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import LeccionLayout from "./layout";

const UUID = "0b9c1a52-6f0e-4d57-9a3e-2f1d8c7b6a41";
const run = (id: string) => LeccionLayout({ children: null, params: Promise.resolve({ id }) });

describe("D-29 · /leccion/[id]", () => {
  beforeEach(() => getLessonPlayerData.mockReset());

  it("un id que no es UUID da 404 sin consultar la base", async () => {
    await expect(run("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getLessonPlayerData).not.toHaveBeenCalled();
  });

  it("un UUID sin lección (o sin acceso) da 404", async () => {
    getLessonPlayerData.mockResolvedValue(null);
    await expect(run(UUID)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("un UUID con acceso deja pasar", async () => {
    getLessonPlayerData.mockResolvedValue({ lessonId: UUID });
    await expect(run(UUID)).resolves.toBeDefined();
  });
});
