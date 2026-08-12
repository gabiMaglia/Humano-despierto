import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { sendMail } from "@/lib/server/mail/send";
import { renderEnrollmentGrantedMail } from "@/lib/server/mail/templates/enrollment-granted";
import { renderCourseCompletedMail } from "@/lib/server/mail/templates/course-completed";
import { renderWelcomeMail } from "@/lib/server/mail/templates/welcome";
import { renderTeacherNewStudentMail } from "@/lib/server/mail/templates/teacher-new-student";

// T-020 · capa de orquestación: junta los datos (nombre, curso, docente, email) y llama a
// `sendMail`. Cada función atrapa TODO internamente — DB incluida, no solo el transporte — así
// que quien llama (Server Action de inscripción, registro, progreso de lección) puede invocarla
// sin su propio try/catch y el criterio 2 (el mail no rompe la operación) queda garantizado acá
// UNA vez, no repetido en cada call site donde alguien se podría olvidar de envolverlo.
//
// `getAdminSupabaseClient` (service_role) es necesario para leer el email real: vive en
// `auth.users`, no en `profiles` — mismo patrón que `admin.ts::listAllUsers`. Quien llama a
// estas funciones ya verificó el permiso que corresponda (admin activando inscripción, sesión
// propia registrándose): esta capa no vuelve a autorizar nada, solo notifica.

/** `SITE_URL` (server-only, sin `NEXT_PUBLIC_`) es la única fuente del host que va DENTRO de un
 * mail — nunca el host donde corrió el request que lo disparó, que en dev es el puerto suelto
 * de cada worktree y en producción sería directamente el URL interno equivocado. Sin la env
 * seteada, el mail sigue saliendo (criterio 2) pero con un link que no sirve fuera de esta
 * máquina — por eso el fallback queda, pero nunca en silencio. */
function getSiteUrl(): string {
  const configured = process.env.SITE_URL;
  if (!configured) {
    console.error("[mail] SITE_URL no está seteada — los links del mail van a apuntar a localhost.");
  }
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}

async function getUserEmail(userId: string): Promise<{ email: string; name: string } | null> {
  const db = getAdminSupabaseClient();

  const [{ data: authData, error: authError }, { data: profile, error: profileError }] =
    await Promise.all([
      db.auth.admin.getUserById(userId),
      db.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);

  if (authError || !authData?.user?.email) {
    console.error(`[mail] no se pudo resolver el email de ${userId}: ${authError?.message ?? "sin email"}`);
    return null;
  }
  if (profileError || !profile) {
    console.error(`[mail] no se pudo resolver el perfil de ${userId}: ${profileError?.message}`);
    return null;
  }

  return { email: authData.user.email, name: profile.full_name || "—" };
}

interface CourseInfo {
  title: string;
  slug: string;
  teacherId: string;
  teacherName: string;
}

async function getCourseInfo(courseId: string): Promise<CourseInfo | null> {
  const db = getAdminSupabaseClient();
  const { data, error } = await db
    .from("courses")
    .select("title, slug, teacher_id, teacher:profiles!courses_teacher_id_fkey(full_name)")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !data) {
    console.error(`[mail] no se pudo resolver el curso ${courseId}: ${error?.message ?? "no existe"}`);
    return null;
  }

  const teacher = Array.isArray(data.teacher) ? data.teacher[0] : data.teacher;
  return {
    title: data.title,
    slug: data.slug,
    teacherId: data.teacher_id,
    teacherName: teacher?.full_name || "—",
  };
}

/**
 * Mails 1/4 y 4/4 — misma disparada: `panel/admin/actions.ts::setEnrollmentAction` cuando el
 * admin activa una inscripción que NO estaba activa. Un solo punto de entrada (en vez de dos
 * funciones que el caller tendría que invocar por separado) porque comparten los mismos datos
 * de curso/alumna — evita pedirlos dos veces — pero cada envío tiene su propio try/catch: si el
 * mail a la alumna falla, el aviso a la docente igual se intenta, y viceversa.
 *
 * `notifyTeacherNewStudent` interno recibe `studentName` ya resuelto como STRING — nunca el
 * `studentId` ni nada que le permita llegar al email de la alumna (criterio 3, reforzado acá:
 * ni siquiera esta función interna tiene forma de filtrarlo por accidente).
 */
export async function notifyEnrollmentActivated(input: { studentId: string; courseId: string }): Promise<void> {
  try {
    const [student, course] = await Promise.all([
      getUserEmail(input.studentId).catch((err) => {
        console.error("[mail] no se pudo resolver la alumna:", err);
        return null;
      }),
      getCourseInfo(input.courseId).catch((err) => {
        console.error("[mail] no se pudo resolver el curso:", err);
        return null;
      }),
    ]);
    if (!course) return;

    if (student) {
      try {
        const { subject, html, text } = renderEnrollmentGrantedMail({
          studentName: student.name,
          courseTitle: course.title,
          teacherName: course.teacherName,
          courseUrl: `${getSiteUrl()}/cursos/${course.slug}`,
        });
        await sendMail({ to: { email: student.email, name: student.name }, subject, html, text });
      } catch (err) {
        console.error("[mail] mail de inscripción a la alumna falló:", err);
      }
    }

    const teacher = await getUserEmail(course.teacherId).catch((err) => {
      console.error("[mail] no se pudo resolver la docente:", err);
      return null;
    });
    if (teacher && student) {
      try {
        const { subject, html, text } = renderTeacherNewStudentMail({
          teacherName: teacher.name,
          studentName: student.name,
          courseTitle: course.title,
          courseUrl: `${getSiteUrl()}/panel/docente/cursos/${input.courseId}`,
        });
        await sendMail({ to: { email: teacher.email, name: teacher.name }, subject, html, text });
      } catch (err) {
        console.error("[mail] aviso de alumna nueva a la docente falló:", err);
      }
    }
  } catch (err) {
    console.error("[mail] notifyEnrollmentActivated falló:", err);
  }
}

/** Mail 3/4 — dispara desde `entrar/actions.ts::sendWelcomeEmailAction`, self-service, nunca con
 * un destinatario que venga del cliente (ver ese archivo). */
export async function notifyWelcome(input: { userId: string }): Promise<void> {
  try {
    const student = await getUserEmail(input.userId);
    if (!student) return;

    const { subject, html, text } = renderWelcomeMail({
      studentName: student.name,
      catalogUrl: `${getSiteUrl()}/cursos`,
    });

    await sendMail({ to: { email: student.email, name: student.name }, subject, html, text });
  } catch (err) {
    console.error("[mail] notifyWelcome falló:", err);
  }
}

/** Mail 2/4 — dispara desde `leccion/[id]/actions.ts::saveLessonProgress` la primera vez que se
 * emite el certificado (T-018) de un curso para ese alumno. `certificateCode` ya viene resuelto
 * por el caller (`ensureCertificate`) — este módulo no vuelve a tocar la tabla `certificates`. */
export async function notifyCourseCompleted(input: {
  userId: string;
  courseTitle: string;
  certificateCode: string;
}): Promise<void> {
  try {
    const student = await getUserEmail(input.userId);
    if (!student) return;

    const { subject, html, text } = renderCourseCompletedMail({
      studentName: student.name,
      courseTitle: input.courseTitle,
      certificateUrl: `${getSiteUrl()}/certificado/${input.certificateCode}`,
    });

    await sendMail({ to: { email: student.email, name: student.name }, subject, html, text });
  } catch (err) {
    console.error("[mail] notifyCourseCompleted falló:", err);
  }
}
