/** Un anuncio publicado tal como lo lee una inscripta (ficha y /panel). */
export interface AnnouncementView {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  /** Solo en /panel, donde se mezclan cursos. `null` en la ficha. */
  course: { title: string; slug: string } | null;
}

/** Lo que ve la docente dueña en su panel: borradores, publicados y retirados. */
export interface TeacherAnnouncementView {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  deletedReason: string | null;
}

/** Lo que modera el admin: publicados, con su curso. */
export interface ModerationAnnouncementView {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  courseTitle: string;
  deletedAt: string | null;
  deletedReason: string | null;
}

/** Misma forma que `TeacherActionState` y `AdminActionState`: el form de retiro sirve a los dos. */
export interface AnnouncementFormState {
  error: string | null;
  success: string | null;
}
