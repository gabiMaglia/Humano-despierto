import { beforeEach, describe, expect, it, vi } from "vitest";
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));

const { createClient, requireTeacher, assertOwnsPost } = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireTeacher: vi.fn(),
  assertOwnsPost: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/server/teacher", () => ({ requireTeacher }));
vi.mock("@/lib/server/diario", () => ({ assertOwnsPost }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createPostAction, updatePostAction } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const INITIAL = { error: null, success: null };

function postForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ postId: "p1", slug: "sobre-eclipses", title: "Eclipses", excerpt: "", body: "Texto", ...overrides })) fd.set(k, v);
  return fd;
}

function updateFailingWith(code: string) {
  createClient.mockResolvedValue({ from: () => ({ update: () => ({ eq: async () => ({ error: { code, message: code } }) }) }) });
}

describe("post actions · error por campo (D-100)", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
    createClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsPost.mockReset().mockResolvedValue(undefined);
  });

  it("un campo inválido vuelve con su nombre", async () => {
    expect(await createPostAction(INITIAL, postForm({ slug: "Con Espacios" }))).toMatchObject({ field: "slug" });
    expect(await updatePostAction(INITIAL, postForm({ body: "   " }))).toMatchObject({ field: "body" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("slug repetido marca el slug; un localizador en el cuerpo marca el cuerpo", async () => {
    updateFailingWith("23505");
    expect((await updatePostAction(INITIAL, postForm())).field).toBe("slug");
    updateFailingWith("42501");
    expect((await updatePostAction(INITIAL, postForm())).field).toBe("body");
  });
});
