"use client";

import { useMemo } from "react";
import Icon from "@/components/atoms/Icon";
import { cn } from "@/lib/utils/cn";
import { featureAnswer, moderateAnswer } from "@/app/leccion/[id]/actions";
import type { QaAnswerView } from "@/lib/lesson-qa/types";
import ModerateForm from "./ModerateForm";
import FormStatus from "@/components/molecules/FormStatus";
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
    <li className={cn("rounded-md border-l-[3px] bg-fondo py-2 pl-3 pr-2", answer.isFeatured ? "border-miel-800" : "border-salvia")}>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        {answer.isFeatured && (
          <span role="img" aria-label="Respuesta destacada" className="inline-flex text-miel-800">
            <Icon name="star" className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="font-semibold text-bosque">{answer.author.name}</span>
        {answer.isInstructorAnswer && (
          <span className="rounded-pill bg-miel-100 px-2 py-0.5 text-xs font-semibold text-miel-800">Docente</span>
        )}
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-tinta">{answer.body}</p>
      {answer.isDeleted && (
        <p className="mt-1 text-sm text-suave">
          Borrada por {answer.deletedByName ?? "moderación"}: {answer.deletedReason}
        </p>
      )}
      {!answer.isDeleted && canModerate && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
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
      <FormStatus state={{ error, success: null }} className="mt-1" />
    </li>
  );
}
