import "server-only";
import { z } from "@/lib/validation/zod";
import { createClient } from "@/lib/supabase/server";
import type { Reading } from "@/lib/tarot/codec";
import { isSpreadSlug } from "@/lib/tarot/spreads";

export type SavedReading = { id: string; reading: Reading; question: string | null; createdAt: string };

const rowSchema = z.object({
  id: z.string(),
  spread_id: z.string(),
  question: z.string().nullable(),
  cards: z.array(z.object({ i: z.number().int(), r: z.boolean() })),
  created_at: z.string(),
});

function toSaved(row: unknown): SavedReading | null {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) return null;
  const d = parsed.data;
  const spread = d.spread_id;
  if (!isSpreadSlug(spread)) return null;
  return { id: d.id, question: d.question, createdAt: d.created_at, reading: { spread, cards: d.cards.map((c) => ({ indice: c.i, reversed: c.r })) } };
}

const COLUMNS = "id, spread_id, question, cards, created_at";

/** RLS ya filtra por dueña: una tirada ajena simplemente no vuelve. */
export async function getSavedReading(id: string): Promise<SavedReading | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("tarot_readings").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toSaved(data) : null;
}

export async function listSavedReadings(): Promise<SavedReading[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tarot_readings").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
  return (data ?? []).map(toSaved).filter((r): r is SavedReading => r !== null);
}
