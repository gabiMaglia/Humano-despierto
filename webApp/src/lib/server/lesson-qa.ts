import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { buildLessonQa, type AnswerRow, type AuthorRow, type QuestionRow, type VoteCountRow } from "@/lib/lesson-qa/build";
import { EMPTY_LESSON_QA, type LessonQaData } from "@/lib/lesson-qa/types";

// T-030 · Solo LEE con el cliente de sesión: RLS decide qué filas vuelven. Los flags que llegan en
// `ctx` son para dibujar o no el compositor; si alguien los esquiva, el rechazo real es de RLS y
// de los guards de la migración.

type SessionClient = Awaited<ReturnType<typeof createClient>>;

export interface LessonQaContext {
  lessonId: string;
  viewerId: string | null;
  canReadQa: boolean;
  canAsk: boolean;
  canModerate: boolean;
}

// El nombre de quien moderó se embebe directo: siempre es docente o admin, filas públicas por
// `profiles_read_public` (0004). El de quien escribió sale de `lesson_qa_authors`.
const QUESTION_COLUMNS = `id, author_id, title, body, resolved_at, created_at, updated_at, deleted_at, deleted_reason,
  moderator:profiles!lesson_questions_deleted_by_fkey(full_name)`;
const ANSWER_COLUMNS = `id, question_id, author_id, body, is_instructor_answer, featured_at, created_at, updated_at,
  deleted_at, deleted_reason, moderator:profiles!lesson_answers_deleted_by_fkey(full_name)`;

export async function getLessonQa(supabase: SessionClient, ctx: LessonQaContext): Promise<LessonQaData> {
  if (!ctx.viewerId) return EMPTY_LESSON_QA;
  const flags = { canAsk: ctx.canAsk, canModerate: ctx.canModerate };
  if (!ctx.canReadQa) return { ...EMPTY_LESSON_QA, isAuthenticated: true, ...flags };

  const { data: qData, error: qError } = await supabase
    .from("lesson_questions")
    .select(QUESTION_COLUMNS)
    .eq("lesson_id", ctx.lessonId);
  if (qError) throw new Error(`No se pudieron leer las preguntas: ${qError.message}`);

  const questions = (qData ?? []) as unknown as QuestionRow[];
  if (questions.length === 0) {
    return buildLessonQa({ viewerId: ctx.viewerId, ...flags, questions: [], answers: [], authors: [], voteCounts: [], ownVotes: [] });
  }
  const ids = questions.map((q) => q.id);

  const [answersRes, countsRes, votesRes] = await Promise.all([
    supabase.from("lesson_answers").select(ANSWER_COLUMNS).in("question_id", ids),
    supabase.rpc("lesson_question_vote_counts", { p_ids: ids }),
    supabase.from("lesson_question_votes").select("question_id").eq("user_id", ctx.viewerId).in("question_id", ids),
  ]);
  if (answersRes.error) throw new Error(`No se pudieron leer las respuestas: ${answersRes.error.message}`);
  if (countsRes.error) throw new Error(`No se pudieron contar los votos: ${countsRes.error.message}`);
  if (votesRes.error) throw new Error(`No se pudieron leer tus votos: ${votesRes.error.message}`);

  const answers = (answersRes.data ?? []) as unknown as AnswerRow[];
  const authorIds = [...new Set([...questions.map((q) => q.author_id), ...answers.map((a) => a.author_id)])];
  const { data: authors, error: authorsError } = await supabase.rpc("lesson_qa_authors", { p_ids: authorIds });
  if (authorsError) throw new Error(`No se pudieron leer las autoras: ${authorsError.message}`);

  return buildLessonQa({
    viewerId: ctx.viewerId,
    ...flags,
    questions,
    answers,
    authors: (authors ?? []) as AuthorRow[],
    voteCounts: (countsRes.data ?? []) as VoteCountRow[],
    ownVotes: ((votesRes.data ?? []) as { question_id: string }[]).map((v) => v.question_id),
  });
}
