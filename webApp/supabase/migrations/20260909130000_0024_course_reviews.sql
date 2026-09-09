-- T-028 · Resenas y rating de curso.
--
-- POR QUE ES EL FALTANTE MAS GRANDE FRENTE A UDEMY. Sin rating no hay prueba social, no hay
-- orden por "mejor valorado" en el catalogo, y la ficha le pide a alguien que confie sin darle
-- ninguna razon externa para hacerlo.
--
-- QUIEN PUEDE RESENAR: inscripcion ACTIVA en ese curso, y lo hace cumplir RLS, no el formulario.
-- No se exige progreso minimo: `completed` es derivada (ADR-007) y usarla como puerta acopla dos
-- subsistemas sin necesidad. Ademas una alumna que abandono en la tercera leccion tiene una
-- opinion legitima, y particularmente informativa.
--
-- MODERACION (Q-11, resuelta investigando como lo hace Udemy): la guia dueña NO puede ocultar ni
-- borrar una resena sobre su propio curso. Solo el admin. La guia puede RESPONDERLA en publico,
-- una vez. Un rastro auditable de borrados solo sirve si alguien lo audita, y nadie audita a la
-- dueña del curso en una escuela chica -- quitarle la capacidad no depende de que haya auditor.

create table public.course_reviews (
  id             uuid        primary key default gen_random_uuid(),
  course_id      uuid        not null references public.courses (id) on delete cascade,
  user_id        uuid        not null references public.profiles (id) on delete cascade,
  rating         smallint    not null check (rating between 1 and 5),
  -- Nullable a proposito: se puede puntuar SIN escribir. Udemy lo permite y baja mucho la
  -- friccion -- la estrella es el dato que mas se usa y el texto es el que mas cuesta.
  body           text,
  -- Respuesta publica de la guia. `responded_at` la acompaña o no hay forma de ordenar ni de
  -- saber si es vieja.
  response       text,
  responded_at   timestamptz,
  responded_by   uuid        references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Ocultar es del ADMIN unicamente (ver cabecera). R-5: o los tres nulos o los tres completos.
  hidden_at      timestamptz,
  hidden_by      uuid        references public.profiles (id) on delete set null,
  hidden_reason  text,

  constraint course_reviews_user_course_key unique (user_id, course_id),
  constraint course_reviews_body_not_blank
    check (body is null or length(btrim(body)) > 0),
  constraint course_reviews_body_max_length check (char_length(body) <= 4000),
  constraint course_reviews_response_not_blank
    check (response is null or length(btrim(response)) > 0),
  constraint course_reviews_response_max_length check (char_length(response) <= 2000),
  constraint course_reviews_response_consistency check (
    (response is null) = (responded_at is null)
    and (response is null) = (responded_by is null)
  ),
  constraint course_reviews_hidden_reason_not_blank
    check (hidden_reason is null or length(btrim(hidden_reason)) > 0),
  constraint course_reviews_hidden_consistency check (
    (hidden_at is null) = (hidden_by is null)
    and (hidden_at is null) = (hidden_reason is null)
  ),
  -- ADR-009 mitad 1 (forma). La mitad 2 (coincidencia exacta) va en el guard de abajo: no puede
  -- ir en un CHECK porque consulta otras tablas.
  constraint course_reviews_body_no_locator
    check (not public.text_has_locator(body)),
  constraint course_reviews_response_no_locator
    check (not public.text_has_locator(response))
);

create index course_reviews_course_idx on public.course_reviews (course_id) where hidden_at is null;

-- ---------------------------------------------------------------- RLS
alter table public.course_reviews enable row level security;

-- Lectura: publica. Una resena oculta no la ve NADIE salvo service_role, ni siquiera su autora
-- -- si la viera, sabria que fue moderada y por que, y el motivo es interno.
create policy course_reviews_read on public.course_reviews
  for select to anon, authenticated
  using (
    hidden_at is null
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published'
    )
  );

-- Escritura: SOLO con inscripcion activa. Es el criterio 1 y lo hace cumplir RLS.
create policy course_reviews_insert_own on public.course_reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_course_access(course_id));

