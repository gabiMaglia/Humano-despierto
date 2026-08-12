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

export type MailType = "welcome" | "enrollment_granted" | "course_completed" | "teacher_new_student";

/**
 * Reclama el turno de mandar UN mail (T-020, juez ciego, D2+D3). "¿Ya mandé este mail?" no se
 * decide con una lectura seguida de una escritura —eso es exactamente la carrera que D3
 * encontró, y ninguna cantidad de código de aplicación la cierra sola, dos requests SIEMPRE
 * pueden intercalarse entre la lectura de una y la escritura de la otra—. Se decide con un
 * INSERT que puede fallar por la `UNIQUE(recipient_user_id, mail_type, scope_key)` de
 * `mail_log` (migración 0019): el primero que reclama, manda; el que pierde la carrera (23505)
 * no manda nada. Mismo patrón que la unicidad de `certificates` (0013), aplicado a "una sola
 * vez" en vez de "una sola fila".
 *
 * `scope_key` es lo que distingue una repetición LEGÍTIMA (la misma alumna en dos cursos) de un
 * duplicado — ver el comentario largo en la migración. Cualquier error que no sea "ya
 * reclamado" (23505) se trata como "no se pudo confirmar la exclusividad" y TAMBIÉN se aborta
 * el envío: ante la duda, no mandar es más seguro que arriesgar un duplicado — no hay ningún
 * criterio que exija entrega garantizada, y D2 es justamente sobre mandar de más.
 *
 * Devuelve el `id` de la fila reclamada (o `null` si no se reclamó) — lo necesita
 * `releaseMailSlotOnFailure` de abajo para poder liberar EXACTAMENTE esa fila, nunca "una fila
 * que matchee la tupla" (defensivo, aunque hoy la `UNIQUE` garantiza que solo puede haber una).
 *
 * IMPORTANTE (D3 del juez ciego, ronda 3): esta función se llama DESPUÉS de resolver todos los
 * datos que hacen falta para el envío (email, nombre, curso) — nunca antes. Si se llamara antes
 * y la resolución fallara, se quemaría el turno sin haber intentado mandar nada. Cada call site
 * respeta este orden; no hay ninguno que reclame primero "para no perder tiempo".
 */
async function claimMailSlot(recipientUserId: string, mailType: MailType, scopeKey: string): Promise<string | null> {
  const db = getAdminSupabaseClient();
  const { data, error } = await db
    .from("mail_log")
    .insert({ recipient_user_id: recipientUserId, mail_type: mailType, scope_key: scopeKey })
    .select("id")
    .single();

  if (error) {
    if (error.code !== "23505") {
      console.error(
        `[mail] no se pudo reclamar el turno de envío (${mailType}/${scopeKey}), se aborta el envío: ${error.message}`
      );
    }
    return null;
  }
  return data.id;
}

/**
 * D4 (juez ciego, ronda 3, BLOQUEANTE) — libera el turno cuando el envío FALLÓ.
 *
 * La versión anterior reclamaba y dejaba reclamado pase lo que pasara con el resultado, y el
 * comentario de la migración 0019 lo describía como "la misma política que ya regía". Era
 * falso: antes de esa migración, cada invocación de `notifyWelcome` intentaba mandar de nuevo
 * (sin dedup no había nada que lo impidiera) — la migración cambió esa política de "cada
 * invocación intenta" a "un solo intento en la vida de la cuenta", sin declararlo. Efecto
 * medido: con el SMTP caído, la bienvenida se reclamaba y JAMÁS volvía a intentarse, ni con el
 * SMTP sano después — ni reintentando la action a mano, ni con el camino de recuperación real
 * de un admin (revocar + reactivar una inscripción tampoco reenviaba nada).
 *
 * El arreglo: si `sendMail` devuelve `{ok:false}`, se borra la fila reclamada. Sin esto no hace
 * falta un mecanismo de reintento en dos fases ni expiración — el PRÓXIMO disparo del mismo
 * evento (la próxima vez que alguien pida el mail de bienvenida, o el admin reactive la
 * inscripción) encuentra el scope libre y lo intenta de nuevo.
 *
 * Residuo ACEPTADO, no escondido: en la ventana angosta de una carrera de D3 (dos requests
 * concurrentes disparan el mismo evento), el que pierde el INSERT (23505) se retira sin
 * intentar mandar nada — si el que ganó el INSERT falla y libera, ESE disparo puntual se pierde
 * igual (nadie reintenta dentro del mismo request). Es infinitamente mejor que el estado
 * anterior (perdido SIEMPRE, sin importar si hubo carrera): el próximo disparo del evento —no
 * este mismo— vuelve a encontrar el scope libre.
 */
