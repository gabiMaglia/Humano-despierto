import type { AppRole } from "@/lib/stores/useAuthStore";
import type { LessonQaData, QaAnswerView, QaAuthor, QaQuestionView } from "./types";

interface ModeratorRef {
  full_name: string;
}

export interface QuestionRow {
  id: string;
  author_id: string;
  title: string;
  body: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_reason: string | null;
  moderator: ModeratorRef | ModeratorRef[] | null;
}

export interface AnswerRow {
  id: string;
  question_id: string;
  author_id: string;
  body: string;
  is_instructor_answer: boolean;
  featured_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_reason: string | null;
  moderator: ModeratorRef | ModeratorRef[] | null;
}

export interface AuthorRow {
  id: string;
  full_name: string;
  glyph: string | null;
  role: string;
}

export interface VoteCountRow {
  question_id: string;
  votes: number;
}

export interface BuildLessonQaInput {
  viewerId: string;
  canAsk: boolean;
  canModerate: boolean;
  questions: QuestionRow[];
  answers: AnswerRow[];
  authors: AuthorRow[];
  voteCounts: VoteCountRow[];
  ownVotes: string[];
}

const UNKNOWN_AUTHOR: QaAuthor = { name: "—", glyph: null, role: "student" };

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// Las fechas llegan de PostgREST en ISO con el mismo huso, así que comparar el texto ordena igual
// que comparar instantes y no hace falta parsear en cada comparación.
export function sortAnswers(answers: QaAnswerView[]): QaAnswerView[] {
  return [...answers].sort(
    (x, y) =>
      Number(y.isFeatured) - Number(x.isFeatured) ||
      x.createdAt.localeCompare(y.createdAt) ||
      x.id.localeCompare(y.id),
  );
}

export function sortQuestions(questions: QaQuestionView[]): QaQuestionView[] {
  return [...questions].sort(
    (x, y) =>
      Number(x.isDeleted) - Number(y.isDeleted) ||
      y.votes - x.votes ||
      y.createdAt.localeCompare(x.createdAt) ||
      x.id.localeCompare(y.id),
  );
}

export function buildLessonQa(input: BuildLessonQaInput): LessonQaData {
  const authors = new Map<string, QaAuthor>(
    input.authors.map((r) => [r.id, { name: r.full_name || "—", glyph: r.glyph, role: r.role as AppRole }]),
  );
  const authorOf = (id: string) => authors.get(id) ?? UNKNOWN_AUTHOR;
  const votes = new Map(input.voteCounts.map((v) => [v.question_id, v.votes]));
  const voted = new Set(input.ownVotes);

  const answersByQuestion = new Map<string, QaAnswerView[]>();
  for (const row of input.answers) {
    const list = answersByQuestion.get(row.question_id) ?? [];
    list.push({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      author: authorOf(row.author_id),
      isInstructorAnswer: row.is_instructor_answer,
      isFeatured: row.featured_at !== null,
      isDeleted: row.deleted_at !== null,
      deletedReason: row.deleted_reason,
      deletedByName: firstOf(row.moderator)?.full_name ?? null,
      isOwn: row.author_id === input.viewerId,
    });
    answersByQuestion.set(row.question_id, list);
  }

  const questions: QaQuestionView[] = input.questions.map((row) => {
    const isOwn = row.author_id === input.viewerId;
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      author: authorOf(row.author_id),
      votes: votes.get(row.id) ?? 0,
      hasVoted: voted.has(row.id),
      isResolved: row.resolved_at !== null,
      isDeleted: row.deleted_at !== null,
      deletedReason: row.deleted_reason,
      deletedByName: firstOf(row.moderator)?.full_name ?? null,
      isOwn,
      canResolve: isOwn || input.canModerate,
      answers: sortAnswers(answersByQuestion.get(row.id) ?? []),
    };
  });

  return {
    isAuthenticated: true,
    canAsk: input.canAsk,
    canModerate: input.canModerate,
    questions: sortQuestions(questions),
  };
}
