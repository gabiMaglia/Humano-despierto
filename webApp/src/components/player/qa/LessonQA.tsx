"use client";

import type { LessonQaData } from "@/lib/lesson-qa/types";
import QuestionCard from "./QuestionCard";
import QuestionComposer from "./QuestionComposer";

// Autónomo a propósito: T-045 reorganiza el sidebar del player y solo tiene que mover este
// componente. No lee nada de LessonPlayer salvo lo que recibe.
interface Props {
  lessonId: string;
  data: LessonQaData;
}

export default function LessonQA({ lessonId, data }: Props) {
  if (!data.isAuthenticated) {
    return <p className="text-sm text-suave">Iniciá sesión para ver y hacer preguntas sobre esta lección.</p>;
  }
  if (!data.canAsk && !data.canModerate) {
    return <p className="text-sm text-suave">Las preguntas de esta lección son de quienes la cursan.</p>;
  }

  return (
    <div>
      {data.canAsk && <QuestionComposer lessonId={lessonId} />}
      {data.questions.length === 0 ? (
        // Criterio 11: vacío deliberado, con el compositor arriba.
        <p className="text-sm text-suave">Nadie preguntó todavía en esta lección.</p>
      ) : (
        <div className="space-y-3">
          {data.questions.map((q) => (
            <QuestionCard key={q.id} lessonId={lessonId} question={q} canAsk={data.canAsk} canModerate={data.canModerate} />
          ))}
        </div>
      )}
    </div>
  );
}
