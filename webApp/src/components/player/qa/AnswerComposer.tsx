"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { answerQuestion } from "@/app/leccion/[id]/actions";
import { QA_ACTION_INITIAL_STATE } from "@/lib/lesson-qa/action-state";
import FormField from "@/components/molecules/FormField";
import QaTextButton from "./QaTextButton";

export default function AnswerComposer({ lessonId, questionId }: { lessonId: string; questionId: string }) {
  const action = useMemo(() => answerQuestion.bind(null, lessonId, questionId), [lessonId, questionId]);
  const [state, formAction, pending] = useActionState(action, QA_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 border-t border-linea pt-3">
      <FormField id={`qa-respuesta-${questionId}`} label="Tu respuesta" hideLabel error={state.error}>
        {(c) => <textarea {...c} name="body" required maxLength={4000} rows={2} placeholder="Responder…" className={`${c.className} resize-y text-sm`} />}
      </FormField>
      <div className="mt-2 flex justify-end">
        <QaTextButton type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Responder"}
        </QaTextButton>
      </div>
    </form>
  );
}
