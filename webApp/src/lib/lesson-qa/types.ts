import type { AppRole } from "@/lib/stores/useAuthStore";

// Sin `server-only`: los importa el componente cliente `LessonQA`.
export interface QaAuthor {
  name: string;
  glyph: string | null;
  role: AppRole;
}

export interface QaAnswerView {
  id: string;
  body: string;
  createdAt: string;
  author: QaAuthor;
  isInstructorAnswer: boolean;
  isFeatured: boolean;
  isDeleted: boolean;
  deletedReason: string | null;
  deletedByName: string | null;
  isOwn: boolean;
}

export interface QaQuestionView {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: QaAuthor;
  votes: number;
  hasVoted: boolean;
  isResolved: boolean;
  isDeleted: boolean;
  deletedReason: string | null;
  deletedByName: string | null;
  isOwn: boolean;
  canResolve: boolean;
  answers: QaAnswerView[];
}

export interface LessonQaData {
  isAuthenticated: boolean;
  canAsk: boolean;
  canModerate: boolean;
  questions: QaQuestionView[];
}

export const EMPTY_LESSON_QA: LessonQaData = {
  isAuthenticated: false,
  canAsk: false,
  canModerate: false,
  questions: [],
};
