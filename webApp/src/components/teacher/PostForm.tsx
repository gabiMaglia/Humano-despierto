"use client";

import { useActionState } from "react";
import { createPostAction, updatePostAction } from "@/app/(app)/panel/docente/diario/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherDiarioPostFields } from "@/lib/server/diario";

const inputClass =
  "w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-sm text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0";
const labelClass = "mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft";

interface Props {
  post?: TeacherDiarioPostFields;
}

export default function PostForm({ post }: Props) {
  const action = post ? updatePostAction : createPostAction;
  const [state, formAction, isPending] = useActionState(action, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="cosmos-card grid gap-4 p-6">
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
        <p className="mt-1.5 font-body text-xs text-ink-faint">
          Podés incluir links a otros sitios. Lo único que se rechaza es el link o id real de un
          video o material pago de esta plataforma.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-primary rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando…" : post ? "Guardar cambios" : "Crear post"}
        </button>
        {state.error && (
          <p role="alert" className="font-body text-xs text-red-400">
            {state.error}
          </p>
        )}
        {state.success && <p className="font-body text-xs text-lila-300">{state.success}</p>}
      </div>
    </form>
  );
}
