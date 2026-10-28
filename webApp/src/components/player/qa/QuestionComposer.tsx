"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { askQuestion } from "@/app/leccion/[id]/actions";
import { QA_ACTION_INITIAL_STATE } from "@/lib/lesson-qa/action-state";
import Button from "@/components/atoms/Button";
import FormField from "@/components/molecules/FormField";
import FormStatus from "@/components/molecules/FormStatus";

export default function QuestionComposer({ lessonId }: { lessonId: string }) {
  const action = useMemo(() => askQuestion.bind(null, lessonId), [lessonId]);
  const [state, formAction, pending] = useActionState(action, QA_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mb-5 space-y-4 rounded-md bg-fondo p-4">
      <FormField id={`qa-titulo-${lessonId}`} label="Título de la pregunta">
        {(c) => <input {...c} name="title" required minLength={3} maxLength={200} placeholder="¿Qué te quedó dando vueltas?" className={`${c.className} text-sm`} />}
      </FormField>
      <FormField id={`qa-cuerpo-${lessonId}`} label="Tu pregunta">
        {(c) => <textarea {...c} name="body" required maxLength={4000} rows={3} placeholder="Contá en qué minuto y qué no cerró." className={`${c.className} resize-y text-sm`} />}
      </FormField>
      {/* El error de la action no dice de qué campo es: va como estado del formulario. */}
      <FormStatus state={{ error: state.error, success: null }} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Enviando…" : "Preguntar"}
        </Button>
      </div>
    </form>
  );
}
