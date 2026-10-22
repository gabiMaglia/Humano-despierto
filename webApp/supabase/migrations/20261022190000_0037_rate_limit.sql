-- T-050 · Rate limiting de las Server Actions (SP-6, auditoría S-02).
--
-- Por qué Postgres y no memoria: es el único estado compartido que existe seguro en todo
-- despliegue (D4 no va a Vercel, pero un límite que se resetea al reiniciar el proceso o se
-- multiplica por instancia no es un límite). La memoria queda para Vitest.
--
-- Ventana FIJA alineada al epoch (no deslizante): una fila por (clave, ventana), más simple de
-- razonar y de barrer. Deja pasar hasta 2x en el borde entre dos ventanas; se compensa con
-- límites bajos (tabla en webApp/src/lib/rate-limit/limits.ts).
--
-- Cierre igual que `mail_log` (0019): RLS activa SIN policies y `revoke all` para los roles
-- cliente. Ningún cliente ve esta tabla ni ejecuta la función; la llama el servidor con
-- service_role. `0003_privileges.sql` no se toca (R-1).
--
-- Limpieza sin pg_cron: cada llamada borra las ventanas vencidas de SU clave y hasta 50 vencidas
-- de otras claves (las que nunca vuelven: una IP, un destinatario). Con una llamada por escritura
-- la tabla queda acotada por el tráfico de las últimas ventanas.

create table public.rate_limit_buckets (
  key          text        not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  expires_at   timestamptz not null,
  hits         integer     not null default 0 check (hits >= 0),
  primary key (key, window_start)
);

create index rate_limit_buckets_expires_at_idx on public.rate_limit_buckets (expires_at);

alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from public, anon, authenticated;
-- 0007 ya da todo a service_role por default privileges; explícito para que se lea acá.
grant select, insert, update, delete on public.rate_limit_buckets to service_role;

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start   timestamptz;
  v_expires timestamptz;
  v_hits    integer;
begin
  if p_key is null or char_length(p_key) not between 1 and 200 then
    raise exception 'check_rate_limit: clave vacía o de más de 200 caracteres' using errcode = '22023';
  end if;
  if p_max is null or p_max < 1 or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'check_rate_limit: max >= 1 y ventana entre 1 y 86400 segundos' using errcode = '22023';
  end if;

  v_start   := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_expires := v_start + make_interval(secs => p_window_seconds);

  -- UNA sentencia: dos llamadas simultáneas sobre la misma clave se serializan en el lock de la
  -- fila del ON CONFLICT y cada una ve el conteo de la otra (sin update perdido; b1 rl5 lo mide).
  insert into public.rate_limit_buckets as b (key, window_start, expires_at, hits)
  values (p_key, v_start, v_expires, 1)
  on conflict (key, window_start) do update set hits = b.hits + 1
  returning b.hits into v_hits;

  delete from public.rate_limit_buckets
   where key = p_key and expires_at <= now();

  delete from public.rate_limit_buckets
   where (key, window_start) in (
     select o.key, o.window_start
       from public.rate_limit_buckets o
      where o.expires_at <= now()
      order by o.expires_at
      limit 50
      for update skip locked);

  allowed   := v_hits <= p_max;
  remaining := greatest(p_max - v_hits, 0);
  retry_after_seconds := case
    when v_hits <= p_max then 0
    else greatest(ceil(extract(epoch from (v_expires - now())))::integer, 1)
  end;
  return next;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
