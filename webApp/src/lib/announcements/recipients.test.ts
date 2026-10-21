import { describe, expect, it } from "vitest";
import { ANNOUNCEMENT_MAIL_CONCURRENCY, buildAnnouncementRecipients } from "./recipients";

const AUTORA = "20000000-0000-4000-8000-00000000000a";

describe("buildAnnouncementRecipients", () => {
  it("una por inscripta, sin la autora", () => {
    expect(
      buildAnnouncementRecipients([{ user_id: "u-1" }, { user_id: AUTORA }, { user_id: "u-2" }], AUTORA),
    ).toEqual(["u-1", "u-2"]);
  });

  it("deduplica: una inscripta repetida recibe UN mail", () => {
    expect(buildAnnouncementRecipients([{ user_id: "u-1" }, { user_id: "u-1" }], AUTORA)).toEqual(["u-1"]);
  });

  it("descarta ids vacíos o nulos en vez de reclamar un turno sin destinataria", () => {
    expect(buildAnnouncementRecipients([{ user_id: "" }, { user_id: null }, { user_id: "u-3" }], AUTORA)).toEqual(["u-3"]);
  });

  it("orden estable (el de la consulta), para que dos corridas recorran igual", () => {
    expect(buildAnnouncementRecipients([{ user_id: "u-b" }, { user_id: "u-a" }], AUTORA)).toEqual(["u-b", "u-a"]);
  });

  it("sin inscriptas, lista vacía", () => {
    expect(buildAnnouncementRecipients([], AUTORA)).toEqual([]);
  });

  it("la concurrencia del envío es 5 (spec)", () => {
    expect(ANNOUNCEMENT_MAIL_CONCURRENCY).toBe(5);
  });
});
