"use client";

import { useMemo } from "react";
import { moderateQuestion, resolveQuestion, voteQuestion } from "@/app/leccion/[id]/actions";
import type { QaQuestionView } from "@/lib/lesson-qa/types";
import AnswerComposer from "./AnswerComposer";
import AnswerItem from "./AnswerItem";
import ModerateForm from "./ModerateForm";
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
    <article aria-labelledby={titleId} className="rounded-md border border-linea p-3">
      <div className="flex items-start gap-3">
        <QaTextButton
          variant={q.hasVoted ? "active" : "default"}
          aria-pressed={q.hasVoted}
          aria-label={`Votar esta pregunta, ${q.votes} ${q.votes === 1 ? "voto" : "votos"}`}
          disabled={!canAsk || q.isDeleted || pending}
          onClick={() => run(() => voteQuestion(lessonId, q.id, !q.hasVoted))}
        >
          {q.hasVoted ? "✦" : "✧"} {q.votes}
        </QaTextButton>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="font-display text-sm tracking-wide text-tinta">
            {q.title}
          </h3>
          <p className="font-display text-eyebrow tracking-wide text-suave">
            {q.author.name}
            {q.isResolved && <span className="text-miel-800"> · ✓ Resuelta</span>}
          </p>
          <p className="mt-2 whitespace-pre-line font-body text-xs leading-relaxed text-suave">{q.body}</p>
          {q.isDeleted && (
            <p className="mt-1 font-body text-xs italic text-suave">
              Borrada por {q.deletedByName ?? "moderación"}: {q.deletedReason}
            </p>
          )}
        </div>
      </div>

      {!q.isDeleted && (q.canResolve || canModerate) && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {q.canResolve && (
            <QaTextButton disabled={pending} onClick={() => run(() => resolveQuestion(lessonId, q.id, !q.isResolved))}>
              {q.isResolved ? "Reabrir" : "Marcar resuelta"}
            </QaTextButton>
          )}
          {canModerate && <ModerateForm action={moderate} />}
        </div>
      )}

      {q.answers.length > 0 && (
        <ol aria-label="Respuestas" className="mt-3 space-y-3">
          {q.answers.map((a) => (
            <AnswerItem key={a.id} lessonId={lessonId} answer={a} canModerate={canModerate} />
          ))}
        </ol>
      )}

      {canAsk && !q.isDeleted && <AnswerComposer lessonId={lessonId} questionId={q.id} />}

      {error && (
        <p role="alert" className="mt-2 font-body text-xs text-red-400">
          {error}
        </p>
      )}
    </article>
  );
}
