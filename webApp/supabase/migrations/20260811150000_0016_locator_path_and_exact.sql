-- D-09/T-021 · El predicado de localizadores era débil y goloso a la vez
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- La migración 0014 extendió `text_has_locator` a los mensajes del Campus y su cabecera declaró
-- que con eso cerraba la fuga de material pago. Un verificador independiente demostró que no:
-- el payload que la propia cabecera narra seguía pasando. Tres bypasses y dos falsos positivos,
-- todos reproducidos contra esta base:
--
--   PASABAN (deberían bloquearse):
--     'el video dQw4w9WgXcQ, peguenlo en youtube'                         -> f
--     'posta: YOUTU.BE/OTHERCOURSEVID'                                    -> f
--     '1BxiMVs0XRA5nFMdK-vBdBZjgmUUqptlb-s74OgvE2upms'  (drive_file_id)   -> f
--   SE BLOQUEABAN (prosa legítima en castellano):
--     'Gracias por la devolucion.me sirvio muchisimo'                     -> t
--     'quede encantada.me cambio la forma de leer las cartas'             -> t
--
-- Son la misma falla vista de los dos lados: el predicado buscaba la FORMA de un localizador en
-- vez del localizador. Un id de YouTube son 11 caracteres sin puntos ni barras — no tiene forma
-- de nada. Y `.me` es una palabra del castellano además de un TLD.
--
-- Se arregla por los dos lados, y son arreglos independientes:
--
-- (1) LA HEURISTICA DE FORMA EXIGE UNA RUTA. `dominio.tld` pasa a requerir la barra: un enlace
--     para compartir siempre tiene ruta (`youtu.be/xxx`, `drive.google.com/file/d/xxx`), y una
--     frase en castellano nunca la tiene. Eso solo elimina los dos falsos positivos.
--     Y habilita algo que antes no se podía: la alternancia de TLD ahora es CASE-INSENSITIVE.
--     Estaba en minúscula a propósito, porque `.Me` capitalizado es prosa que arranca oración
--     (ver 0010) — pero con la barra exigida ya no hay prosa que colisione, así que `YOUTU.BE/`
--     deja de ser un bypass. La restricción que hacía falta relajar y la que hacía falta
--     endurecer eran la misma, en direcciones opuestas.
--
-- (2) COINCIDENCIA EXACTA CONTRA LOS LOCALIZADORES REALES. Ninguna heurística de forma puede
--     atrapar `dQw4w9WgXcQ`. Lo que sí se puede es preguntar si el texto contiene un
--     `video_id`/`drive_file_id`/`url` que EXISTA en esta base. Es exacto: cero falsos positivos
--     (11 caracteres alfanuméricos con mayúsculas y minúsculas no aparecen por azar en prosa) y
--     cero falsos negativos para nuestro propio material, que es lo único que ADR-003 protege.
--
-- LO QUE ESTE ARCHIVO NO HACE, dicho explícitamente porque la cabecera de 0014 se equivocó
-- justamente en esto: no impide compartir un enlace a material pago que NO esté en esta base
-- (el curso de otra escuela, un PDF que alguien subió a su propio Drive). Eso no es la fuga que
-- ADR-003 describe y no se puede resolver con un CHECK. Lo que cierra es la fuga concreta: que
-- el material de un curso de ESTA plataforma llegue a quien no lo pagó.

-- ================================================================ (1) la heuristica, con ruta

-- Espejo EXACTO de `src/lib/validation/locator.mjs`. Si tocás una, tocá la otra: la paridad la
-- verifica `tests/locator-parity.test.mjs` corriendo las dos sobre el mismo corpus, y el
-- meta-test exige que esa verificación sea capaz de fallar.
create or replace function public.text_has_locator(v text)
returns boolean language sql immutable set search_path = '' as $$
  select v ~* '://'
      or v ~* '(^|[^a-zA-Z0-9])www\.'
      -- La barra final es la que separa un enlace de una frase. Con ella exigida, la
      -- alternancia puede ser insensible a mayusculas sin comerse prosa castellana.
      or v ~* '[a-zA-Z0-9]\.(com|net|org|io|co|app|dev|edu|gov|info|me|be|ly|gl|nz|cloud|link|site|online|page|xyz|tv)/'
      -- Corridas largas con las tres clases: atrapa ids opacos SIN separadores. Un id de Drive
      -- CON guiones no cae aca -- ver la nota de correccion sobre ADR-009 mas abajo -- y por eso
      -- existe la coincidencia exacta de la seccion (2).
      or exists (select 1 from regexp_matches(v, '[A-Za-z0-9_]{25,}', 'g') as t(m)
           where t.m[1] ~ '[0-9]' and t.m[1] ~ '[a-z]' and t.m[1] ~ '[A-Z]');
$$;

