import { describe, expect, it } from "vitest";
import { closingHref, nextLesson, parseStartSeconds, type NavModule } from "./navigation";

type State = NavModule["lessons"][number]["state"];
const L = (id: string, position: number, state: State = "pending") => ({
  id,
  position,
  title: `T-${id}`,
  state,
});

const MODULES: NavModule[] = [
  { position: 1, lessons: [L("a", 1), L("b", 2)] },
  { position: 2, lessons: [L("c", 1, "locked"), L("d", 2)] },
];

describe("nextLesson", () => {
  it("a mitad del curso devuelve la siguiente del mismo modulo", () => {
    expect(nextLesson(MODULES, "a")).toEqual({ id: "b", title: "T-b" });
  });

  it("al final de un modulo salta al siguiente y se salta las locked", () => {
    expect(nextLesson(MODULES, "b")).toEqual({ id: "d", title: "T-d" });
  });

  it("en la ultima no hay siguiente", () => {
    expect(nextLesson(MODULES, "d")).toBeNull();
  });

  it("ordena por (modulo, posicion) aunque lleguen desordenados", () => {
    const shuffled: NavModule[] = [
      { position: 2, lessons: [L("d", 2), L("c", 1)] },
      { position: 1, lessons: [L("b", 2), L("a", 1)] },
    ];
    expect(nextLesson(shuffled, "b")).toEqual({ id: "c", title: "T-c" });
  });

  it("una leccion desconocida no tiene siguiente", () => {
    expect(nextLesson(MODULES, "zzz")).toBeNull();
  });
});

describe("closingHref", () => {
  it("con certificado linkea al certificado", () => {
    expect(closingHref("ABC123")).toBe("/certificado/ABC123");
  });
  it("sin certificado vuelve al panel", () => {
    expect(closingHref(null)).toBe("/panel");
  });
});

describe("parseStartSeconds", () => {
  it.each([
    ["754", 754],
    ["0", 0],
    ["120", 120],
  ])("acepta %s", (raw, expected) => expect(parseStartSeconds(raw, 1000)).toBe(expected));

  it.each([["abc"], ["-3"], ["1.5"], [""], ["12abc"], [undefined], [["1", "2"]]])(
    "ignora %j",
    (raw) => expect(parseStartSeconds(raw as string | undefined, 1000)).toBeNull(),
  );

  it("recorta a la duracion", () => {
    expect(parseStartSeconds("5000", 888)).toBe(888);
  });

  it("sin duracion conocida (0) no recorta", () => {
    expect(parseStartSeconds("5000", 0)).toBe(5000);
  });
});
