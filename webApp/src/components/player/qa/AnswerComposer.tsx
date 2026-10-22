"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { answerQuestion } from "@/app/leccion/[id]/actions";
import { QA_ACTION_INITIAL_STATE } from "@/lib/lesson-qa/action-state";
import QaTextButton from "./QaTextButton";

export default function AnswerComposer({ lessonId, questionId }: { lessonId: string; questionId: string }) {
  const action = useMemo(() => answerQuestion.bind(null, lessonId, questionId), [lessonId, questionId]);
  const [state, formAction, pending] = useActionState(action, QA_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 border-t border-linea pt-2">
      <textarea
        name="body"
        aria-label="Tu respuesta"
        required
        maxLength={4000}
        rows={2}
        placeholder="Responder…"
        className="w-full resize-none bg-transparent font-body text-xs text-tinta placeholder:text-suave outline-none"
      />
      <div className="flex justify-end">
        <QaTextButton type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Responder"}
        </QaTextButton>
      </div>
      {state.error && (
        <p role="alert" className="font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