-- CORRECCION A UNA AFIRMACION DE ADR-009 Y DE 0008:52.
-- Aquella nota decia: "Un id de Drive con guiones se parte y el trozo largo igual matchea
-- (medido con ids reales de 28 y 44)". Es falso como generalizacion, y lo midio el verificador:
-- '1BxiMVs0XRA5nFMdK-vBdBZjgmUUqptlb-s74OgvE2upms' tiene 46 caracteres y sus trozos son 17/16/12
-- -- ninguno llega al umbral de 25. Los dos ids que se midieron en su momento no tenian guiones,
-- asi que la medicion era correcta y la conclusion no. Queda cubierto por la seccion (2).

-- ================================================================ (2) coincidencia exacta

-- SECURITY DEFINER porque lee columnas que son `service_role` unicamente (ADR-003 regla A):
-- `lessons.video_id`, `lesson_resources.drive_file_id`, `lesson_resources.url`. Devuelve un
-- booleano y nada mas -- nunca el localizador ni de que curso es.
--
-- ORACULO, declarado: quien pueda ejecutarla puede preguntar "¿este string exacto es material de
-- la plataforma?" y recibir si/no. Para explotarlo hay que TENER ya el localizador, que es
-- justamente lo que se esta tratando de que no circule, y la respuesta no dice de que curso es
-- ni da ninguna via para obtener uno. El espacio de un id de YouTube (64^11) hace que adivinarlo
-- no sea una estrategia. Se acepta a ojos abiertos: sin EXECUTE para `authenticated` el guard
-- -- que es SECURITY INVOKER a proposito, para que `is_service_context()` vea el `current_user`
-- real -- no podria llamarla.
create or replace function public.body_has_known_locator(v text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    where l.video_id is not null and length(l.video_id) >= 8
      and position(l.video_id in v) > 0
  ) or exists (
    select 1 from public.lesson_resources r
    where (r.drive_file_id is not null and length(r.drive_file_id) >= 8
           and position(r.drive_file_id in v) > 0)
       or (r.url is not null and length(r.url) >= 8
           and position(r.url in v) > 0)
  );
$$;

-- ================================================================ el guard del Campus

-- Se agrega la coincidencia exacta al guard, no al CHECK: un CHECK no puede llevar subconsulta,
-- y ademas esto depende de filas de otras tablas, o sea que no es un invariante de la fila.
-- Se evalua en INSERT y en toda edicion del cuerpo -- editar despues seria el bypass obvio.
create or replace function public.guard_campus_posts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'campus_posts: borrar es soft delete (UPDATE de deleted_at/deleted_by/deleted_reason), nunca DELETE'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.author_id is distinct from auth.uid() then
      raise exception 'campus_posts: author_id tiene que ser quien escribe' using errcode = '42501';
    end if;
    if public.body_has_known_locator(new.body) then
      raise exception 'campus_posts: el mensaje contiene material pago de la plataforma' using errcode = '42501';
    end if;
    return new;
  end if;

  -- tg_op = 'UPDATE' de aca en mas.
  if new.id is distinct from old.id
     or new.course_id is distinct from old.course_id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'campus_posts: la identidad del mensaje no se reescribe' using errcode = '42501';
  end if;

  if old.deleted_at is not null then
    -- Un mensaje borrado queda congelado. La condicion pregunta QUIEN muta, igual que la rama de
    -- edicion de abajo: preguntar cuanto muta dejaba pasar el UPDATE no-op de un tercero.
    if old.author_id is distinct from auth.uid()
       and not public.is_campus_moderator(old.course_id) then
      raise exception 'campus_posts: un mensaje borrado no se vuelve a tocar' using errcode = '42501';
    end if;
    if new.body is distinct from old.body
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by
       or new.deleted_reason is distinct from old.deleted_reason then
      raise exception 'campus_posts: un mensaje borrado no se vuelve a tocar' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if new.body is distinct from old.body then
      raise exception 'campus_posts: moderar no es editar el cuerpo del mensaje' using errcode = '42501';
    end if;
    if not public.is_campus_moderator(old.course_id) then
      raise exception 'campus_posts: borrar es privilegio de quien modera este hilo' using errcode = '42501';
    end if;
    if new.deleted_by is distinct from auth.uid() then
      raise exception 'campus_posts: el borrado queda firmado por quien lo hizo' using errcode = '42501';
    end if;
    if new.deleted_reason is null or length(btrim(new.deleted_reason)) = 0 then
      raise exception 'campus_posts: borrar exige un motivo' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.author_id is distinct from auth.uid() then
    raise exception 'campus_posts: solo quien lo escribio edita su mensaje' using errcode = '42501';
  end if;

  if new.body is distinct from old.body and public.body_has_known_locator(new.body) then
    raise exception 'campus_posts: el mensaje contiene material pago de la plataforma' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ================================================================ privilegios de ejecucion
revoke execute on all functions in schema public from public;
grant execute on function public.body_has_known_locator(text) to authenticated, service_role;
grant execute on function public.text_has_locator(text)       to authenticated, service_role;
