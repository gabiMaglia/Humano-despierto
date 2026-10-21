// Quién ve qué en /leccion/[id]. Cada flag espeja un predicado de la base para que la UI no ofrezca
// lo que RLS va a rechazar: `canTrackProgress` = policies de lesson_progress/lesson_notes (0004);
// `canAsk` = can_write_lesson_qa; `canModerate` = is_lesson_qa_moderator (T-030).
export interface PlayerAccessInput {
  isAuthenticated: boolean;
  isPreview: boolean;
  isEnrolled: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

export interface PlayerAccess {
  canView: boolean;
  fullCurriculum: boolean;
  canTrackProgress: boolean;
  canReadQa: boolean;
  canAsk: boolean;
  canModerate: boolean;
}

export function resolvePlayerAccess(i: PlayerAccessInput): PlayerAccess {
  const staff = i.isAuthenticated && (i.isOwner || i.isAdmin);
  const canAsk = i.isAuthenticated && (i.isEnrolled || i.isOwner || i.isPreview);
  return {
    canView: i.isPreview || i.isEnrolled || staff,
    fullCurriculum: i.isEnrolled || staff,
    canTrackProgress: i.isAuthenticated && (i.isEnrolled || i.isPreview),
    canReadQa: canAsk || staff,
    canAsk,
    canModerate: staff,
  };
}
