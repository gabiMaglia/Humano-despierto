"use client";

import { useMemo } from "react";
import Icon from "@/components/atoms/Icon";
import { moderateQuestion, resolveQuestion, voteQuestion } from "@/app/leccion/[id]/actions";
import type { QaQuestionView } from "@/lib/lesson-qa/types";
import AnswerComposer from "./AnswerComposer";
import AnswerItem from "./AnswerItem";
import ModerateForm from "./ModerateForm";
import FormStatus from "@/components/molecules/FormStatus";
import QaTextButton from "./QaTextButton";
import { useQaMutation } from "./useQaMutation";

interface Props {
  lessonId: string;
  question: QaQuestionView;
  canAsk: boolean;
  canModerate: boolean;
}

export default function QuestionCard({ lessonId, question: q, canAsk, canModerate }: Props) {
  const { run, pending, error } = useQaMutation();
  const moderate = useMemo(() => moderateQuestion.bind(null, lessonId, q.id), [lessonId, q.id]);
  const titleId = `qa-q-${q.id}`;

  return (
    <article aria-labelledby={titleId} className="rounded-md border border-linea p-4">
      <div className="flex items-start gap-3">
        <QaTextButton
          variant={q.hasVoted ? "active" : "default"}
          aria-pressed={q.hasVoted}
          aria-label={`Votar esta pregunta, ${q.votes} ${q.votes === 1 ? "voto" : "votos"}`}
          disabled={!canAsk || q.isDeleted || pending}
          onClick={() => run(() => voteQuestion(lessonId, q.id, !q.hasVoted))}
        >
          <Icon name="arrow-up" className="h-3.5 w-3.5" />
          <span className="tabular-nums">{q.votes}</span>
        </QaTextButton>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-base">
            {q.title}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-suave">
            {q.author.name}
            {q.isResolved && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-salvia-100 px-2 py-0.5 text-xs font-semibold text-exito">
                <Icon name="check" className="h-3 w-3" />
                Resuelta
              </span>
            )}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-tinta">{q.body}</p>
          {q.isDeleted && (
            <p className="mt-2 rounded-sm bg-salvia-100 px-2 py-1 text-sm text-tinta">
              Borrada por {q.deletedByName ?? "moderación"}: {q.deletedReason}
            </p>
          )}
        </div>
      </div>

      {!q.isDeleted && (q.canResolve || canModerate) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {q.canResolve && (
            <QaTextButton disabled={pending} onClick={() => run(() => resolveQuestion(lessonId, q.id, !q.isResolved))}>
              {q.isResolved ? "Reabrir" : "Marcar resuelta"}
            </QaTextButton>
          )}
          {canModerate && <ModerateForm action={moderate} />}
        </div>
      )}

      {q.answers.length > 0 && (
        <ol aria-label="Respuestas" className="mt-4 space-y-3">
          {q.answers.map((a) => (
            <AnswerItem key={a.id} lessonId={lessonId} answer={a} canModerate={canModerate} />
          ))}
        </ol>
      )}

      {canAsk && !q.isDeleted && <AnswerComposer lessonId={lessonId} questionId={q.id} />}

      <FormStatus state={{ error, success: null }} className="mt-2" />
    </article>
  );
}
