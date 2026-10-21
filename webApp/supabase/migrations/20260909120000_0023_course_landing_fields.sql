-- T-027 · Campos de la ficha de curso + S-05.
--
-- POR QUE EL GUARD VA EN ESTE ARCHIVO Y NO EN UNO PROPIO.
-- S-05 (auditoria 2026-09-09) es una fuga que YA EXISTE: `body_has_known_locator` -la mitad de
-- ADR-009 que hace coincidencia EXACTA contra `lessons.video_id` y `lesson_resources`- se aplico
-- a `campus_posts` (0016) y `diario_posts` (0018/0020), y nunca a `courses`. Reproducido contra
-- el stack local: una docente escribe el video_id real de una leccion paga en `courses.intro`
-- desde su formulario normal, y sale a `anon` SIN SESION por PostgREST.
--
-- Esta migracion agrega TRES campos de texto mas a esa misma superficie servida a `anon`. Sumar
-- campos a una superficie con esta fuga la agranda, asi que el guard entra ACA: el ticket que
-- ensancha el agujero es el que lo tapa.
--
-- POR QUE TRIGGER Y NO CHECK. `body_has_known_locator` consulta otras tablas: un CHECK no puede
-- llevar subconsulta y ademas debe ser inmutable. Mismo patron exacto que `guard_diario_posts()`.
--
-- POR QUE LAS DOS MITADES Y NO SOLO LA EXACTA. `text_has_locator` (forma) atrapa URLs que todavia
-- no son de nadie; `body_has_known_locator` atrapa el id de 11 caracteres que no tiene forma de
-- URL. Ninguna cubre a la otra — es la leccion que le costo a T-022 un rechazo de QA.

alter table public.courses
  add column learning_objectives text[]  not null default '{}',
  add column prerequisites       text[]  not null default '{}',
  add column description         text,
  add column language            char(2) not null default 'es',
  add column promo_video_id      text;

-- Riesgo de la spec T-027: `intro` venia haciendo de descripcion. Los cursos existentes copian
-- `intro` a `description` e `intro` queda como esta: nadie pierde texto. Idempotente (solo toca
-- `description is null`). Sin triggers: la copia no es una edicion de la docente, asi que no debe
-- mover `updated_at` ("Ultima actualizacion", criterio 4).
alter table public.courses disable trigger user;
update public.courses set description = intro where description is null and intro is not null;
alter table public.courses enable trigger user;

-- `language`: dos letras minusculas. Cerrado por dominio, no por texto libre.
alter table public.courses
  add constraint courses_language_format check (language ~ '^[a-z]{2}$');

-- Mismo CHECK de formato que `lessons.video_id` (0001): el id de YouTube es exactamente
-- [A-Za-z0-9_-]{11}. Pegar la URL entera falla aca, igual que en lecciones.
alter table public.courses
  add constraint courses_promo_video_id_format
    check (promo_video_id is null or promo_video_id ~ '^[A-Za-z0-9_-]{11}$');

-- Mitad 1 de ADR-009 (forma), igual que 0008 hizo con el resto de las columnas de `courses`.
alter table public.courses
  add constraint courses_description_no_locator
    check (not public.text_has_locator(description)),
  add constraint courses_learning_objectives_no_locator
    check (not public.array_has_locator(learning_objectives)),
  add constraint courses_prerequisites_no_locator
    check (not public.array_has_locator(prerequisites));

