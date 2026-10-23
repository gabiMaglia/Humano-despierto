"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { askQuestion } from "@/app/leccion/[id]/actions";
import { QA_ACTION_INITIAL_STATE } from "@/lib/lesson-qa/action-state";
import QaTextButton from "./QaTextButton";

export default function QuestionComposer({ lessonId }: { lessonId: string }) {
  const action = useMemo(() => askQuestion.bind(null, lessonId), [lessonId]);
  const [state, formAction, pending] = useActionState(action, QA_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mb-4 space-y-2 rounded-md border border-linea bg-papel p-3">
      <input
        name="title"
        aria-label="Título de la pregunta"
        required
        minLength={3}
        maxLength={200}
        placeholder="¿Qué te quedó dando vueltas?"
        className="w-full bg-transparent font-display text-sm text-tinta placeholder:text-suave outline-none"
      />
      <textarea
        name="body"
        aria-label="Tu pregunta"
        required
        maxLength={4000}
        rows={3}
        placeholder="Contá en qué minuto y qué no cerró."
        className="w-full resize-none bg-transparent font-body text-sm text-tinta placeholder:text-suave outline-none"
      />
      <div className="flex justify-end border-t border-linea pt-2">
        <QaTextButton type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Preguntar"}
        </QaTextButton>
      </div>
      {state.error && (
        <p role="alert" className="font-body text-xs text-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
