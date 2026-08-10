export const ID = {
  student:   '10000000-0000-4000-8000-000000000001',
  otro:      '10000000-0000-4000-8000-000000000002',
  teacherA:  '20000000-0000-4000-8000-00000000000a',
  teacherB:  '20000000-0000-4000-8000-00000000000b',
  admin:     '30000000-0000-4000-8000-000000000001',
  courseA:   '40000000-0000-4000-8000-00000000000a',
  courseB:   '40000000-0000-4000-8000-00000000000b',
  courseDraft: '40000000-0000-4000-8000-00000000000d',
  moduleA:   '50000000-0000-4000-8000-00000000000a',
  lessonA:   '60000000-0000-4000-8000-00000000000a',
  lessonPreviewB: '60000000-0000-4000-8000-00000000000b',
  resourceA: '70000000-0000-4000-8000-00000000000a',
  chapterA:  '80000000-0000-4000-8000-00000000000a',
  chapterPreview: '80000000-0000-4000-8000-00000000000b',
};

/** Valores centinela: si aparecen en una respuesta de cliente, hubo fuga. */
export const SECRET = {
  driveFileId: 'DRIVEFILEIDSECRETO',
  url: 'https://drive.google.com/file/d/DRIVEFILEIDSECRETO/view',
  videoId: 'dQw4w9WgXcQ',
};

/**
 * Se siembra como owner (equivale a un Server Action con service_role).
 * El alumno queda inscripto en courseA y NO en courseB: courseB es el blanco
 * del intento de auto-inscripcion.
 */
export async function seed(db) {
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ID.student}',  'alumna@humano.test'),
      ('${ID.otro}',     'otra@humano.test'),
      ('${ID.teacherA}', 'sol@humano.test'),
      ('${ID.teacherB}', 'luna@humano.test'),
      ('${ID.admin}',    'admin@humano.test');

    update public.profiles set role = 'teacher', full_name = 'Sol Mayor',  slug = 'sol-mayor'  where id = '${ID.teacherA}';
    update public.profiles set role = 'teacher', full_name = 'Luna Nueva', slug = 'luna-nueva' where id = '${ID.teacherB}';
    update public.profiles set role = 'admin',   full_name = 'Admin'                            where id = '${ID.admin}';
    update public.profiles set full_name = 'Alumna' where id = '${ID.student}';

    insert into public.courses (id, slug, title, discipline, level, price_cents, teacher_id, status, published_at) values
      ('${ID.courseA}', 'tarot-iniciacion',  'Tarot · Iniciacion',  'tarot',      'iniciacion', 24000, '${ID.teacherA}', 'published', now()),
      ('${ID.courseB}', 'astrologia-natal',  'Astrologia natal',    'astrologia', 'intermedio', 31000, '${ID.teacherB}', 'published', now()),
      ('${ID.courseDraft}', 'herbolaria-borrador', 'Herbolaria',    'herbolaria', 'iniciacion', 18000, '${ID.teacherB}', 'draft',     null);

    insert into public.course_modules (id, course_id, position, title) values
      ('${ID.moduleA}', '${ID.courseA}', 1, 'Los arcanos mayores');

    insert into public.lessons (id, course_id, module_id, position, title, video_id, duration_seconds, is_preview, is_published) values
      ('${ID.lessonA}',        '${ID.courseA}', '${ID.moduleA}', 1, 'El Loco',   'dQw4w9WgXcQ', 3138, false, true),
      ('${ID.lessonPreviewB}', '${ID.courseA}', '${ID.moduleA}', 2, 'La Suma Sacerdotisa', 'aQw4w9WgXcQ', 900, true, true);

    insert into public.lesson_resources (id, course_id, lesson_id, position, type, name, drive_file_id, url, size_label) values
      ('${ID.resourceA}', '${ID.courseA}', '${ID.lessonA}', 1, 'pdf', 'Cuaderno de trabajo',
       '${SECRET.driveFileId}', '${SECRET.url}', '2.4 MB');

    insert into public.lesson_chapters (id, course_id, lesson_id, position, start_seconds, label) values
      ('${ID.chapterA}',       '${ID.courseA}', '${ID.lessonA}',        1, 0,  'Apertura del arcano'),
      ('${ID.chapterPreview}', '${ID.courseA}', '${ID.lessonPreviewB}', 1, 12, 'Que vas a ver');

    insert into public.enrollments (user_id, course_id, granted_by) values
      ('${ID.student}', '${ID.courseA}', '${ID.admin}');
  `);
}
