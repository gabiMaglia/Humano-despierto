-- T-080 · D-12 · La coincidencia exacta de ADR-009 corre tambien al escribir el LOCALIZADOR.
--
-- QUE ESTABA ROTO (QA T-035). `body_has_known_locator` compara el texto que se ESCRIBE contra los
-- localizadores que YA existen. El orden inverso lo esquivaba:
--   1 · la docente pone en `lessons.title` un id que todavia no es de nadie  → pasa (no hay match)
--   2 · service_role asigna ese id como `lessons.video_id`                   → pasa (no hay guard)
--   3 · `anon` lee `lessons.title` y se lleva el localizador pago
-- El invariante solo se miraba desde un lado.
--
-- EL FIX: al escribir `lessons.video_id` o `lesson_resources.drive_file_id`/`url`, se barre el texto
-- que YA esta guardado. Si el localizador nuevo aparece en una columna que lee un cliente, la
-- escritura se rechaza.
--
-- QUE SE BARRE. La clase sale del CATALOGO en cada llamada, no de una lista: toda columna de texto
-- (text, varchar, char, text[], json/jsonb) de `public` que `anon` o `authenticated` pueden leer
-- por grant. Una lista escrita a mano es el bug de 0023 (ADR-010): cubre las columnas en las que
-- su autor estaba pensando. Con el catalogo, una tabla nueva entra sola el dia que le dan SELECT.
-- Los localizadores mismos quedan afuera por grant (regla 4 de CLAUDE.md) y, ademas, por nombre.
-- Se usa el grant y no RLS a proposito: RLS filtra filas segun quien pregunta, y aca no hay quien.
--
-- EXENCION: `courses.promo_video_id`, la misma y por la misma razon que en
-- `locator-exact-invariant.test.mjs` (un adelanto PUEDE ser un video que tambien es leccion).
--
-- POR QUE AFTER Y NO BEFORE. En un BEFORE el barrido ve la fila VIEJA: un solo
-- `update lessons set title = 'X', video_id = 'X'` esquivaba los dos lados a la vez (el guard de
-- texto ve el video_id viejo, el barrido el titulo viejo). Un AFTER ROW ve el efecto de la
-- sentencia, incluida la fila propia.
--
-- SIN BYPASS DE service_role (ADR-011): invariante, no permiso. Es exactamente service_role el
-- que escribe estos localizadores.
--
-- RIESGO RESIDUAL (aceptado, documentado): dos transacciones concurrentes -- una escribe el texto,
-- otra el localizador -- no se ven entre si con READ COMMITTED. Las dos escrituras son de la misma
-- docente/servidor sobre su propio curso; cerrarlo exigiria serializar todo texto publico.

create or replace function public.locator_public_occurrence(p_locator text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aguja text := public.normalize_locator_text(p_locator);
  t     record;
  hit   boolean;
begin
  -- Mismo umbral que `body_has_known_locator`: por debajo de 8 caracteres normalizados un
  -- localizador matchea prosa comun, y ese lado ya lo ignora.
  if length(aguja) < 8 then
    return null;
  end if;

  for t in
    select c.relname as tabla,
           string_agg(
             case
               when a.atttypid in ('json'::regtype, 'jsonb'::regtype)
                 then format('position($1 in public.normalize_locator_text(x.%I::text)) > 0', a.attname)
               when format_type(a.atttypid, a.atttypmod) like '%[]'
                 then format('exists (select 1 from unnest(x.%I) e where position($1 in public.normalize_locator_text(e)) > 0)', a.attname)
               else format('position($1 in public.normalize_locator_text(x.%I::text)) > 0', a.attname)
             end,
             ' or ' order by a.attnum
           ) as predicado
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where c.relkind = 'r'
       and (format_type(a.atttypid, a.atttypmod) ~ 'text|char'
            or a.atttypid in ('json'::regtype, 'jsonb'::regtype))
       and (has_column_privilege('anon', c.oid, a.attnum, 'SELECT')
            or has_column_privilege('authenticated', c.oid, a.attnum, 'SELECT'))
       and c.relname || '.' || a.attname <> all (array[
             'courses.promo_video_id',
             -- Los localizadores mismos. Por grant ya quedan afuera (service_role only), pero si
             -- un grant de tabla vuelve por error el barrido se encontraria a si mismo y bloquearia
             -- toda escritura: esa regresion la detectan rls-mutation y b1, no este guard.
             'lessons.video_id', 'lesson_resources.drive_file_id', 'lesson_resources.url'])
     group by c.relname
     order by c.relname
  loop
    execute format('select exists (select 1 from public.%I x where %s)', t.tabla, t.predicado)
      into hit using aguja;
    if hit then
      return t.tabla;
    end if;
  end loop;
  return null;
end;
$$;

-- SECURITY DEFINER (el trigger, no solo la funcion de barrido): el barrido tiene que correr sea
-- quien sea el que escribe -- hoy service_role, mañana un grant que vuelva por error -- sin darle a
-- `authenticated` EXECUTE sobre `locator_public_occurrence`, que seria un oraculo sobre texto que
-- RLS le oculta (Q&A de otros cursos, notas ajenas).
create or replace function public.guard_locator_not_public()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fila_nueva jsonb := to_jsonb(new);
  fila_vieja jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  campo      text;
  valor      text;
  donde      text;
begin
  foreach campo in array tg_argv loop
    -- Mismo corte que `guard_locator_exacto`: un typo en la declaracion apagaria el guard en
    -- silencio.
    if not (fila_nueva ? campo) then
      raise exception 'guard_locator_not_public: la columna % no existe en %', campo, tg_table_name
        using errcode = '42704';
    end if;
    valor := fila_nueva ->> campo;
    if valor is null or (fila_vieja is not null and valor is not distinct from fila_vieja ->> campo) then
      continue;
    end if;
    donde := public.locator_public_occurrence(valor);
    if donde is not null then
      raise exception 'el localizador de %.% ya aparece en texto publico de %', tg_table_name, campo, donde
        using errcode = '42501';
    end if;
  end loop;
  return null;
end;
$$;

create trigger lessons_locator_not_public
  after insert or update of video_id on public.lessons
  for each row execute function public.guard_locator_not_public('video_id');

create trigger lesson_resources_locator_not_public
  after insert or update of drive_file_id, url on public.lesson_resources
  for each row execute function public.guard_locator_not_public('drive_file_id', 'url');

-- "Barrer texto existente": un invariante que nace violado no es un invariante. Si algun
-- localizador vigente ya esta en texto publico, la migracion falla y dice cual tabla.
do $$
declare
  r     record;
  donde text;
begin
  for r in
    select 'lessons.video_id' as origen, l.video_id as loc from public.lessons l where l.video_id is not null
    union all
    select 'lesson_resources.drive_file_id', x.drive_file_id from public.lesson_resources x where x.drive_file_id is not null
    union all
    select 'lesson_resources.url', x.url from public.lesson_resources x where x.url is not null
  loop
    donde := public.locator_public_occurrence(r.loc);
    if donde is not null then
      raise exception 'D-12: un % vigente ya aparece en texto publico de %', r.origen, donde
        using errcode = '42501';
    end if;
  end loop;
end;
$$;

-- `locator_public_occurrence` la llama solo el trigger (definer). Ningun cliente la ejecuta.
revoke execute on all functions in schema public from public;
revoke execute on function public.locator_public_occurrence(text) from anon, authenticated;
revoke execute on function public.guard_locator_not_public() from anon, authenticated;
