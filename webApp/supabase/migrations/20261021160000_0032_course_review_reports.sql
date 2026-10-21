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

revoke execute on all functions in schema public from public;
