import { beforeEach, describe, expect, it, vi } from "vitest";

const retry = vi.hoisted(() => vi.fn(async () => ({ announcements: 2 })));
vi.mock("@/lib/server/mail/notify", () => ({ retryPendingAnnouncementMail: retry }));

import { GET } from "./route";

const req = (auth?: string) =>
  new Request("https://humano.example/api/mail/retry", { headers: auth ? { authorization: auth } : {} });

describe("GET /api/mail/retry", () => {
  beforeEach(() => {
    retry.mockClear();
    vi.stubEnv("CRON_SECRET", "s3creto-de-prueba-largo-1234567890");
  });

  it("sin secreto configurado responde 503 y no corre", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req("Bearer x"))).status).toBe(503);
    expect(retry).not.toHaveBeenCalled();
  });

  it.each([[undefined], ["Bearer otro"], ["s3creto-de-prueba-largo-1234567890"]])("credencial %s responde 401", async (a) => {
    expect((await GET(req(a))).status).toBe(401);
    expect(retry).not.toHaveBeenCalled();
  });

  it("con el secreto correcto corre y devuelve el conteo", async () => {
    const res = await GET(req("Bearer s3creto-de-prueba-largo-1234567890"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ announcements: 2 });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
