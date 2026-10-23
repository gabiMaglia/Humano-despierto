"use client";

import { useActionState } from "react";
import { createPostAction, updatePostAction } from "@/app/(app)/panel/docente/diario/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherDiarioPostFields } from "@/lib/server/diario";

const inputClass =
  "w-full rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-sm text-tinta outline-none transition-colors focus:border-linea focus:bg-fondo";
const labelClass = "mb-1.5 block font-display text-eyebrow tracking-wide text-suave";

interface Props {
  post?: TeacherDiarioPostFields;
}

export default function PostForm({ post }: Props) {
  const action = post ? updatePostAction : createPostAction;
  const [state, formAction, isPending] = useActionState(action, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta grid gap-4 p-6">
      {post && <input type="hidden" name="postId" value={post.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Slug (URL)</label>
          <input
            name="slug"
            defaultValue={post?.slug}
            placeholder="sobre-los-eclipses"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Título</label>
          <input name="title" defaultValue={post?.title} required className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Resumen (opcional — se ve en el listado)</label>
        <textarea name="excerpt" defaultValue={post?.excerpt ?? ""} rows={2} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Cuerpo</label>
        <textarea
          name="body"
          defaultValue={post?.body ?? ""}
          rows={16}
          required
          className={inputClass}
        />
        {/* Es la excepción documentada de ADR-009 (migración 0018): a diferencia de los demás
            campos, acá SÍ podés pegar un link legítimo — se rechaza únicamente si es el
            localizador real de un video o un recurso de esta plataforma. */}
        <p className="mt-1.5 font-body text-xs text-suave">
          Podés incluir links a otros sitios. Lo único que se rechaza es el link o id real de un
          video o material pago de esta plataforma.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando…" : post ? "Guardar cambios" : "Crear post"}
        </button>
        {state.error && (
          <p role="alert" className="font-body text-xs text-error">
            {state.error}
          </p>
        )}
        {state.success && <p className="font-body text-xs text-miel-800">{state.success}</p>}
      </div>
    </form>
  );
}
