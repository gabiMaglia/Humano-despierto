-- T-020 · registro de envíos de mail — juez ciego, rechazo 1, D2 + D3
--
-- QUÉ ENCONTRÓ EL JUEZ.
-- D2 (bloqueante): `sendWelcomeEmailAction` no toma ningún parámetro de destinatario —eso SÍ
-- cierra el relay abierto que se había mirado antes— pero no tiene límite de cuántas veces se
-- puede invocar. Con `enable_confirmations = false` (config.toml), cualquiera puede
-- autoregistrarse con el EMAIL DE UN TERCERO sin verificarlo, quedar con sesión propia, y
-- llamar la action las veces que quiera: cada llamada es un mail de bienvenida más a una
-- dirección ajena. Bombardeo de mail servido por la propia app.
-- D3 (declarado, no reproducido en la ronda): `panel/admin/actions.ts::setEnrollmentAction` lee
-- `previous.status` y DESPUÉS hace el upsert — sin atomicidad entre las dos operaciones, dos
-- activaciones concurrentes de la misma inscripción pueden leer las dos "no estaba activa" y
-- mandar las dos el mail. Misma forma en `maybeNotifyCourseCompleted`.
--
-- POR QUÉ ESTA FORMA (una tabla con UNIQUE, no un flag ni una lectura previa).
-- La causa raíz común a D2 y D3 es la misma: decidir "¿ya mandé este mail?" con una LECTURA
-- seguida de una ESCRITURA, sin nada que las una atómicamente. Ninguna cantidad de código de
-- aplicación cierra esa ventana — dos requests concurrentes SIEMPRE pueden intercalarse entre
-- la lectura de una y la escritura de la otra. Lo que sí lo cierra es mover la decisión a una
-- restricción de la base: reclamar la fila con un INSERT que puede FALLAR por una UNIQUE. El
-- primero que reclama, manda; el que pierde la carrera (23505) no manda nada, sin importar qué
-- tan cerca en el tiempo hayan llegado las dos requests — la base arbitra, no una carrera de
-- lecturas. Mismo patrón que `certificates_user_course_key` (0013): la unicidad de negocio vive
-- en una constraint, no en un chequeo previo.
--
-- `scope_key`, no solo (destinatario, tipo). "Bienvenida" es una vez por CUENTA para siempre,
-- pero "te inscribieron" tiene que poder mandarse una vez POR CURSO — la misma alumna
-- inscribiéndose en dos cursos distintos son dos mails legítimos, no un duplicado. Con
-- UNIQUE(destinatario, tipo) a secas, el segundo curso quedaría bloqueado por el primero. Y el
-- aviso a la docente se repite por cada alumna nueva del MISMO curso, así que su scope_key suma
-- también a la alumna (`<course_id>:<student_id>`) — si solo llevara el curso, la segunda
-- alumna nunca generaría aviso porque la primera ya "gastó" ese scope.
--
-- SIN reintento y SIN expiración, a propósito. `sendMail` (T-020 criterio 2) ya es "un solo
-- intento, nunca se reintenta" — un mail que falla no se reintenta hoy ni con esta tabla ni sin
-- ella. Esta tabla reclama el turno ANTES de intentar el envío y lo deja reclamado pase lo que
-- pase con el resultado: es la MISMA política que ya regía (mejor un falso negativo ocasional —
-- no reintentar un mail que en verdad falló— que reabrir la ventana de duplicados que este
-- archivo existe para cerrar). Consecuencia aceptada: reactivar una inscripción después de
-- revocarla no genera un segundo mail de "te inscribieron" para el mismo (alumna, curso) — no
-- hay ningún criterio del ticket que pida lo contrario, y `enrollments` tampoco distingue esa
-- reactivación de la activación original (mismo `id`, mismo upsert por conflicto de
-- `user_id, course_id`).
--
-- SIN guard de inmutabilidad, a diferencia de `certificates` (0013). Esta tabla no certifica
-- nada que alguien vaya a verificar después — es contabilidad interna de la capa de mail. Si
-- algún día hace falta reprocesar un envío a mano, borrar la fila correspondiente alcanza; no
-- hay invariante de negocio que proteger de un DELETE, y agregar uno acá sería repetir la
-- lección de T-018 fuera de lugar (esa inmutabilidad protegía un documento público verificable,
-- no un lock de deduplicación).
--
-- `recipient_user_id` es `not null` — NO por prolijidad, sino porque `unique` trata dos NULL
-- como valores DISTINTOS (SQL estándar, Postgres incluido): con la columna nullable, dos INSERT
-- con `recipient_user_id = null` y el mismo `(mail_type, scope_key)` pasan LOS DOS, sin error.
-- Reproducido contra la base compartida antes de este fix. Es la misma trampa que el propio
-- 0013 documenta sobre su `unique (user_id, course_id)` — ahí es deliberada (permite que
-- distintos certificados huérfanos coexistan tras perder el vínculo); acá NO lo es: el propósito
-- entero de esta tabla es que la unicidad valga siempre. Se resuelve declarando la columna
-- obligatoria en vez de excluir el caso nulo del índice, porque los CUATRO tipos de mail de
-- T-020 siempre tienen un usuario resuelto antes de llamar a `claimMailSlot` — no hay ningún
-- envío legítimo de esta app sin destinatario registrado (a diferencia de, por ejemplo, un mail
-- transaccional a una dirección que todavía no tiene cuenta, que este proyecto no tiene). Si
-- algún día apareciera un mail así, la clave de deduplicación tendría que ser la DIRECCIÓN
-- normalizada, no `user_id` — no forzar esta columna a aceptar NULL "por las dudas".
create table public.mail_log (
  id                 uuid        primary key default gen_random_uuid(),
  -- `on delete cascade`: si el usuario desaparece, su historial de mails deja de importar — no
  -- hay nada que verificar después, a diferencia de `certificates`.
  recipient_user_id  uuid        not null references public.profiles (id) on delete cascade,
  mail_type          text        not null
    check (mail_type in ('welcome', 'enrollment_granted', 'course_completed', 'teacher_new_student')),
  scope_key          text        not null,
  created_at         timestamptz not null default now(),
  -- LA restricción que hace todo el trabajo de este archivo. Válida SOLO porque la columna de
  -- arriba es `not null` — ver el comentario.
  constraint mail_log_dedupe_key unique (recipient_user_id, mail_type, scope_key)
);

-- Ningún rol de cliente necesita leer ni escribir esto jamás — es contabilidad interna de la
-- capa de mail, exclusiva de `service_role` (que ya tiene el default de 0007 vía `alter default
-- privileges`). RLS habilitada SIN ninguna policy: cierre explícito, no solo el default cerrado
-- de 0003 — mismo estilo que el resto de las tablas de este esquema.
alter table public.mail_log enable row level security;
revoke all on public.mail_log from anon, authenticated;
