"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET } from "@/lib/server/avatar";
import type { ActionState } from "@/lib/action-state";
import { profileFormSchema, toProfileUpdate } from "@/lib/validation/profile";
import { buildAvatarPath, checkAvatarBytes, IMAGE_MIME } from "@/lib/validation/image";
import { firstIssueMessage } from "@/lib/validation/teacher";

const SESSION_EXPIRED: ActionState = { error: "Tu sesión venció. Volvé a entrar.", success: null };

async function sessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// 42501 lo levanta `profiles_locator_guard` (0025/0028): la coincidencia EXACTA consulta `lessons` y
// ningun zod la replica. 23514/22008 solo llegan si el espejo zod quedo atras del CHECK.
function translateDbError(code: string | undefined, fallback: string): string {
  if (code === "42501") {
    return "El nombre o la bio contienen el identificador de un video o de un archivo de una lección. Ese dato es de contenido pago y no puede aparecer en tu perfil.";
  }
  if (code === "23514" || code === "22008") {
    return "Algún dato no tiene el formato esperado. Revisá el teléfono y la fecha.";
  }
  return fallback;
}

function revalidateProfile() {
  revalidatePath("/panel/perfil");
  revalidatePath("/guias/[slug]", "page");
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileFormSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };

  const { supabase, user } = await sessionUser();
  if (!user) return SESSION_EXPIRED;

  const { error } = await supabase.from("profiles").update(toProfileUpdate(parsed.data)).eq("id", user.id);
  if (error) return { error: translateDbError(error.code, "No se pudo guardar el perfil."), success: null };

  revalidateProfile();
  return { error: null, success: "Perfil guardado." };
}

export async function clearBirthDateAction(): Promise<ActionState> {
  const { supabase, user } = await sessionUser();
  if (!user) return SESSION_EXPIRED;

  const { error } = await supabase.from("profiles").update({ birth_date: null }).eq("id", user.id);
  if (error) return { error: "No se pudo borrar la fecha.", success: null };

  revalidatePath("/panel/perfil");
  return { error: null, success: "Fecha de nacimiento borrada." };
}

export async function uploadAvatarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("avatar");
  if (!(file instanceof File)) return { error: "Elegí una imagen.", success: null };

  // Se valida antes de crear el cliente: un archivo invalido no tiene por que abrir una sesion.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkAvatarBytes(bytes);
  if (!check.ok) return { error: check.error, success: null };

  const { supabase, user } = await sessionUser();
  if (!user) return SESSION_EXPIRED;

  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const path = buildAvatarPath(user.id, crypto.randomUUID(), check.kind);
  const bucket = supabase.storage.from(AVATAR_BUCKET);

  // Cliente de sesion, no service_role: si este codigo armara mal la carpeta, la policy de Storage
  // lo frena. Es la segunda barrera y solo existe si se sube como la usuaria.
  const { error: uploadError } = await bucket.upload(path, bytes, {
    contentType: IMAGE_MIME[check.kind],
    upsert: false,
  });
  if (uploadError) return { error: "No se pudo subir la imagen.", success: null };

  const { error: updateError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (updateError) {
    await bucket.remove([path]);
    return { error: "No se pudo guardar la imagen en tu perfil.", success: null };
  }

  // Si falla, queda un objeto sin referencia; no justifica revertir un avatar que ya se ve bien.
  if (current?.avatar_path) await bucket.remove([current.avatar_path]);

  revalidateProfile();
  return { error: null, success: "Imagen actualizada." };
}

export async function removeAvatarAction(): Promise<ActionState> {
  const { supabase, user } = await sessionUser();
  if (!user) return SESSION_EXPIRED;

  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  if (!current?.avatar_path) return { error: null, success: "No tenías imagen." };

  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (error) return { error: "No se pudo quitar la imagen.", success: null };

  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([current.avatar_path]);
  if (removeError) {
    console.error("T-042: el avatar quedo sin referencia en Storage", current.avatar_path, removeError.message);
  }

  revalidateProfile();
  return { error: null, success: "Imagen quitada." };
}
