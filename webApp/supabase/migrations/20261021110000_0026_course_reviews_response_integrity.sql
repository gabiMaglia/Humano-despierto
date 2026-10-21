-- T-028 ronda 2 · La autoria de la respuesta de la guia la fija el SERVIDOR, y la autora no la toca.
--
-- QUE ESTABA ROTO (QA r1). 0024 daba UPDATE sobre `responded_by`/`responded_at` a `authenticated`:
-- la guia podia firmar con el id de otra persona y antedatar su respuesta. Y la autora, que
-- comparte rol con la guia, podia poner `response` en null en su propia fila -- el guard solo
-- rechazaba un `response` NO nulo -- y borrar asi lo que la guia le contesto.
--
-- POR QUE TODO VA EN EL GUARD EXISTENTE y no en un trigger nuevo: dos BEFORE triggers sobre la
-- misma tabla corren en orden alfabetico de nombre, y que la firma dependa de como alguien
-- bautizo un trigger es fragil. Un solo guard, un solo orden.
--
-- Checklist ADR-011:
--   1 · Que operacion legitima podria bloquear: la guia dueña respondiendo (probado en
--       guard-reachability), la autora editando (limpia la respuesta, probado en
--       course-reviews), service_role ocultando y escribiendo una respuesta firmada.
--   2 · Bypass de service_role: conservado y AMPLIADO. Antes, con `auth.uid()` nulo, service_role
--       caia en la rama "autora" y no podia escribir `response` (hostile f de QA r1).

-- R-1: whitelist. Se revoca UPDATE de tabla entero y se vuelve a dar por columna; `responded_*`
-- quedan fuera de todo grant de cliente. Revocar solo esas dos columnas no alcanza: con un grant
-- de tabla vigente un revoke por columna es un no-op.
revoke update on public.course_reviews from authenticated;
grant update (rating, body, response) on public.course_reviews to authenticated;

create or replace function public.guard_course_reviews()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  es_servidor boolean := public.is_service_context();
  es_autora   boolean;
begin
  -- 1 · ADR-009 mitad 2: coincidencia EXACTA. Sin bypass: tampoco el servidor publica un
  --     localizador en un texto que lee `anon`.
  if public.body_has_known_locator(coalesce(new.body, '')) then
    raise exception 'la resena contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;
  if public.body_has_known_locator(coalesce(new.response, '')) then
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
