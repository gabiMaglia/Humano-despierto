-- T-080 · D-18 · Una respuesta escrita por service_role queda firmada por la guia del curso.
--
-- QUE ESTABA ROTO (plan T-028 r2, aceptado entonces porque ningun Server Action respondia). La
-- firma `responded_by`/`responded_at` la ponia SOLO la rama de cliente del guard (0026), con
-- `auth.uid()`. En la rama de servidor `auth.uid()` es nulo y no se tocaba nada: una respuesta
-- cargada por service_role sin `responded_by` explicito quedaba publicada sin autora, y con uno
-- explicito podia firmarla cualquiera. El dia que un Server Action responda (o una carga de
-- datos), la ficha muestra "respondio la guia" sin guia.
--
-- Funcion copiada de 0032 sin cambios fuera del bloque marcado D-18.
--
-- Y EL CHECK DEL TRIO (la clase de 0017, encontrada al escribir el caso ADR-011). 0024 exigia
-- `(response is null) = (responded_by is null)` con `responded_by ... on delete set null`: borrar
-- la cuenta de una guia que firmo una respuesta (ya no duena: el curso se reasigno) violaba el CHECK
-- y la baja quedaba bloqueada. Se relaja igual que `hidden_by` en 0032: la firmante puede dejar de
-- existir; la fecha y el texto quedan.
alter table public.course_reviews drop constraint course_reviews_response_consistency;
alter table public.course_reviews add constraint course_reviews_response_consistency check (
  (response is null) = (responded_at is null)
  and (responded_by is null or response is not null)
);
--
-- Checklist ADR-011: service_role sigue pudiendo responder (con o sin firma explicita, con fecha
-- propia) y borrar la cuenta de la guia sigue dejando la firma en null (guard-reachability y
-- course-reviews.test.mjs).

create or replace function public.guard_course_reviews()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  es_servidor boolean := public.is_service_context();
  es_autora   boolean;
  v_guia      uuid;
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

  -- D-18 (T-080) · Cuando escribe el SERVIDOR, la firma tambien queda. Antes la rama de servidor
  --     no tocaba `responded_*`: con `auth.uid()` nulo, una respuesta cargada por service_role
  --     quedaba sin `responded_by` si quien la escribia no lo mandaba. La respuesta publica es
  --     "de la guia del curso": se firma con la duena del curso, y una firma explicita que no sea
  --     ella se rechaza. `responded_at` explicito se respeta (carga de datos con fecha real).
  --     Solo cuando cambia `response` o se ESCRIBE una firma: el `on delete set null` de la cuenta
  --     que firmo deja `responded_by` en null sin tocar `response`, y no se re-firma con otra.
  if es_servidor
     and (tg_op = 'INSERT'
          or new.response is distinct from old.response
          or (new.responded_by is not null and new.responded_by is distinct from old.responded_by)) then
    if new.response is null then
      new.responded_by := null;
      new.responded_at := null;
    else
      select c.teacher_id into v_guia from public.courses c where c.id = new.course_id;
      if new.responded_by is not null and new.responded_by is distinct from v_guia then
        raise exception 'la respuesta se firma con la guia del curso' using errcode = '42501';
      end if;
      new.responded_by := v_guia;
      if tg_op = 'INSERT' or new.response is distinct from old.response then
        new.responded_at := coalesce(
          case when tg_op = 'UPDATE' and new.responded_at is not distinct from old.responded_at then null
               else new.responded_at end,
          now());
      end if;
    end if;
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
