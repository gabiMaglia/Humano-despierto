-- Tarot · tiradas guardadas por usuarias logueadas. Las anónimas viven en la URL y no tocan la base.
--
-- POR QUE UN GUARD: RLS decide filas y los grants columnas, pero ninguno puede decir "una cruz celta
-- tiene 10 cartas distintas de 0..77". Sin eso, una fila imposible rompe la página que la renderiza.

create table public.tarot_readings (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  spread_id        text        not null
    check (spread_id in ('carta-del-dia', 'si-o-no', 'pasado-presente-futuro', 'cruz-celta')),
  question         text
    check (question is null or (char_length(question) between 1 and 140 and question !~ '[\n\r]')),
  cards            jsonb       not null,
  reversed_enabled boolean     not null,
  created_at       timestamptz not null default now(),
  constraint tarot_readings_question_no_locator check (not public.text_has_locator(question))
);

create index tarot_readings_user_idx on public.tarot_readings (user_id, created_at desc);

alter table public.tarot_readings enable row level security;

-- Whitelist por columna (ADR-008). user_id NO está en el INSERT: lo fija el guard.
revoke all on public.tarot_readings from public, anon, authenticated;
grant select (id, user_id, spread_id, question, cards, reversed_enabled, created_at) on public.tarot_readings to authenticated;
grant insert (spread_id, question, cards, reversed_enabled) on public.tarot_readings to authenticated;
grant delete on public.tarot_readings to authenticated;

create policy tarot_readings_read_own on public.tarot_readings
  for select to authenticated using (user_id = (select auth.uid()));

create policy tarot_readings_insert_own on public.tarot_readings
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy tarot_readings_delete_own on public.tarot_readings
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.guard_tarot_readings()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  expected int[];
  n int;
  elem jsonb;
  idx int;
  seen int[] := '{}';
begin
  if public.body_has_known_locator(coalesce(new.question, '')) then
    raise exception 'la pregunta contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;

  new.user_id := (select auth.uid());
  if new.user_id is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;

  expected := case new.spread_id
    when 'carta-del-dia' then array[1]
    when 'si-o-no' then array[1, 3]
    when 'pasado-presente-futuro' then array[3]
    when 'cruz-celta' then array[10]
    else null
  end;
  if expected is null then
    raise exception 'tirada desconocida' using errcode = '23514';
  end if;

  if jsonb_typeof(new.cards) <> 'array' then
    raise exception 'cards debe ser un array' using errcode = '23514';
  end if;
  n := jsonb_array_length(new.cards);
  if not (n = any (expected)) then
    raise exception 'cantidad de cartas inválida para %', new.spread_id using errcode = '23514';
  end if;

  for elem in select * from jsonb_array_elements(new.cards) loop
    if jsonb_typeof(elem) <> 'object' then
      raise exception 'carta mal formada' using errcode = '23514';
    end if;
    if coalesce(jsonb_typeof(elem -> 'i'), '') <> 'number' or coalesce(jsonb_typeof(elem -> 'r'), '') <> 'boolean' then
      raise exception 'carta mal formada' using errcode = '23514';
    end if;
    if (elem ->> 'i') !~ '^[0-9]{1,2}$' then
      raise exception 'índice de carta inválido' using errcode = '23514';
    end if;
    idx := (elem ->> 'i')::int;
    if idx > 77 then
      raise exception 'índice de carta fuera de rango' using errcode = '23514';
    end if;
    if idx = any (seen) then
      raise exception 'carta repetida' using errcode = '23514';
    end if;
    seen := seen || idx;
    if (elem ->> 'r')::boolean and (not new.reversed_enabled or new.spread_id = 'carta-del-dia') then
      raise exception 'invertida no admitida' using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

create trigger tarot_readings_guard
  before insert on public.tarot_readings
  for each row execute function public.guard_tarot_readings();

revoke execute on all functions in schema public from public;
