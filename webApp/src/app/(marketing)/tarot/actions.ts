"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/validation/zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { decodeReading } from "@/lib/tarot/codec";
import { sanitizeQuestion } from "@/lib/tarot/question";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";

const SESSION_EXPIRED: ActionState = { error: "Tu sesión venció. Volvé a entrar.", success: null };

export const saveTarotReadingAction = withRateLimit(
  "saveTarotReadingAction",
  async function saveTarotReadingAction(_prev: ActionState, formData: FormData): Promise<ActionState & { id?: string }> {
    const reading = decodeReading(String(formData.get("t") ?? ""), String(formData.get("c") ?? ""));
    if (!reading) return { error: "La tirada no es válida.", success: null };
    const reversedEnabled = String(formData.get("inv") ?? "1") !== "0";
    if (!reversedEnabled && reading.cards.some((c) => c.reversed)) {
      return { error: "La tirada tiene cartas invertidas pero las invertidas estaban apagadas.", success: null };
    }
    const question = sanitizeQuestion(String(formData.get("q") ?? ""));

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;

    const { data, error } = await supabase
      .from("tarot_readings")
      .insert({ spread_id: reading.spread, question, cards: reading.cards.map((c) => ({ i: c.indice, r: c.reversed })), reversed_enabled: reversedEnabled })
      .select("id")
      .single();
    if (error || !data) return { error: "No se pudo guardar la tirada.", success: null };

    revalidatePath("/panel/tarot");
    return { error: null, success: "Tirada guardada.", id: data.id };
  },
  limitedState,
);

export const deleteTarotReadingAction = withRateLimit(
  "deleteTarotReadingAction",
  async function deleteTarotReadingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const id = z.string().uuid().safeParse(formData.get("id"));
    if (!id.success) return { error: "Tirada inválida.", success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;
    const { data, error } = await supabase.from("tarot_readings").delete().eq("id", id.data).select("id");
    if (error) return { error: "No se pudo borrar la tirada.", success: null };
    if (!data || data.length === 0) return { error: "No encontramos esa tirada.", success: null };
    revalidatePath("/panel/tarot");
    return { error: null, success: "Tirada borrada." };
  },
  limitedState,
);
