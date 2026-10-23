"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCampusPostAction } from "@/app/(app)/circulo/actions";
import { CAMPUS_ACTION_INITIAL_STATE } from "@/lib/campus/action-state";
import Avatar from "@/components/atoms/Avatar";

interface Props {
  courseId: string | null;
  courseSlug: string | null;
  authorGlyph: string | null;
  placeholder: string;
}

export default function CampusComposer({ courseId, courseSlug, authorGlyph, placeholder }: Props) {
  const [state, formAction, isPending] = useActionState(createCampusPostAction, CAMPUS_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="border-b border-linea px-5 py-4">
      <input type="hidden" name="courseId" value={courseId ?? ""} />
      <input type="hidden" name="courseSlug" value={courseSlug ?? ""} />
      <div className="flex items-start gap-3">
        <Avatar glyph={authorGlyph ?? "☽"} size="sm" />
        <textarea
          name="body"
          required
          maxLength={4000}
          rows={2}
          placeholder={placeholder}
          className="min-h-[44px] flex-1 resize-y rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-sm text-tinta placeholder:text-suave outline-none focus:border-linea focus:bg-fondo"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary flex-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "…" : "Publicar"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 pl-11 font-body text-xs text-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
