import type { RateLimitRule } from "@/lib/rate-limit/core";

// Anti-bucle para docente/admin: una pantalla rota que reintenta en loop, no una persona.
const STAFF = { max: 60, windowSeconds: 60 } as const;
// Lo que dispara mail a terceros: el costo es la casilla de otra persona.
const MAILS_OTHERS = { max: 5, windowSeconds: 3600 } as const;

/**
 * Límite por action, por usuario (por IP si no hay sesión). Ventana fija en segundos. El guard
 * (`coverage.ts`) exige que toda action exportada esté acá o en `RATE_LIMIT_EXEMPT`, y que no
 * queden entradas sin action.
 */
export const RATE_LIMITS = {
  // Reseñas (T-028, T-037)
  saveReviewAction: { max: 5, windowSeconds: 600 },
  respondReviewAction: { max: 10, windowSeconds: 600 },
  reportReviewAction: { max: 5, windowSeconds: 600 },
  // Inscripción pedida desde la ficha (T-043): cada pedido cae en la cola del admin.
  requestEnrollmentAction: { max: 5, windowSeconds: 3600 },
  // Wishlist (T-033)
  setWishlistAction: { max: 60, windowSeconds: 600 },
  // Campus (T-021)
  createCampusPostAction: { max: 20, windowSeconds: 600 },
  updateCampusPostAction: { max: 30, windowSeconds: 600 },
  moderateCampusPostAction: STAFF,
  // Player (T-006/T-045). El cliente manda progreso cada 5 s = 12/min; con dos pestañas, 24.
  saveLessonProgress: { max: 30, windowSeconds: 60 },
  saveLessonNote: { max: 60, windowSeconds: 600 },
  updateLessonNote: { max: 60, windowSeconds: 600 },
  deleteLessonNote: { max: 60, windowSeconds: 600 },
  // Q&A del player (T-030)
  askQuestion: { max: 20, windowSeconds: 600 },
  answerQuestion: { max: 20, windowSeconds: 600 },
  voteQuestion: { max: 60, windowSeconds: 600 },
  resolveQuestion: STAFF,
  featureAnswer: STAFF,
  moderateQuestion: STAFF,
  moderateAnswer: STAFF,
  // Perfil (T-042)
  updateProfileAction: { max: 10, windowSeconds: 600 },
  clearBirthDateAction: { max: 10, windowSeconds: 600 },
  uploadAvatarAction: { max: 10, windowSeconds: 600 },
  removeAvatarAction: { max: 10, windowSeconds: 600 },
  // Panel docente: cursos (T-005)
  createCourseAction: STAFF,
  updateCourseAction: STAFF,
  deleteCourseAction: STAFF,
  setCoursePublishedAction: STAFF,
  // Panel docente: currículum (T-004/T-044)
  createModuleAction: STAFF,
  updateModuleAction: STAFF,
  deleteModuleAction: STAFF,
  moveModuleAction: STAFF,
  createLessonAction: STAFF,
  updateLessonAction: STAFF,
  deleteLessonAction: STAFF,
  moveLessonAction: STAFF,
  // Cada llamada gasta cuota de YouTube Data API (videos.list) con la clave del proyecto.
  attachLessonVideoAction: { max: 30, windowSeconds: 600 },
  setLessonPublishedAction: STAFF,
  createChapterAction: STAFF,
  updateChapterAction: STAFF,
  deleteChapterAction: STAFF,
  createResourceAction: STAFF,
  updateResourceAction: STAFF,
  deleteResourceAction: STAFF,
  // Portada (T-047): cada subida escribe en Storage con service_role.
  uploadCourseCoverAction: { max: 10, windowSeconds: 600 },
  removeCourseCoverAction: { max: 10, windowSeconds: 600 },
  // Anuncios (T-031). Publicar manda mail a todas las inscriptas.
  saveAnnouncementDraft: { max: 30, windowSeconds: 600 },
  publishAnnouncement: MAILS_OTHERS,
  withdrawAnnouncement: { max: 30, windowSeconds: 600 },
  // Diario (T-022)
  createPostAction: STAFF,
  updatePostAction: STAFF,
  deletePostAction: STAFF,
  setPostPublishedAction: STAFF,
  // Admin (T-008, T-043, T-037, T-031, T-049)
  updateUserRoleAction: STAFF,
  setEnrollmentAction: STAFF,
  setCourseStatusAction: STAFF,
  approveEnrollmentRequestAction: STAFF,
  rejectEnrollmentRequestAction: STAFF,
  hideReviewAction: STAFF,
  unhideReviewAction: STAFF,
  dismissReportAction: STAFF,
  moderateAnnouncement: STAFF,
  grantEnrollmentByEmailAction: STAFF,
  // Invitaciones de docentes (T-049): invitar y reenviar mandan mail.
  inviteTeacherAction: MAILS_OTHERS,
  resendInvitationAction: MAILS_OTHERS,
  revokeInvitationAction: STAFF,
  // Reporte de errores del navegador (T-051, D-50): 10/min, como pide el spec SP-6.
  reportClientErrorAction: { max: 10, windowSeconds: 60 },
  // Route Handler GET /leccion/[id]/recurso/[resourceId] (T-044)
  lessonResourceGet: { max: 60, windowSeconds: 600 },
  // Route Handler GET /invitacion/[token] (T-049): suele llegar sin sesión, cuenta por IP.
  invitationGet: { max: 30, windowSeconds: 600 },
  // Route Handler POST /api/csp-report (T-052, D-46): 20/min por IP (spec SP-6).
  cspReportPost: { max: 20, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/** Tope de `sendMail` (choke point único). Global y por destinatario (clave con hash del mail). */
export const MAIL_LIMITS = {
  global: { max: 200, windowSeconds: 3600 },
  perRecipient: { max: 20, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Exports de `"use server"` y handlers SIN límite de aplicación, con el porqué. Las de auth las
 * limita GoTrue por IP (ver cabecera de `core.ts`). Clave: nombre del export; para un Route
 * Handler, `<ruta desde src/app>#<MÉTODO>`.
 */
export const RATE_LIMIT_EXEMPT: Readonly<Record<string, string>> = {
  postLoginDestinationAction: "Solo lee el rol propio para elegir destino tras el login; no escribe.",
  requestPasswordResetAction: "GoTrue limita email_sent por hora; un límite propio cambiaría la respuesta neutra.",
  updatePasswordAction: "Exige la sesión del link de recuperación; GoTrue limita token_verifications al canjearlo.",
  resolveClosingHref: "Idempotente: la única escritura posible (el certificado) es una por curso y la decide ensureCertificate.",
  "api/mail/retry/route.ts#GET": "Cron con secreto (CRON_SECRET); sin él responde 401/503 y no envía nada propio: reintenta turnos ya existentes de mail_log.",
  "auth/callback/route.ts#GET": "Canje de código de GoTrue: lo limita token_verifications.",
};
