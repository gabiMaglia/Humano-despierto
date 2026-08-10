-- T-001 · Esquema base (ADR-002, ADR-004, ADR-005)
-- Reglas duras:
--   · dinero en centavos INTEGER, tiempo en segundos INTEGER. Nunca float, nunca texto.
--   · todo lo derivable NO se guarda (progreso, horas totales, numerales romanos de posicion).
--   · `course_id` viaja denormalizado por toda la jerarquia de contenido con FK compuesta:
--     es la clave de acceso de RLS y evita el estado imposible "leccion colgada del modulo de otro curso" (ADR-005).

-- ---------------------------------------------------------------- utilidades

-- search_path fijado en vacio como en toda funcion de `public`: la regla es de la clase, no
-- del caso, y asi se verifica de una pasada sobre pg_proc (ver 0005).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text        not null default 'student' check (role in ('student', 'teacher', 'admin')),
  full_name   text        not null default '',
  slug        text,
  glyph       text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- slug solo lo tienen docentes/admin con pagina publica; parcial para no exigirlo a los alumnos.
create unique index profiles_slug_key on public.profiles (slug) where slug is not null;
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------- courses

-- Sin `format` ni `duration_weeks`: ADR-004 los deja sin referente en un modelo on-demand puro
-- (ver resolucion en ADR-004 puntos 3 y 5). Las horas totales se agregan de lessons.duration_seconds.
create table public.courses (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique,
  title        text        not null,
  title_em     text,
  subtitle     text,
  intro        text,
  discipline   text        not null,
  level        text        not null,
  price_cents  integer     not null default 0 check (price_cents >= 0),
  currency     char(3)     not null default 'ARS' check (currency ~ '^[A-Z]{3}$'),
  roman_num    text,
  moon_glyph   text,
  includes     text[]      not null default '{}',
  teacher_id   uuid        not null references public.profiles (id) on delete restrict,
  status       text        not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured     boolean     not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint courses_published_at_matches_status
    check ((status = 'published') = (published_at is not null))
);

create index courses_teacher_idx on public.courses (teacher_id);
create index courses_published_idx on public.courses (status) where status = 'published';

-- ---------------------------------------------------------------- course_modules

create table public.course_modules (
  id          uuid        primary key default gen_random_uuid(),
  course_id   uuid        not null references public.courses (id) on delete cascade,
  position    integer     not null check (position > 0),
  title       text        not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- destino de la FK compuesta de lessons
  constraint course_modules_id_course_key unique (id, course_id),
  -- DEFERRABLE: reordenar (T-005 c.3) intercambia posiciones dentro de una transaccion.
  -- Sin deferir, el swap chocaria con el unique a mitad de camino.
  constraint course_modules_position_key unique (course_id, position) deferrable initially immediate
);

-- ---------------------------------------------------------------- lessons

create table public.lessons (
  id               uuid        primary key default gen_random_uuid(),
  course_id        uuid        not null,
  module_id        uuid        not null,
  position         integer     not null check (position > 0),
  title            text        not null,
  description      text,
  video_provider   text        not null default 'youtube' check (video_provider in ('youtube')),
  video_id         text,
  duration_seconds integer     not null default 0 check (duration_seconds >= 0),
  is_preview       boolean     not null default false,
  is_published     boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint lessons_module_fk foreign key (module_id, course_id)
    references public.course_modules (id, course_id) on delete cascade,
  constraint lessons_id_course_key unique (id, course_id),
  constraint lessons_position_key unique (module_id, position) deferrable initially immediate,
  -- T-005 c.4: el id de YouTube es exactamente [A-Za-z0-9_-]{11}. Pegar una URL entera falla aca.
  constraint lessons_video_id_format check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$'),
  -- T-012 · lo que se impide no es que exista un borrador incompleto, sino que se PUBLIQUE una
  -- leccion que ningun alumno podria completar nunca: `completed` se deriva del umbral contra
  -- `duration_seconds` (ADR-007) y con duracion 0 ese umbral no se cruza con ningun valor.
  -- Por eso el corte va en la publicacion y no en la tabla: un `check (duration_seconds > 0)` a
  -- secas haria imposible el alta, que es de DOS pasos por construccion — la docente crea el
  -- esqueleto y el servidor resuelve el video contra la API de YouTube (T-005 c.4b). Publicar ya
  -- exigia `video_id`, asi que no cambia el orden de operaciones de nadie.
  -- Es el respaldo en DB de lo que T-005 c.4b promete en la app; nadie lo bypassea, ni service_role.
  constraint lessons_published_needs_video
    check (not is_published or (video_id is not null and duration_seconds > 0))
);