-- ---------------------------------------------------------------- S-05 · mitad 2, exacta
-- Cubre TODA la superficie de `courses` legible por `anon`, no solo lo que agrega T-027: la
-- fuga preexistente esta en `intro`, `title` y `subtitle`.
--
-- SIN bypass de service_role, a proposito. En `guard_diario_posts` el bypass existe para que la
-- moderacion pueda actuar sobre un post ya escrito. Aca no hay nada equivalente: publicar un
-- curso no reescribe su prosa, y un localizador pago en el catalogo publico es igual de grave lo
-- escriba quien lo escriba. Menos superficie, menos que razonar.
create or replace function public.guard_courses_locator()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  campo text;
begin
  foreach campo in array array[
    coalesce(new.title, ''), coalesce(new.title_em, ''), coalesce(new.subtitle, ''),
    coalesce(new.intro, ''), coalesce(new.description, ''), coalesce(new.slug, '')
  ] loop
    if public.body_has_known_locator(campo) then
      raise exception 'un campo publico de courses contiene un localizador de contenido pago'
        using errcode = '42501';
    end if;
  end loop;

  foreach campo in array (coalesce(new.learning_objectives, '{}'::text[]) || coalesce(new.prerequisites, '{}'::text[])) loop
    if public.body_has_known_locator(campo) then
      raise exception 'un campo publico de courses contiene un localizador de contenido pago'
        using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;

create trigger courses_locator_guard
  before insert or update on public.courses
  for each row execute function public.guard_courses_locator();

-- ---------------------------------------------------------------- privilegios (R-1)
-- Los grants van ACA y no en 0003 por orden de aplicacion: 0003 corre antes que este archivo y
-- no puede otorgar sobre columnas que todavia no existen. Mismo patron que 0011, que agrego los
-- campos publicos de `profiles` con sus grants adentro.
--
-- La regla de CLAUDE.md sigue en pie y es la razon por la que estas cinco lineas existen: una
-- columna nueva NO queda expuesta sola. `alter default privileges` de Supabase otorga a nivel
-- TABLA en tablas nuevas, no en columnas agregadas a una tabla existente — asi que sin este
-- bloque los cinco campos serian invisibles para el cliente, que es el default correcto.
--
-- Se sirven a `anon` a proposito: son material de VENTA. Su defensa no es el grant sino ADR-009
-- en sus dos mitades — el CHECK de forma de arriba y `courses_locator_guard`.
grant select (learning_objectives, prerequisites, description, language, promo_video_id)
  on public.courses to anon, authenticated;

grant insert (learning_objectives, prerequisites, description, language, promo_video_id)
  on public.courses to authenticated;

grant update (learning_objectives, prerequisites, description, language, promo_video_id)
  on public.courses to authenticated;

-- ---------------------------------------------------------------- EXECUTE
-- Postgres otorga EXECUTE a PUBLIC por defecto en toda funcion nueva, asi que crear un guard
-- abre una funcion al mundo salvo que se revoque. `rls-mutation.test.mjs` lo verifica y por eso
-- este barrido cierra cada migracion que agrega funciones (0005, 0006, 0008, 0009, 0022).
-- `guard_courses_locator` no necesita EXECUTE de nadie: la invoca el trigger, no un caller.
revoke execute on all functions in schema public from public;

-- ---------------------------------------------------------------- inscriptas, sin exponer quienes
-- Criterio 6 pide que el numero de inscriptas de la ficha SALGA DE LA BASE y coincida con la
-- realidad (misma leccion que T-019 c.2: un conteo inventado es peor que ninguno). Pero `anon`
-- no puede leer `enrollments` -- RLS se lo niega, y esta bien que se lo niegue.
--
-- POR QUE UNA FUNCION Y NO RELAJAR RLS. Exponer CUANTAS alumnas hay es aceptable -- es prueba
-- social, la razon por la que el dato esta en la ficha. Exponer QUIENES son, no. Una politica de
-- RLS que dejara a `anon` seleccionar filas de `enrollments` daria las dos cosas; esta funcion
-- da solo la primera y no hay forma de sacarle otra.
--
-- POR QUE NO UNA COLUMNA `student_count`. Seria mentira en cuanto alguien se da de baja. Misma
-- doctrina que `completed` (ADR-007): se deriva, no se declara.
--
-- Solo cuenta cursos PUBLICADOS: el conteo de un borrador no es asunto de nadie de afuera.
create or replace function public.course_student_count(p_course_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer
    from public.enrollments e
    join public.courses c on c.id = e.course_id
   where e.course_id = p_course_id
     and e.status = 'active'
     and c.status = 'published';
$$;

revoke execute on all functions in schema public from public;
grant execute on function public.course_student_count(uuid) to anon, authenticated, service_role;
