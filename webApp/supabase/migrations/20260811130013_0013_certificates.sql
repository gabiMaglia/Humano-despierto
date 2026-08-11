-- T-018 · Certificado verificable (ADR-007, ADR-009)
--
-- POR QUE ESTA FORMA.
-- Decision del PO: pagina publica en /certificado/<codigo>, sin sesion, impresa desde el
-- navegador. "Verificable" significa una sola cosa concreta: quien tiene el LINK ve el
-- certificado; quien no lo tiene, no lo encuentra. El codigo es la UNICA barrera (criterio 2)
-- -- no un id secuencial, no el uuid de la inscripcion (ese ya existe en `enrollments` y
-- correlacionarlo con el certificado seria reusar como secreto un id que otra pantalla podria
-- exponer maniana) -- asi que esta tabla acuina su PROPIO codigo, generado por la base con su
-- CSPRNG (`gen_random_uuid()`, nucleo de Postgres desde la v13, sin pgcrypto), nunca por el
-- cliente ni por el Server Action que lo inserta.
--
-- "Se emite al completar TODAS las lecciones publicadas" y "`completed` es derivada, nadie la
-- declara" (ADR-007) se extienden ACA: ni el cliente ni el Server Action de T-018 declaran
-- nombre/curso/guia/fecha -- los computa el guard de INSERT contra la verdad de la base EN ESE
-- INSTANTE (profiles/courses/lesson_progress), y pisa lo que venga en el INSERT. Es el mismo
-- patron de `guard_lesson_progress_insert` (0006): un invariante de integridad de negocio, sin
-- bypass de service_role -- un invariante con puerta trasera no es un invariante.
--
-- SNAPSHOT, no referencia viva (criterio 6: sobrevive a la inscripcion). Si se revoca la
-- inscripcion o se despublica/borra el curso, el certificado sigue siendo valido porque
-- certifica algo que YA paso -- por eso `student_name`/`course_title`/`teacher_name` son texto
-- propio de esta fila, copiado UNA vez al emitir, y `user_id`/`course_id` son `on delete set
-- null`: la fila sobrevive aunque el perfil o el curso desaparezcan; los cuatro campos publicos
-- no dependen de ese FK en ningun momento posterior a la emision.

create table public.certificates (
  id           uuid        primary key default gen_random_uuid(),
  -- El campo que abre la pagina publica. `text`, no `uuid`: asi PostgREST/el ORM no lo tratan
  -- como una FK y nadie intenta "resolverlo" contra otra tabla. Se REGENERA en el guard de
  -- insercion de mas abajo pase lo que pase en el INSERT -- ver ese comentario.
  code         text        not null unique default replace(gen_random_uuid()::text, '-', ''),
  user_id      uuid        references public.profiles (id) on delete set null,
  course_id    uuid        references public.courses (id) on delete set null,
  student_name text        not null,
  course_title text        not null,
  teacher_name text        not null,
  -- La fecha que muestra el certificado: cuando el alumno TERMINO el curso (maximo de
  -- `lesson_progress.completed_at` entre las lecciones publicadas), no cuando esta fila se creo
  -- -- la emision puede ser perezosa (T-018: se calcula de nuevo, sin romper nada, cada vez que
  -- el panel o el propio alumno la piden) y esas dos fechas pueden no coincidir.
  completed_at timestamptz not null,
  created_at   timestamptz not null default now(),
  -- Un alumno tiene A LO SUMO un certificado por curso. `unique` con columnas nullable no
  -- colisiona entre filas que ya perdieron su FK (dos `null` no son iguales para Postgres),
  -- asi que sigue sirviendo de arbitro de "ya emitido" mientras el vinculo original existe.
  constraint certificates_user_course_key unique (user_id, course_id)
);

create index certificates_user_idx on public.certificates (user_id);

-- ADR-009: cualquier columna de texto libre legible SIN SESION cae dentro del barrido, otorgue
-- o no privilegio de PostgREST a `anon` -- la pagina publica de T-018 la sirve con service_role,
-- asi que el scan automatico de `locator-free-text.test.mjs` (que mide `has_column_privilege`)
-- no la va a encontrar sola. Se suman las tres a mano, con la MISMA funcion que ya usan
-- `courses.title` y `profiles.full_name`: si el origen ya esta cerrado, la copia hereda la
-- garantia; si maniana alguien cambia de donde sale el texto, el CHECK sigue ahi.
alter table public.certificates
  add constraint certificates_student_name_no_locator check (not public.text_has_locator(student_name)),
  add constraint certificates_course_title_no_locator check (not public.text_has_locator(course_title)),
  add constraint certificates_teacher_name_no_locator check (not public.text_has_locator(teacher_name));

-- ================================================================ el invariante de emision

-- Verdadero solo si el curso tiene al menos una leccion publicada y TODAS tienen una fila de
-- `lesson_progress` completada para ese alumno. `security definer`: la invoca el guard de mas
-- abajo, que necesita ver `lessons`/`lesson_progress` sin la RLS de sesion -- el unico llamador
-- real es siempre service_role (que ya bypassea RLS), pero el patron es el mismo de
-- `lesson_progress_completes` (0006): no depende de quien la llama.
create or replace function public.certificate_eligible(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l where l.course_id = p_course_id and l.is_published
  )
  and not exists (
    select 1
    from public.lessons l
    where l.course_id = p_course_id
      and l.is_published
      and not exists (
        select 1 from public.lesson_progress lp
        where lp.lesson_id = l.id and lp.user_id = p_user_id and lp.completed
      )
  );
$$;

