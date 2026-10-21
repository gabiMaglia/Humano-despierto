-- T-037 · Moderacion de resenas por el admin (ADR-012) y D-20.
--
-- Cuatro cosas, en este orden:
--   1 · guard de course_reviews: D-20, localizador solo al escribir, CHECK del trio de ocultar.
--   2 · course_review_reports: la guia duena (o el admin) reporta; nadie mas.
--   3 · moderate_*: el unico camino que escribe hidden_* y resolved_*, atomico, solo service_role.
--   4 · revoke execute final.
--
-- Checklist ADR-011 para el guard reescrito:
--   1 · Que operacion legitima podria bloquear: una alumna inscripta resenando (caso en
--       guard-reachability), service_role ocultando una resena cuyo texto paso a coincidir con un
--       video_id (course-reviews), borrar la cuenta del admin que oculto (guard-reachability).
--   2 · Bypass de service_role: D-20 NO lo tiene a proposito (invariante del dato). El resto igual
--       que 0026.

-- ---------------------------------------------------------------- 1 · course_reviews

-- `hidden_by` es `on delete set null`: con el CHECK de 0024, borrar la cuenta del admin que oculto
-- violaba el trio y la cuenta quedaba imborrable (la clase de 0017). Lo que importa es que una
-- resena oculta tenga fecha y motivo; quien la oculto puede dejar de existir.
alter table public.course_reviews drop constraint course_reviews_hidden_consistency;
alter table public.course_reviews add constraint course_reviews_hidden_consistency check (
  (hidden_at is null) = (hidden_reason is null)
  and (hidden_by is null or hidden_at is not null)
);

create or replace function public.guard_course_reviews()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  es_servidor boolean := public.is_service_context();
  es_autora   boolean;
begin
  -- D-20 · La guia no resena su propio curso, ni inscripta en el ni por servidor. `courses_read`
  --     le muestra a la duena su curso aunque este en borrador, que es el unico caso en que esta
  --     consulta (security invoker) tiene que encontrar la fila.
  if tg_op = 'INSERT' and exists (
       select 1 from public.courses c where c.id = new.course_id and c.teacher_id = new.user_id
     ) then
    raise exception 'la guia no resena su propio curso' using errcode = '42501';
  end if;

  -- 1 · ADR-009 mitad 2, solo cuando el texto se ESCRIBE. Un UPDATE que no toca el texto no lo
  --     publica, y rechazarlo dejaba sin poder ocultar justo la resena que filtra un video_id
  --     que aparecio despues (orden de D-12).
  if (tg_op = 'INSERT' or new.body is distinct from old.body)
     and public.body_has_known_locator(coalesce(new.body, '')) then
    raise exception 'la resena contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' or new.response is distinct from old.response)
     and public.body_has_known_locator(coalesce(new.response, '')) then
    raise exception 'la respuesta contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    -- `is not distinct from` y no `=`: con auth.uid() nulo `=` da null, y el null caia en la
    -- rama de la autora (el bug de la hostile f).
    es_autora := not es_servidor and new.user_id is not distinct from (select auth.uid());

    if not es_servidor then
      if not es_autora then
        -- La guia (o cualquiera que no sea la autora) no reescribe lo que dijo la alumna.
        if new.rating is distinct from old.rating or new.body is distinct from old.body then
          raise exception 'solo la autora edita el rating y el texto de su resena'
            using errcode = '42501';
        end if;
        if new.response is distinct from old.response then
          -- Responder es de la guia DUEÑA. RLS ya filtra filas, pero `course_reviews_admin`
          -- tambien da UPDATE y el admin no firma como "la guia".
          if not public.owns_course(new.course_id) then
            raise exception 'solo la guia del curso responde sus resenas'
              using errcode = '42501';
          end if;
          -- La firma la pone el servidor. `responded_*` no estan en ningun grant de cliente,
          -- asi que lo que llegue aca es el valor viejo: se pisa.
          if new.response is null then
            new.responded_by := null;
            new.responded_at := null;
          else
            new.responded_by := (select auth.uid());
            new.responded_at := now();
          end if;
        end if;
      else
        -- La autora no toca la respuesta EN NINGUN SENTIDO, tampoco a null: borrar lo que le
        -- contestaron es tan editar la respuesta como escribirla.
        if new.response is distinct from old.response then
          raise exception 'la respuesta publica es de la guia del curso, no de la autora'
            using errcode = '42501';
        end if;
        -- 2 · Si la autora EDITA su resena, la respuesta se borra (criterio 6). Corre despues de
        --     la comprobacion de arriba, asi que no la dispara.
        if (new.body is distinct from old.body or new.rating is distinct from old.rating)
           and old.response is not null then
          new.response := null;
          new.responded_at := null;
          new.responded_by := null;
        end if;
      end if;
    end if;

    -- 3 · Ocultar es del admin via service_role (Q-11). Sin cambios respecto de 0024.
    if new.hidden_at is distinct from old.hidden_at
       and not es_servidor
       and not public.is_admin() then
      raise exception 'ocultar una resena es del admin, no de la guia del curso'
        using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- 2 · course_review_reports
