import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";
import { PAGE_SIZE, pageHref, parseListParams, splitPage } from "./list-params";

const ID = "1049aaaa-0000-4000-8000-000000000011";
const AT = "2026-10-21 12:00:00.0005+00";

describe("cursor", () => {
  it("ida y vuelta conserva el timestamp tal cual, con microsegundos", () => {
    expect(decodeCursor(encodeCursor({ at: AT, id: ID }))).toEqual({ at: AT, id: ID });
    const iso = "2026-10-21T12:00:00.123456+00:00";
    expect(decodeCursor(encodeCursor({ at: iso, id: ID }))?.at).toBe(iso);
  });

  it.each([
    [undefined],
    [""],
    ["no base64 !"],
    [Buffer.from(`${AT}${ID}`).toString("base64url")],
    [Buffer.from(`ayer|${ID}`).toString("base64url")],
    [Buffer.from(`${AT}|no-uuid`).toString("base64url")],
    [Buffer.from(`2026-13-01 00:00:00+00|${ID}`).toString("base64url")],
    [Buffer.from(`${AT}|${ID}' or 1=1`).toString("base64url")],
    ["A".repeat(500)],
  ])("un after manipulado o malformado arranca de cero (c.9): %s", (raw) => {
    expect(decodeCursor(raw)).toBeNull();
  });
});

describe("parámetros de lista", () => {
  it("q se recorta y se acota; vacío es null", () => {
    expect(parseListParams({ q: "  delf  " }).q).toBe("delf");
    expect(parseListParams({ q: "   " }).q).toBeNull();
    expect(parseListParams({ q: ["a", "b"] }).q).toBeNull();
    expect(parseListParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  it("after inválido es null; válido se decodifica", () => {
    expect(parseListParams({ after: "basura" }).after).toBeNull();
    expect(parseListParams({ after: encodeCursor({ at: AT, id: ID }) }).after).toEqual({ at: AT, id: ID });
  });

  it("splitPage corta en 25 y el cursor es el de la última fila MOSTRADA", () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({ id: `${i}`, at: `t${i}` }));
    const page = splitPage(rows, (r) => ({ at: r.at, id: r.id }));
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.next).toBe(encodeCursor({ at: "t24", id: "24" }));
    expect(splitPage(rows.slice(0, PAGE_SIZE), (r) => ({ at: r.at, id: r.id })).next).toBeNull();
  });

  it("pageHref arma la URL sin parámetros vacíos", () => {
    expect(pageHref("/panel/admin/usuarios", null, null)).toBe("/panel/admin/usuarios");
    expect(pageHref("/panel/admin/usuarios", "delf & co", "abc")).toBe("/panel/admin/usuarios?q=delf+%26+co&after=abc");
  });
});