-- El guard: unico camino de escritura real de esta tabla (ni `anon` ni `authenticated` tienen
-- ningun grant sobre `certificates`, ver mas abajo -- solo `service_role` puede insertar, via
-- `alter default privileges ... grant all on tables to service_role` de 0007). Aun asi el guard
-- NO confia en el `INSERT` que le llega: vuelve a verificar la elegibilidad contra la base y
-- SOBREESCRIBE los cuatro campos publicos y el codigo, sin excepcion para `service_role` -- el
-- mismo criterio que 0006 aplica a `lesson_progress_completes`: esto mantiene un invariante, no
-- arbitra un permiso, y un invariante con bypass no es un invariante.
create or replace function public.guard_certificates_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_name text;
  v_course_title text;
  v_teacher_name text;
  v_completed_at timestamptz;
begin
  if new.user_id is null or new.course_id is null then
    raise exception 'certificates.user_id y course_id son obligatorios al emitir'
      using errcode = '23514';
  end if;

  if not public.certificate_eligible(new.user_id, new.course_id) then
    raise exception 'el curso no tiene todas sus lecciones publicadas completas para este alumno'
      using errcode = '42501';
  end if;

  select p.full_name into v_student_name from public.profiles p where p.id = new.user_id;
  if v_student_name is null then
    raise exception 'no existe el perfil del alumno' using errcode = '23514';
  end if;

  select c.title, t.full_name
    into v_course_title, v_teacher_name
    from public.courses c
    join public.profiles t on t.id = c.teacher_id
    where c.id = new.course_id;
  if v_course_title is null then
    raise exception 'no existe el curso o su docente' using errcode = '23514';
  end if;

  select max(lp.completed_at)
    into v_completed_at
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = new.user_id
      and lp.course_id = new.course_id
      and l.is_published
      and lp.completed;

  -- Derivado, no declarado (ADR-007 extendido a T-018): lo que haya mandado el INSERT en estas
  -- columnas se descarta entero.
  new.student_name := v_student_name;
  new.course_title := v_course_title;
  new.teacher_name := v_teacher_name;
  new.completed_at := v_completed_at;
  -- El codigo tambien se regenera aca, ignorando el default de la columna y cualquier valor que
  -- venga en el INSERT: la unica fuente de verdad del codigo es el CSPRNG de la base, en el
  -- instante de la emision (criterio 2 -- "el codigo es la unica barrera").
  new.code := replace(gen_random_uuid()::text, '-', '');

  return new;
end;
$$;

create trigger certificates_guard_insert
  before insert on public.certificates
  for each row execute function public.guard_certificates_insert();

-- Un certificado, una vez emitido, no se edita ni se borra desde ningun rol de cliente (no hay
-- grant de UPDATE/DELETE para `anon`/`authenticated` -- ver privilegios mas abajo). Este guard
-- es la segunda capa, igual que `guard_enrollments` (0005): si alguna migracion futura abre el
-- grant "para destrabar algo", esto lo sigue deteniendo. Sin bypass de service_role a proposito,
-- por el mismo motivo que el de INSERT: un certificado ya emitido certifica algo que YA paso, y
-- eso no lo cambia nadie, ni el equipo con la key de service_role.
create or replace function public.guard_certificates_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'un certificado emitido no se modifica ni se borra (T-018 c.6)'
    using errcode = '42501';
end;
$$;

create trigger certificates_guard_immutable
  before update or delete on public.certificates
  for each row execute function public.guard_certificates_immutable();

-- ================================================================ RLS

alter table public.certificates enable row level security;

-- Unica policy: el propio alumno puede LEER su fila (alimenta "Ver certificado" en /panel).
-- Sin policy de INSERT/UPDATE/DELETE para ningun rol de cliente -- redundante a proposito con
-- la ausencia de privilegios de mas abajo, mismo criterio que `enrollments` (0004).
-- La pagina PUBLICA (/certificado/<codigo>, sin sesion) NO pasa por aca: la sirve
-- `getPublicCertificate` con service_role, que bypassea RLS -- el codigo es la barrera, no una
-- policy que tendria que comparar un secreto contra `auth.uid()` inexistente.
create policy certificates_read_own on public.certificates
  for select to authenticated
  using (user_id = auth.uid());

-- ================================================================ privilegios
--
-- Naceria con cero privilegios para anon/authenticated de todos modos (0003:19 fija el default
-- para TODA tabla futura), pero se deja explicito por legibilidad -- mismo estilo que el resto
-- del archivo de privilegios.
-- `user_id` va en la lista aunque no se muestre en ningun lado (T-018 c.4): la policy
-- `certificates_read_own` lo compara en el WHERE, y el privilegio de columna se exige sobre
-- CUALQUIER referencia de la sentencia, no solo sobre la lista del SELECT -- sin este grant el
-- alumno ni siquiera puede leer su propia fila (medido, no supuesto: sin `user_id` en la lista
-- el filtro `where user_id = auth.uid()` da 42501 antes de llegar a evaluar la RLS).
grant select (id, code, course_id, user_id, completed_at, created_at)
  on public.certificates to authenticated;
-- Sin INSERT/UPDATE/DELETE para ningun rol de cliente: la emision es responsabilidad exclusiva
-- del Server Action de T-018, que llama con service_role DESPUES de verificar elegibilidad con
-- el cliente de sesion del alumno (defensa en profundidad -- el guard de arriba es la autoridad
-- real). `service_role` ya tiene grant total sobre toda tabla nueva via el default privilege de
-- 0007.

-- ================================================================ privilegios de ejecucion
--
-- REGLA de 0005:153 -- toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;

-- `certificate_eligible()` NO se otorga a `authenticated`: es `security definer` y el unico
-- llamador es el guard, que corre como owner -- otorgarsela al cliente la convertiria en un
-- oraculo de "elegible si/no" sobre cursos ajenos, igual que `lesson_progress_completes` (T-012
-- H-1). `service_role` conserva el EXECUTE del default privilege de Supabase.
