"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireTeacher } from "@/lib/server/teacher";
import { assertOwnsPost } from "@/lib/server/diario";
import { diarioPostFormSchema } from "@/lib/validation/diario";
import { firstIssue } from "@/lib/validation/teacher";
import type { TeacherActionState } from "@/lib/teacher/action-state";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";

function readPostForm(formData: FormData) {
  return diarioPostFormSchema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
}

function invalid(error: Parameters<typeof firstIssue>[0]): TeacherActionState {
  const { field, message } = firstIssue(error);
  return { error: message, success: null, ...(field ? { field } : {}) };
}

// El 23514/42501 lo levanta el guard del cuerpo (0018): título y resumen ya los frenó Zod.
const BODY_LOCATOR: TeacherActionState = {
  error: "El cuerpo no puede contener el link o id de un material pago de la plataforma.",
  success: null,
  field: "body",
};

// Criterio 1: nace en draft. `teacher_id` viaja en el INSERT (0018 lo permite) pero
// `diario_posts_insert_own` (RLS) exige `teacher_id = auth.uid()`, y `guard_diario_posts`
// rechaza cualquier `status`/`published_at` que el cliente intente declarar — nace en
// borrador sin que este código tenga que repetirlo.
export const createPostAction = withRateLimit(
  "createPostAction",
  async function createPostAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const parsed = readPostForm(formData);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;

    let newPostId: string | null = null;
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("diario_posts")
        .insert({
          teacher_id: teacher.id,
          slug: v.slug,
          title: v.title,
          excerpt: v.excerpt || null,
          body: v.body,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") return { error: "Ya existe un post con ese slug. Elegí otro.", success: null, field: "slug" };
        if (error.code === "23514" || error.code === "42501") return BODY_LOCATOR;
        return { error: `No se pudo crear el post: ${error.message}`, success: null };
      }
      newPostId = data.id;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo crear el post.", success: null };
    }

    revalidatePath("/panel/docente/diario");
    redirect(`/panel/docente/diario/${newPostId}`);
  },
  limitedState,
);

export const updatePostAction = withRateLimit(
  "updatePostAction",
  async function updatePostAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const postId = String(formData.get("postId") ?? "");
    if (!postId) return { error: "Falta el post.", success: null };

    const parsed = readPostForm(formData);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;

    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { error } = await supabase
        .from("diario_posts")
        .update({ slug: v.slug, title: v.title, excerpt: v.excerpt || null, body: v.body })
        .eq("id", postId);

      if (error) {
        if (error.code === "23505") return { error: "Ya existe un post con ese slug.", success: null, field: "slug" };
        if (error.code === "23514" || error.code === "42501") return BODY_LOCATOR;
        return { error: `No se pudo guardar: ${error.message}`, success: null };
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo guardar el post.", success: null };
    }

    revalidatePath(`/panel/docente/diario/${postId}`);
    revalidatePath("/panel/docente/diario");
    return { error: null, success: "Post actualizado." };
  },
  limitedState,
);

export const deletePostAction = withRateLimit(
  "deletePostAction",
  async function deletePostAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const postId = String(formData.get("postId") ?? "");
    if (!postId) return { error: "Falta el post.", success: null };

    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { error } = await supabase.from("diario_posts").delete().eq("id", postId);
      if (error) return { error: `No se pudo borrar el post: ${error.message}`, success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo borrar el post.", success: null };
    }

    revalidatePath("/panel/docente/diario");
    redirect("/panel/docente/diario");
  },
  limitedState,
);

// Criterio 1/3: publicar es explícito y es privilegio de service_role — `status`/`published_at`
// están fuera del grant de UPDATE del cliente (0018) y bloqueados además por `guard_diario_posts`
// (ADR-008: whitelist + guard). Mismo patrón que `setCoursePublishedAction`.
export const setPostPublishedAction = withRateLimit(
  "setPostPublishedAction",
  async function setPostPublishedAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const postId = String(formData.get("postId") ?? "");
    const nextStatus = String(formData.get("nextStatus") ?? "");
    if (!postId || (nextStatus !== "published" && nextStatus !== "draft")) {
      return { error: "Datos inválidos.", success: null };
    }

    try {
      await assertOwnsPost(postId, teacher.id);
      const service = createServiceRoleClient();
      const { error } = await service.from("diario_posts").update({ status: nextStatus }).eq("id", postId);
      if (error) return { error: `No se pudo actualizar el post: ${error.message}`, success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo actualizar el post.", success: null };
    }

    revalidatePath(`/panel/docente/diario/${postId}`);
    revalidatePath("/panel/docente/diario");
    revalidatePath("/diario");
    return { error: null, success: nextStatus === "published" ? "Post publicado." : "Post pasado a borrador." };
  },
  limitedState,
);
