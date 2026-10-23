"use client";

import { useId, useState, useTransition } from "react";
import { updateCampusPostAction, moderateCampusPostAction } from "@/app/(app)/circulo/actions";
import { CAMPUS_ACTION_INITIAL_STATE } from "@/lib/campus/action-state";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import Avatar from "@/components/atoms/Avatar";
import Button from "@/components/atoms/Button";
import FormField from "@/components/molecules/FormField";
import type { CampusPost } from "@/lib/server/campus";
import { cn } from "@/lib/utils/cn";

const ROLE_LABEL: Record<CampusPost["authorRole"], string> = {
  student: "Estudiante",
  teacher: "Docente",
  admin: "Admin",
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
  const id = useId();

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

  const meta = (
    <p className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="font-semibold text-bosque">{post.authorName}</span>
      {!post.isDeleted && (
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-xs font-semibold",
            post.authorRole === "student" ? "bg-salvia-100 text-bosque" : "bg-miel-100 text-miel-800",
          )}
        >
          {ROLE_LABEL[post.authorRole]}
        </span>
      )}
      <span className="text-suave">
        {formatRelativeTime(post.createdAt)}
        {!post.isDeleted && post.updatedAt !== post.createdAt && " · editado"}
      </span>
    </p>
  );

  if (post.isDeleted) {
    return (
      // Borrado = fondo y etiqueta, no opacidad (QA T-060 D2: el texto quedaba en 2.4:1).
      <article className="border-b border-linea bg-salvia-100 px-5 py-5 last:border-b-0 md:px-6">
        <div className="flex items-start gap-3">
          <Avatar glyph={post.authorGlyph} name={post.authorName} size="md" />
          <div className="min-w-0 flex-1">
            {meta}
            <p className="text-base text-suave line-through decoration-suave/60">{post.body}</p>
            <p className="mt-2 text-sm text-tinta">
              <span className="mr-2 rounded-pill bg-papel px-2 py-0.5 text-xs font-semibold text-bosque">Mensaje borrado</span>
              Borrado por {post.deletedByName ?? "moderación"}
              {post.deletedReason ? ` — motivo: "${post.deletedReason}"` : ""}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="border-b border-linea px-5 py-5 last:border-b-0 md:px-6">
      <div className="flex items-start gap-3">
        <Avatar glyph={post.authorGlyph} name={post.authorName} size="md" />
        <div className="min-w-0 flex-1">
          {meta}

          {isEditing ? (
            <form action={handleEditSubmit} className="mt-2">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="courseSlug" value={courseSlug ?? ""} />
              <FormField id={`${id}-editar`} label="Editar mensaje" hideLabel error={editError}>
                {(c) => <textarea {...c} name="body" required maxLength={4000} defaultValue={post.body} rows={3} className={`${c.className} resize-y`} />}
              </FormField>
              <div className="mt-2 flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isEditPending} aria-busy={isEditPending}>
                  {isEditPending ? "Guardando…" : "Guardar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditError(null);
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-tinta">{post.body}</p>
          )}

          {!isEditing && (post.isOwn || post.canModerate) && (
            <div className="-ml-3.5 mt-1 flex items-center gap-1">
              {post.isOwn && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              )}
              {post.canModerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={isModerating}
                  onClick={() => {
                    setModError(null);
                    setIsModerating((v) => !v);
                  }}
                >
                  {isModerating ? "Cancelar" : "Borrar"}
                </Button>
              )}
            </div>
          )}

          {isModerating && (
            <form action={handleModerateSubmit} className="mt-2 flex flex-wrap items-start gap-2">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="courseSlug" value={courseSlug ?? ""} />
              <FormField id={`${id}-motivo`} label="Motivo del borrado" hideLabel error={modError} className="min-w-[220px] flex-1">
                {(c) => <input {...c} name="reason" required placeholder="Motivo del borrado (obligatorio)" />}
              </FormField>
              <Button type="submit" variant="danger" disabled={isModPending} aria-busy={isModPending}>
                {isModPending ? "Borrando…" : "Confirmar borrado"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
