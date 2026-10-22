import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("baja a minúsculas y recorta", () => {
    expect(normalizeEmail("  Nueva@Mail.COM ")).toBe("nueva@mail.com");
  });
  it.each([[null], [undefined], [""], ["sin-arroba"], ["a@b"], [`${"x".repeat(320)}@mail.com`], [42]])("rechaza %s", (raw) => {
    expect(normalizeEmail(raw)).toBeNull();
  });
});