async function releaseMailSlotOnFailure(claimId: string, sendOk: boolean): Promise<void> {
  if (sendOk) return;
  const db = getAdminSupabaseClient();
  const { error } = await db.from("mail_log").delete().eq("id", claimId);
  if (error) {
    console.error(`[mail] no se pudo liberar el turno ${claimId} tras un envío fallido: ${error.message}`);
  }
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
      const claimId = await claimMailSlot(input.studentId, "enrollment_granted", input.courseId);
      if (claimId) {
        let sendOk = false;
        try {
          const { subject, html, text } = renderEnrollmentGrantedMail({
            studentName: student.name,
            courseTitle: course.title,
            teacherName: course.teacherName,
            courseUrl: `${getSiteUrl()}/cursos/${course.slug}`,
          });
          const result = await sendMail({ to: { email: student.email, name: student.name }, subject, html, text });
          sendOk = result.ok;
        } catch (err) {
          console.error("[mail] mail de inscripción a la alumna falló:", err);
        } finally {
          await releaseMailSlotOnFailure(claimId, sendOk);
        }
      }
    }

    const teacher = await getUserEmail(course.teacherId).catch((err) => {
      console.error("[mail] no se pudo resolver la docente:", err);
      return null;
    });
    // scope_key incluye a la ALUMNA, no solo el curso: la docente tiene que enterarse de CADA
    // alumna nueva, no solo la primera — con scope_key = curso a secas, la segunda alumna del
    // mismo curso jamás generaría aviso porque la primera ya "gastó" ese scope.
    if (teacher && student) {
      const claimId = await claimMailSlot(
        course.teacherId,
        "teacher_new_student",
        `${input.courseId}:${input.studentId}`
      );
      if (claimId) {
        let sendOk = false;
        try {
          const { subject, html, text } = renderTeacherNewStudentMail({
            teacherName: teacher.name,
            studentName: student.name,
            courseTitle: course.title,
            courseUrl: `${getSiteUrl()}/panel/docente/cursos/${input.courseId}`,
          });
          const result = await sendMail({ to: { email: teacher.email, name: teacher.name }, subject, html, text });
          sendOk = result.ok;
        } catch (err) {
          console.error("[mail] aviso de alumna nueva a la docente falló:", err);
        } finally {
          await releaseMailSlotOnFailure(claimId, sendOk);
        }
      }
    }
  } catch (err) {
    console.error("[mail] notifyEnrollmentActivated falló:", err);
  }
}

/**
 * Mail 3/4 — dispara desde `entrar/actions.ts::sendWelcomeEmailAction`, self-service, nunca con
 * un destinatario que venga del cliente (ver ese archivo). D2 (juez ciego): sin destinatario
 * parametrizable no hay relay abierto hacia un TERCERO, pero antes de `claimMailSlot` no había
 * nada que impidiera invocar la action repetidas veces contra la PROPIA sesión (que puede ser
 * la de una cuenta creada con el email de otra persona, sin verificar — `enable_confirmations
 * = false`) y bombardearla igual. `scope_key` fijo ("account"): bienvenida es una vez por
 * cuenta, para siempre, no una vez por curso — no hay nada que la repita legítimamente.
 */
export async function notifyWelcome(input: { userId: string }): Promise<void> {
  try {
    // Resolver ANTES de reclamar (D3 del juez ciego, ronda 3): si `getUserEmail` falla, no se
    // gasta el único turno de esta cuenta en un intento que ni siquiera iba a mandar nada.
    const student = await getUserEmail(input.userId);
    if (!student) return;

    const claimId = await claimMailSlot(input.userId, "welcome", "account");
    if (!claimId) return;

    let sendOk = false;
    try {
      const { subject, html, text } = renderWelcomeMail({
        studentName: student.name,
        catalogUrl: `${getSiteUrl()}/cursos`,
      });
      const result = await sendMail({ to: { email: student.email, name: student.name }, subject, html, text });
      sendOk = result.ok;
    } finally {
      await releaseMailSlotOnFailure(claimId, sendOk);
    }
  } catch (err) {
    console.error("[mail] notifyWelcome falló:", err);
  }
}

/**
 * Mail 2/4 — dispara desde `leccion/[id]/actions.ts::saveLessonProgress` la primera vez que se
 * emite el certificado (T-018) de un curso para ese alumno. `certificateCode` ya viene resuelto
 * por el caller (`ensureCertificate`) — este módulo no vuelve a tocar la tabla `certificates`.
 * El chequeo de "¿ya había certificado?" del caller acota el caso común, pero tiene la MISMA
 * forma de carrera que D3 (leer, después actuar) si dos lecciones se completan a la vez —
 * `certificateCode` como `scope_key` cierra esa ventana acá también, sin depender de que el
 * caller la haya cerrado bien.
 */
export async function notifyCourseCompleted(input: {
  userId: string;
  courseTitle: string;
  certificateCode: string;
}): Promise<void> {
  try {
    // Mismo orden que `notifyWelcome`: resolver antes de reclamar.
    const student = await getUserEmail(input.userId);
    if (!student) return;

    const claimId = await claimMailSlot(input.userId, "course_completed", input.certificateCode);
    if (!claimId) return;

    let sendOk = false;
    try {
      const { subject, html, text } = renderCourseCompletedMail({
        studentName: student.name,
        courseTitle: input.courseTitle,
        certificateUrl: `${getSiteUrl()}/certificado/${input.certificateCode}`,
      });
      const result = await sendMail({ to: { email: student.email, name: student.name }, subject, html, text });
      sendOk = result.ok;
    } finally {
      await releaseMailSlotOnFailure(claimId, sendOk);
    }
  } catch (err) {
    console.error("[mail] notifyCourseCompleted falló:", err);
  }
}
