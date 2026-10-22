"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { featureAnswer, moderateAnswer } from "@/app/leccion/[id]/actions";
import type { QaAnswerView } from "@/lib/lesson-qa/types";
import ModerateForm from "./ModerateForm";
import QaTextButton from "./QaTextButton";
import { useQaMutation } from "./useQaMutation";

interface Props {
  lessonId: string;
  answer: QaAnswerView;
  canModerate: boolean;
}

export default function AnswerItem({ lessonId, answer, canModerate }: Props) {
  const { run, pending, error } = useQaMutation();
  const moderate = useMemo(() => moderateAnswer.bind(null, lessonId, answer.id), [lessonId, answer.id]);

  return (
    <li className={cn("border-l-2 pl-3", answer.isFeatured ? "border-miel" : "border-linea")}>
      <div className="mb-1 flex items-center gap-2">
        {answer.isFeatured && (
          <span role="img" aria-label="Respuesta destacada" className="font-display text-miel-800">
            ✦
          </span>
        )}
        <span className="font-display text-eyebrow tracking-wide text-suave">{answer.author.name}</span>
        {answer.isInstructorAnswer && (
          <span className="font-display text-eyebrow tracking-wide text-miel-800">Docente</span>
        )}
      </div>
      <p className="whitespace-pre-line font-body text-xs leading-relaxed text-suave">{answer.body}</p>
      {answer.isDeleted && (
        <p className="mt-1 font-body text-xs italic text-suave">
          Borrada por {answer.deletedByName ?? "moderación"}: {answer.deletedReason}
        </p>
      )}
      {!answer.isDeleted && canModerate && (
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {answer.isInstructorAnswer && (
            <QaTextButton
              variant={answer.isFeatured ? "active" : "default"}
              disabled={pending}
              onClick={() => run(() => featureAnswer(lessonId, answer.id, !answer.isFeatured))}
            >
              {answer.isFeatured ? "Quitar destacado" : "Destacar"}
            </QaTextButton>
          )}
          <ModerateForm action={moderate} />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 font-body text-xs text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}