create index lessons_course_idx on public.lessons (course_id);
create index lessons_module_idx on public.lessons (module_id);

-- ---------------------------------------------------------------- lesson_chapters

create table public.lesson_chapters (
  id            uuid        primary key default gen_random_uuid(),
  course_id     uuid        not null,
  lesson_id     uuid        not null,
  position      integer     not null check (position > 0),
  start_seconds integer     not null check (start_seconds >= 0),
  label         text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint lesson_chapters_lesson_fk foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on delete cascade,
  constraint lesson_chapters_position_key unique (lesson_id, position) deferrable initially immediate
);

create index lesson_chapters_lesson_idx on public.lesson_chapters (lesson_id);

-- ---------------------------------------------------------------- lesson_resources

create table public.lesson_resources (
  id            uuid        primary key default gen_random_uuid(),
  course_id     uuid        not null,
  lesson_id     uuid        not null,
  position      integer     not null check (position > 0),
  type          text        not null check (type in ('pdf', 'audio', 'texto', 'link')),
  name          text        not null,
  drive_file_id text,
  url           text,
  size_label    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint lesson_resources_lesson_fk foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on delete cascade,
  constraint lesson_resources_position_key unique (lesson_id, position) deferrable initially immediate,
  constraint lesson_resources_has_target check (drive_file_id is not null or url is not null)
);

create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id);

-- ---------------------------------------------------------------- enrollments

-- Sin estado 'completed': la finalizacion del curso es DERIVADA de lesson_progress.
-- Guardarla aca seria una cache sin invalidacion: agregar una leccion al curso dejaria
-- "completadas" a todas las inscripciones existentes, en silencio.
create table public.enrollments (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  course_id   uuid        not null references public.courses (id) on delete restrict,
  status      text        not null default 'active' check (status in ('active', 'revoked')),
  enrolled_at timestamptz not null default now(),
  granted_by  uuid        references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  constraint enrollments_user_course_key unique (user_id, course_id)
);

create index enrollments_active_idx on public.enrollments (user_id, course_id) where status = 'active';
create index enrollments_course_idx on public.enrollments (course_id);

-- ---------------------------------------------------------------- lesson_progress

create table public.lesson_progress (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  course_id       uuid        not null,
  lesson_id       uuid        not null,
  seconds_watched integer     not null default 0 check (seconds_watched >= 0),
  completed       boolean     not null default false,
  completed_at    timestamptz,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint lesson_progress_lesson_fk foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on delete cascade,
  constraint lesson_progress_user_lesson_key unique (user_id, lesson_id),
  constraint lesson_progress_completed_at_matches check (completed = (completed_at is not null))
);

create index lesson_progress_user_course_idx on public.lesson_progress (user_id, course_id);

-- ---------------------------------------------------------------- lesson_notes

create table public.lesson_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  course_id  uuid        not null,
  lesson_id  uuid        not null,
  at_seconds integer     not null default 0 check (at_seconds >= 0),
  body       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_notes_lesson_fk foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on delete cascade
);

create index lesson_notes_user_lesson_idx on public.lesson_notes (user_id, lesson_id);

-- ---------------------------------------------------------------- updated_at

create trigger profiles_set_updated_at         before update on public.profiles         for each row execute function public.set_updated_at();
create trigger courses_set_updated_at          before update on public.courses          for each row execute function public.set_updated_at();
create trigger course_modules_set_updated_at   before update on public.course_modules   for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at          before update on public.lessons          for each row execute function public.set_updated_at();
create trigger lesson_chapters_set_updated_at  before update on public.lesson_chapters  for each row execute function public.set_updated_at();
create trigger lesson_resources_set_updated_at before update on public.lesson_resources for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at      before update on public.enrollments      for each row execute function public.set_updated_at();
create trigger lesson_notes_set_updated_at     before update on public.lesson_notes     for each row execute function public.set_updated_at();