-- Spec ADR-012 tal cual salvo el CHECK del trio (desvio 3 del plan de T-037): con el literal del
-- ADR, `resolved_by on delete set null` dejaba imborrable la cuenta del admin que resolvio.
create table public.course_review_reports (
  id           uuid        primary key default gen_random_uuid(),
  review_id    uuid        not null references public.course_reviews (id) on delete cascade,
  reporter_id  uuid        not null references public.profiles (id) on delete cascade,
  reason       text        not null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid        references public.profiles (id) on delete set null,
  resolution   text        check (resolution in ('oculta', 'desestimada')),

  -- Una persona reporta una resena una vez: reportar en bucle es la forma barata de presionar.
  constraint course_review_reports_unique unique (review_id, reporter_id),
  constraint course_review_reports_reason_not_blank check (length(btrim(reason)) > 0),
  constraint course_review_reports_reason_max check (char_length(reason) <= 1000),
  constraint course_review_reports_resolution_consistency check (
    (resolved_at is null) = (resolution is null)
    and (resolved_by is null or resolved_at is not null)
  )
);

create index course_review_reports_pending_idx
  on public.course_review_reports (created_at) where resolved_at is null;
create index course_review_reports_review_idx on public.course_review_reports (review_id);

-- Quien puede reportar ESTA resena. security definer porque tiene que ver la resena aunque la
-- policy de lectura no se la muestre al que pregunta, y lee `profiles.role` (R-2): una guia
-- degradada sigue figurando como teacher_id de sus cursos (D-16).
create or replace function public.can_report_review(p_review_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1
      from public.course_reviews r
      join public.courses c on c.id = r.course_id
      join public.profiles p on p.id = c.teacher_id
     where r.id = p_review_id
       and c.teacher_id = auth.uid()
       and p.role = 'teacher'
  );
$$;

alter table public.course_review_reports enable row level security;

create policy course_review_reports_insert on public.course_review_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and public.can_report_review(review_id));

-- Lee quien lo escribio y el admin. Ninguna alumna, ni sobre su propia resena (ADR-012 c.4).
create policy course_review_reports_read on public.course_review_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

-- Sin policy de UPDATE ni DELETE para clientes: resolver es de service_role y el borrado llega
-- por la cascada de la resena (las acciones referenciales no pasan por RLS).

-- Checklist ADR-011:
--   1 · Operacion legitima que podria bloquear: la guia reportando con prosa normal, y el
--       `on delete set null` de resolved_by al borrar la cuenta de quien resolvio (caso en
--       guard-reachability). Solo mira `reason` cuando cambia, asi ese UPDATE no lo dispara.
--   2 · Bypass de service_role: no hay; un localizador no entra al motivo por ningun camino.
create or replace function public.guard_course_review_reports()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or new.reason is distinct from old.reason)
     and public.body_has_known_locator(new.reason) then
    raise exception 'el motivo contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger course_review_reports_guard
  before insert or update on public.course_review_reports
  for each row execute function public.guard_course_review_reports();