create policy course_reviews_update_own on public.course_reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- La guia dueña necesita UPDATE para responder. El grant de columnas (abajo) es lo que impide
-- que toque `rating` o `body`: RLS decide QUE FILAS, los grants deciden QUE COLUMNAS.
create policy course_reviews_respond_owner on public.course_reviews
  for update to authenticated
  using (public.owns_course(course_id))
  with check (public.owns_course(course_id));

create policy course_reviews_admin on public.course_reviews
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- guard
-- Tres invariantes que ni RLS ni los grants pueden expresar.
create or replace function public.guard_course_reviews()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- 1 · ADR-009 mitad 2: coincidencia EXACTA. Una resena es texto publico sin sesion, y un
  --     video_id son 11 caracteres que el CHECK de forma deja pasar por construccion.
  if public.body_has_known_locator(coalesce(new.body, '')) then
    raise exception 'la resena contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;
  if public.body_has_known_locator(coalesce(new.response, '')) then
    raise exception 'la respuesta contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    -- 0 · QUIEN PUEDE TOCAR QUE. Este bloque existe porque el test lo encontro: la primera
    --     version confiaba en que los grants por columna alcanzaban, y NO alcanzan. Los grants
    --     separan columnas por ROL, y aca la autora y la guia son el MISMO rol (`authenticated`)
    --     sobre la MISMA fila. RLS tampoco sirve: separa filas, no columnas. La unica capa que
    --     puede distinguir "quien sos respecto de ESTA fila" es el guard.
    --     Sin esto, la guia dueña se subia su propia nota de 1 a 5.
    if new.user_id <> (select auth.uid()) then
      if new.rating is distinct from old.rating or new.body is distinct from old.body then
        raise exception 'solo la autora edita el rating y el texto de su resena'
          using errcode = '42501';
      end if;
    else
      -- La autora no se escribe su propia respuesta de guia. La excepcion es el borrado
      -- automatico del invariante 2, que corre DESPUES y pone los tres en null.
      if new.response is distinct from old.response and new.response is not null then
        raise exception 'la respuesta publica es de la guia del curso, no de la autora'
          using errcode = '42501';
      end if;
    end if;

    -- 2 · Si la alumna EDITA su resena, la respuesta de la guia se borra. Udemy lo hace asi y
    --     tiene razon: una respuesta colgando de un texto que ya cambio descontextualiza a las
    --     dos partes. Solo aplica cuando quien edita es la autora -- si no, responder seria
    --     borrar la propia respuesta al escribirla.
    if new.user_id = (select auth.uid())
       and (new.body is distinct from old.body or new.rating is distinct from old.rating)
       and old.response is not null
       and new.response is not distinct from old.response then
      new.response := null;
      new.responded_at := null;
      new.responded_by := null;
    end if;

    -- 3 · La guia dueña NO oculta resenas de su propio curso (Q-11). El grant de columna ya se
    --     lo impide, pero esto lo cierra tambien para service_role mal usado desde un action.
    if new.hidden_at is distinct from old.hidden_at
       and not public.is_admin() then
      raise exception 'ocultar una resena es del admin, no de la guia del curso'
        using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger course_reviews_guard
  before insert or update on public.course_reviews
  for each row execute function public.guard_course_reviews();

-- ---------------------------------------------------------------- privilegios (R-1)
-- La alumna escribe rating y body. NO escribe `response` (es de la guia) ni `hidden_*` (del
-- admin) ni `user_id` en un UPDATE.
grant select (id, course_id, user_id, rating, body, response, responded_at, created_at, updated_at)
  on public.course_reviews to anon, authenticated;
grant insert (course_id, user_id, rating, body) on public.course_reviews to authenticated;
-- `response`/`responded_at`/`responded_by` en el mismo grant que rating/body: no hay forma de
-- separarlos por columna entre dos roles distintos. Lo que separa es RLS -- la politica de la
-- autora y la de la guia son filas distintas -- MAS el guard 3 para `hidden_*`, que no esta en
-- ningun grant de cliente y por lo tanto solo lo escribe service_role.
grant update (rating, body, response, responded_at, responded_by) on public.course_reviews to authenticated;
grant delete on public.course_reviews to authenticated;  -- acotado por RLS a la resena propia

create policy course_reviews_delete_own on public.course_reviews
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke execute on all functions in schema public from public;
