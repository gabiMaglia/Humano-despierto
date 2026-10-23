"use client";

import { useActionState } from "react";
import { createPostAction, updatePostAction } from "@/app/(app)/panel/docente/diario/actions";
import Button from "@/components/atoms/Button";
import { PanelInput, PanelTextarea } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherDiarioPostFields } from "@/lib/server/diario";

interface Props {
  post?: TeacherDiarioPostFields;
}

export default function PostForm({ post }: Props) {
  const action = post ? updatePostAction : createPostAction;
  const [state, formAction, isPending] = useActionState(action, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta grid gap-5 p-6">
      {post && <input type="hidden" name="postId" value={post.id} />}

      <div className="grid gap-5 md:grid-cols-2">
        <PanelInput label="Slug (URL)" name="slug" defaultValue={post?.slug} placeholder="sobre-los-eclipses" required />
        <PanelInput label="Título" name="title" defaultValue={post?.title} required />
      </div>

      <PanelTextarea label="Resumen (opcional)" hint="Se ve en el listado del diario." name="excerpt" defaultValue={post?.excerpt ?? ""} rows={2} />

      {/* Es la excepción documentada de ADR-009 (migración 0018): a diferencia de los demás
          campos, acá SÍ podés pegar un link legítimo — se rechaza únicamente si es el
          localizador real de un video o un recurso de esta plataforma. */}
      <PanelTextarea
        label="Cuerpo"
        hint="Podés incluir links a otros sitios. Lo único que se rechaza es el link o id real de un video o material pago de esta plataforma."
        name="body"
        defaultValue={post?.body ?? ""}
        rows={16}
        required
      />

      <StatusMessage error={state.error} success={state.success} />
      <div>
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending ? "Guardando…" : post ? "Guardar cambios" : "Crear post"}
        </Button>
      </div>
    </form>
  );
}
