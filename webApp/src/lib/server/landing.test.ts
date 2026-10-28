import { beforeEach, describe, expect, it, vi } from "vitest";
import { argsOf, queryChain, type ChainCall } from "@/test/query-chain";

const { admin, publicClient, unstableCache } = vi.hoisted(() => ({
  admin: { from: vi.fn() },
  publicClient: { from: vi.fn() },
  // Pasa de largo: el test mira CON QUÉ se cachea, no la caché de Next.
  unstableCache: vi.fn((...args: unknown[]) => args[0]),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: unstableCache }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: () => admin }));
vi.mock("@/lib/server/supabase-public", () => ({ getPublicSupabaseClient: () => publicClient }));
vi.mock("@/lib/server/log", () => ({ log: { error: vi.fn() } }));

import { getLandingData } from "./landing";

// Registrado al importar: las llamadas a unstable_cache pasan una sola vez, al cargar el módulo.
const cacheCalls = [...unstableCache.mock.calls];

type Log = { table: string; calls: ChainCall[] }[];

function wire(client: { from: ReturnType<typeof vi.fn> }, resolve: (table: string, calls: ChainCall[]) => unknown, log: Log) {
  client.from.mockImplementation((table: string) => {
    const { chain, calls } = queryChain((c) => resolve(table, c));
    log.push({ table, calls });
    return chain;
  });
}

const selectOf = (calls: ChainCall[]) => calls.find((c) => c.method === "select")!;

describe("getLandingData · conteos (D-41)", () => {
  let log: Log;
  beforeEach(() => {
    log = [];
    wire(admin, (table, calls) => {
      const opts = selectOf(calls).args[1] as { count?: string; head?: boolean } | undefined;
      if (opts?.head) {
        const cols = String(selectOf(calls).args[0]);
        if (table === "courses") return { count: 1500, data: null, error: null };
        if (cols.includes("enrollments")) return { count: 2400, data: null, error: null };
        if (cols.includes("courses")) return { count: 12, data: null, error: null };
      }
      if (table === "courses") return { data: [{ discipline: "Tarot" }, { discipline: "Reiki" }, { discipline: "Tarot" }], error: null };
      return { data: null, error: { message: `consulta inesperada a ${table}` } };
    }, log);
    wire(publicClient, () => ({ data: [], error: null }), []);
  });

  it("cuenta cursos, guías y alumnas con count exact + head, sin traer filas que PostgREST trunca a 1000", async () => {
    const data = await getLandingData();
    expect(data.stats).toEqual([
      { num: "1500", label: "Cursos" },
      { num: "12", label: "Guías" },
      { num: "2400", label: "Inscriptas" },
    ]);
    expect(data.disciplines.map((d) => [d.key, d.count])).toEqual([["tarot", 2], ["reiki", 1]]);

    const heads = log.filter((l) => (selectOf(l.calls).args[1] as { head?: boolean } | undefined)?.head);
    expect(heads).toHaveLength(3);
    for (const h of heads) expect(selectOf(h.calls).args[1]).toEqual({ count: "exact", head: true });
    // Alumnas y guías DISTINTAS: se cuentan perfiles con al menos una fila, no filas de inscripción.
    const students = heads.find((h) => String(selectOf(h.calls).args[0]).includes("enrollments"))!;
    expect(students.table).toBe("profiles");
    expect(String(selectOf(students.calls).args[0])).toMatch(/!inner/);
    expect(students.calls.map((c) => c.args)).toContainEqual(["enrollments.status", "active"]);
    expect(log.some((l) => l.table === "enrollments")).toBe(false);
  });
});

describe("getLandingData · disciplinas sin el corte de 1000 (DT4)", () => {
  it("pagina las filas de disciplina hasta la última página", async () => {
    const log: Log = [];
    wire(admin, (table, calls) => {
      const opts = selectOf(calls).args[1] as { head?: boolean } | undefined;
      if (opts?.head) return { count: 1, data: null, error: null };
      const range = calls.find((c) => c.method === "range")?.args as [number, number] | undefined;
      if (!range) return { data: null, error: { message: "sin range" } };
      const [from] = range;
      const rows = from === 0 ? 1000 : from === 1000 ? 5 : 0;
      return { data: Array.from({ length: rows }, () => ({ discipline: from === 0 ? "Tarot" : "Reiki" })), error: null };
    }, log);
    wire(publicClient, () => ({ data: [], error: null }), []);
    const data = await getLandingData();
    expect(data.disciplines.map((d) => [d.key, d.count])).toEqual([["tarot", 1000], ["reiki", 5]]);
    const pages = log.filter((l) => l.calls.some((c) => c.method === "range")).map((l) => argsOf(l.calls, "range"));
    expect(pages).toEqual([[0, 999], [1000, 1999]]);
  });
});

describe("getLandingData · caché (D-40)", () => {
  it("cachea conteos y testimonios 10 minutos, cada uno por su lado", () => {
    expect(cacheCalls).toHaveLength(2);
    for (const [, key, opts] of cacheCalls) {
      expect(key).toEqual(expect.arrayContaining([expect.stringMatching(/^landing-/)]));
      expect(opts).toMatchObject({ revalidate: 600, tags: ["landing"] });
    }
  });
});
