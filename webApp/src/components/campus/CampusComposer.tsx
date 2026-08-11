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
    <form ref={formRef} action={formAction} className="border-b border-lila-300/18 px-5 py-4">
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
          className="min-h-[44px] flex-1 resize-y rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-sm text-ink placeholder:text-ink-faint outline-none focus:border-lila-300/50 focus:bg-cosmos-0"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-primary rounded-pill flex-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "…" : "✦ Publicar"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 pl-11 font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
