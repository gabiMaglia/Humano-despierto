-- T-035 · ADR-010 · la coincidencia exacta cubre TODA la clase, no las tablas que alguien recordo.
--
-- POR QUE ESTE ARCHIVO EXISTE. `body_has_known_locator` -- la mitad de ADR-009 que compara contra
-- los valores REALES de `lessons.video_id` y `lesson_resources` -- se aplico a `campus_posts`
-- (0016), `diario_posts` (0018/0020), `courses` (0023, por S-05) y `course_reviews` (0024). Al
-- resto nunca, y nadie lo noto porque el unico invariante que existia cubria la OTRA mitad.
--
-- Reproducido antes de escribir esto, contra el stack local:
--   update public.lessons set title = 'Mira: <video_id real>'  → UPDATE 1
--   GET /rest/v1/lessons?select=title  (anon, sin sesion)      → lo devuelve
-- Es peor que S-05: `lessons.title` se MUESTRA en el acordeon de curriculum a cualquier visitante.
--
-- Y el invariante encontro mas de lo previsto: 19 columnas en 6 tablas, INCLUIDAS CINCO DE
-- `courses` QUE 0023 DEJO AFUERA (`discipline`, `level`, `moon_glyph`, `roman_num`, `includes`).
-- La migracion que arreglo S-05 cubrio las columnas en las que su autor estaba pensando, no la
-- clase. Ese es el argumento de ADR-010 en una linea.
--
-- POR QUE UNA FUNCION GENERICA Y NO SEIS. Seis copias del mismo plpgsql son seis lugares donde
-- olvidarse una columna, que es literalmente el bug de 0023. Con una sola, agregar una tabla es
-- una linea y el bug -- si aparece -- aparece en un unico lugar.
--
-- SIN BYPASS DE service_role. ADR-011: invariante ⇒ sin bypass, permiso ⇒ con bypass. Un
-- localizador pago en texto publico no puede ser verdad NUNCA, lo escriba quien lo escriba. Mismo
-- criterio con el que `guard_diario_posts` tampoco lo tiene.

create or replace function public.guard_locator_exacto()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  fila  jsonb := to_jsonb(new);
  campo text;
  valor jsonb;
  elem  text;
begin
  foreach campo in array tg_argv loop
    -- Si el nombre no existe en la fila, es un TYPO en la declaracion del trigger. Sin este
    -- corte la proteccion se apagaria EN SILENCIO para esa columna -- el modo de falla exacto
    -- que esta migracion existe para eliminar, reintroducido por la puerta de atras.
    if not (fila ? campo) then
      raise exception 'guard_locator_exacto: la columna % no existe en %', campo, tg_table_name
        using errcode = '42704';
    end if;

    valor := fila -> campo;
    if valor is null or jsonb_typeof(valor) = 'null' then
      continue;
    elsif jsonb_typeof(valor) = 'array' then
      -- text[] (`includes`, `learning_objectives`, `prerequisites`): el predicado va POR
      -- ELEMENTO, igual que `array_has_locator` en la mitad de forma.
      for elem in select jsonb_array_elements_text(valor) loop
        if public.body_has_known_locator(elem) then
          raise exception 'un campo publico de % contiene un localizador de contenido pago', tg_table_name
            using errcode = '42501';
        end if;
      end loop;
    else
      -- `#>> '{}'` saca el texto del escalar jsonb sin las comillas que trae `::text`.
      if public.body_has_known_locator(valor #>> '{}') then
        raise exception 'un campo publico de % contiene un localizador de contenido pago', tg_table_name
          using errcode = '42501';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

-- `courses` pasa al generico CON LA LISTA COMPLETA. El de 0023 queda redundante y se va: dos
-- mecanismos sobre la misma tabla es un lugar mas donde pueden divergir.
drop trigger if exists courses_locator_guard on public.courses;
drop function if exists public.guard_courses_locator();

create trigger courses_locator_guard
  before insert or update on public.courses
  for each row execute function public.guard_locator_exacto(
    'title', 'title_em', 'subtitle', 'intro', 'description', 'slug',
    'discipline', 'level', 'moon_glyph', 'roman_num',
    'includes', 'learning_objectives', 'prerequisites'
  );

create trigger lessons_locator_guard
  before insert or update on public.lessons
  for each row execute function public.guard_locator_exacto('title', 'description');

create trigger course_modules_locator_guard
  before insert or update on public.course_modules
  for each row execute function public.guard_locator_exacto('title', 'description');

create trigger lesson_chapters_locator_guard
  before insert or update on public.lesson_chapters
  for each row execute function public.guard_locator_exacto('label');

create trigger lesson_resources_locator_guard
  before insert or update on public.lesson_resources
  for each row execute function public.guard_locator_exacto('name', 'size_label');

-- `profiles` es la tabla mas delicada del esquema: `handle_new_user` inserta aca en el alta de
-- cuenta. El guard es el mismo que el resto -- lo que cambia es que el camino legitimo (registrarse)
-- se verifica a mano ademas de con la suite, que es lo que ADR-011 pregunta primero.
create trigger profiles_locator_guard
  before insert or update on public.profiles
  for each row execute function public.guard_locator_exacto(
    'full_name', 'bio', 'slug', 'glyph', 'headline', 'location', 'quote'
  );

-- Regla de 0005:153 / 0006:233 — toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