-- R-1: whitelist. La tabla nace sin privilegios de cliente (0003), pero se revoca igual por si el
-- ambiente trae los default privileges de Supabase.
revoke all on public.course_review_reports from anon, authenticated;
grant select (id, review_id, reporter_id, reason, created_at, resolved_at, resolution)
  on public.course_review_reports to authenticated;
grant insert (review_id, reporter_id, reason) on public.course_review_reports to authenticated;
grant all on public.course_review_reports to service_role;

grant execute on function public.can_report_review(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- 3 · moderacion
-- El unico codigo que escribe hidden_* y resolved_* (ADR-012 c.6). Una funcion y no dos UPDATE
-- desde el Server Action porque ocultar y resolver los reportes tiene que ser una transaccion.
-- security invoker: corre como service_role (unico con execute), que ya bypassa RLS; el guard de
-- course_reviews lo reconoce como servidor. `p_admin_id` lo pone el Server Action desde la sesion
-- (`requireAdmin`); con service_role `auth.uid()` es nulo y no hay otra forma de saber quien fue.
-- Se re-verifica el rol contra profiles (R-2) por si un Server Action futuro se olvida.

create or replace function public.moderate_hide_review(p_review_id uuid, p_admin_id uuid, p_reason text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  v_reason    text := btrim(coalesce(p_reason, ''));
  v_resueltos integer;
begin
  if not exists (select 1 from public.profiles p where p.id = p_admin_id and p.role = 'admin') then
    raise exception 'quien modera no es admin' using errcode = '42501';
  end if;
  if char_length(v_reason) = 0 or char_length(v_reason) > 1000 then
    raise exception 'el motivo va de 1 a 1000 caracteres' using errcode = '22023';
  end if;
  if not exists (select 1 from public.course_reviews r where r.id = p_review_id) then
    raise exception 'la resena no existe' using errcode = 'P0002';
  end if;

  -- Ya oculta: se respeta el motivo original; ocultar de nuevo solo cierra reportes colgados.
  update public.course_reviews
     set hidden_at = now(), hidden_by = p_admin_id, hidden_reason = v_reason
   where id = p_review_id and hidden_at is null;

  update public.course_review_reports
     set resolved_at = now(), resolved_by = p_admin_id, resolution = 'oculta'
   where review_id = p_review_id and resolved_at is null;
  get diagnostics v_resueltos = row_count;
  return v_resueltos;
end;
$$;

create or replace function public.moderate_unhide_review(p_review_id uuid, p_admin_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = p_admin_id and p.role = 'admin') then
    raise exception 'quien modera no es admin' using errcode = '42501';
  end if;
  -- Los reportes resueltos no se reabren: fueron una decision tomada con lo que habia (SP-4 c.2).
  update public.course_reviews
     set hidden_at = null, hidden_by = null, hidden_reason = null
   where id = p_review_id and hidden_at is not null;
  return found;
end;
$$;

create or replace function public.moderate_dismiss_report(p_report_id uuid, p_admin_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = p_admin_id and p.role = 'admin') then
    raise exception 'quien modera no es admin' using errcode = '42501';
  end if;
  update public.course_review_reports
     set resolved_at = now(), resolved_by = p_admin_id, resolution = 'desestimada'
   where id = p_report_id and resolved_at is null;
  return found;
end;
$$;

-- ---------------------------------------------------------------- 4 · privilegios de funciones
revoke execute on function public.moderate_hide_review(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.moderate_unhide_review(uuid, uuid)     from public, anon, authenticated;
revoke execute on function public.moderate_dismiss_report(uuid, uuid)    from public, anon, authenticated;
grant  execute on function public.moderate_hide_review(uuid, uuid, text) to service_role;
grant  execute on function public.moderate_unhide_review(uuid, uuid)     to service_role;
grant  execute on function public.moderate_dismiss_report(uuid, uuid)    to service_role;

revoke execute on all functions in schema public from public;
