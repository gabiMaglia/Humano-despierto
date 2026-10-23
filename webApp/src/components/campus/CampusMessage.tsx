"use client";

import { useState, useTransition } from "react";
import { updateCampusPostAction, moderateCampusPostAction } from "@/app/(app)/circulo/actions";
import { CAMPUS_ACTION_INITIAL_STATE } from "@/lib/campus/action-state";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import Avatar from "@/components/atoms/Avatar";
import type { CampusPost } from "@/lib/server/campus";

const ROLE_LABEL: Record<CampusPost["authorRole"], string> = {
  student: "ESTUDIANTE",
  teacher: "DOCENTE",
  admin: "ADMIN",
};

// Sin `useActionState` a propósito: cerrar el formulario de edición/moderación cuando el
// Server Action termina bien es una transición de UI local (no estado del servidor), y
// sincronizarla vía `useEffect` sobre `state.success` cae en el anti-patrón "setState
// síncrono dentro de un efecto" (react-hooks/set-state-in-effect). Invocando el action
// directamente dentro de `useTransition` se puede reaccionar al resultado en el mismo
// callback que lo pidió, sin efecto de por medio.
export default function CampusMessage({
  post,
  courseSlug,
}: {
  post: CampusPost;
  courseSlug: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [modError, setModError] = useState<string | null>(null);
  const [isEditPending, startEdit] = useTransition();
  const [isModPending, startMod] = useTransition();

  function handleEditSubmit(formData: FormData) {
    startEdit(async () => {
      const result = await updateCampusPostAction(CAMPUS_ACTION_INITIAL_STATE, formData);
      if (result.error) {
        setEditError(result.error);
      } else {
        setEditError(null);
        setIsEditing(false);
      }
    });
  }

  function handleModerateSubmit(formData: FormData) {
    startMod(async () => {
      const result = await moderateCampusPostAction(CAMPUS_ACTION_INITIAL_STATE, formData);
      if (result.error) {
        setModError(result.error);
      } else {
        setModError(null);
        setIsModerating(false);
      }
    });
  }

  if (post.isDeleted) {
    return (
      // Borrado = fondo y etiqueta, no opacidad (QA T-060 D2: el texto quedaba en 2.4:1).
      <article className="border-b border-linea bg-salvia-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <Avatar glyph={post.authorGlyph ?? "·"} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 font-display text-eyebrow tracking-wide text-suave">
              <span>{post.authorName}</span>
              <span className="text-miel-800">·</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
            </div>
            <p className="font-body text-sm italic text-suave line-through decoration-miel-800/40">
              {post.body}
            </p>
            <p className="mt-1.5 font-body text-xs text-suave">
              <span className="mr-1.5 rounded-pill bg-papel px-2 py-0.5 font-semibold text-bosque">Mensaje borrado</span>
              Borrado por {post.deletedByName ?? "moderación"}
              {post.deletedReason ? ` — motivo: "${post.deletedReason}"` : ""}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="border-b border-linea px-5 py-4">
      <div className="flex items-start gap-3">
        <Avatar glyph={post.authorGlyph ?? post.authorName[0]} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 font-display text-eyebrow tracking-wide text-suave">
            <span className="text-tinta">{post.authorName}</span>
            <span className="text-miel-800">{ROLE_LABEL[post.authorRole]}</span>
            <span className="text-miel-800">·</span>
            <span>{formatRelativeTime(post.createdAt)}</span>
            {post.updatedAt !== post.createdAt && <span className="text-suave">(editado)</span>}
          </div>

          {isEditing ? (
            <form action={handleEditSubmit} className="mt-1.5">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="courseSlug" value={courseSlug ?? ""} />
              <textarea
                name="body"
                required
                maxLength={4000}
                defaultValue={post.body}
                rows={2}
                className="w-full resize-y rounded-md border border-linea bg-papel px-3 py-2 font-body text-sm text-tinta outline-none focus:border-linea"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <button type="submit" disabled={isEditPending} className="btn btn-primary text-[10px] disabled:opacity-60">
                  {isEditPending ? "…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditError(null);
                    setIsEditing(false);
                  }}
                  className="font-display text-eyebrow tracking-wide text-suave hover:text-suave"
                >
                  Cancelar
                </button>
              </div>
              {editError && <p role="alert" className="mt-1 font-body text-xs text-error">{editError}</p>}
            </form>
          ) : (
            <p className="whitespace-pre-wrap font-body text-sm text-suave leading-relaxed">{post.body}</p>
          )}

          {!isEditing && (post.isOwn || post.canModerate) && (
            <div className="mt-2 flex items-center gap-3 font-display text-eyebrow tracking-wide text-suave">
              {post.isOwn && (
                <button onClick={() => setIsEditing(true)} className="hover:text-miel-800 transition-colors">
                  Editar
                </button>
              )}
              {post.canModerate && (
                <button
                  onClick={() => {
                    setModError(null);
                    setIsModerating((v) => !v);
                  }}
                  className="hover:text-error transition-colors"
                >
                  {isModerating ? "Cancelar" : "Borrar"}
                </button>
              )}
            </div>
          )}

          {isModerating && (
            <form action={handleModerateSubmit} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="courseSlug" value={courseSlug ?? ""} />
              <input
                name="reason"
                required
                placeholder="Motivo del borrado (obligatorio)"
                className="min-w-[220px] flex-1 rounded-md border border-error bg-papel px-3 py-1.5 font-body text-xs text-tinta placeholder:text-suave outline-none focus:border-error"
              />
              <button
                type="submit"
                disabled={isModPending}
                className="rounded-pill border border-error bg-error/10 px-3 py-1.5 font-display text-eyebrow tracking-wide text-error hover:bg-error/10 transition-colors disabled:opacity-60"
              >
                {isModPending ? "…" : "Confirmar borrado"}
              </button>
              {modError && <p role="alert" className="w-full font-body text-xs text-error">{modError}</p>}
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
