"use client";

import { useActionState, useRef, useEffect, useId } from "react";
import { createCampusPostAction } from "@/app/(app)/circulo/actions";
import { CAMPUS_ACTION_INITIAL_STATE } from "@/lib/campus/action-state";
import Avatar from "@/components/atoms/Avatar";
import Button from "@/components/atoms/Button";
import FormField from "@/components/molecules/FormField";
import { cn } from "@/lib/utils/cn";

interface Props {
  courseId: string | null;
  courseSlug: string | null;
  authorName?: string | null;
  placeholder: string;
}

export default function CampusComposer({ courseId, courseSlug, authorName, placeholder }: Props) {
  const [state, formAction, isPending] = useActionState(createCampusPostAction, CAMPUS_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="border-b border-linea bg-fondo px-5 py-5 md:px-6">
      <input type="hidden" name="courseId" value={courseId ?? ""} />
      <input type="hidden" name="courseSlug" value={courseSlug ?? ""} />
      <div className="flex items-start gap-3">
        <Avatar name={authorName} size="lg" className="hidden sm:block" />
        <div className="min-w-0 flex-1">
          <FormField id={`${id}-mensaje`} label="Escribir en el hilo" hideLabel error={state.error}>
            {(c) => <textarea {...c} name="body" required maxLength={4000} rows={3} placeholder={placeholder} className={cn(c.className, "resize-y")} />}
          </FormField>
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" disabled={isPending} aria-busy={isPending}>
              {isPending ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
