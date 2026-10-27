-- D-51 · un tope de envío (rate_limited) no es un intento fallido: el mail ni salió del proceso.
-- Sin esto un anuncio a >200 inscriptas/hora dejaba al resto con attempts=1 y, topes repetidos,
-- los 3 intentos se gastaban sin haber tocado el transporte. Devuelve el intento y deja el turno
-- reclamable ya, para que la tanda diferida (/api/mail/retry) lo retome.
--
-- Mismo fencing que confirmMailSent: solo toca la fila si `claimed_at` sigue siendo el del reclamo.
create function public.release_rate_limited_mail_slot(p_id uuid, p_claimed_at timestamptz)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.mail_log
     set attempts = greatest(attempts - 1, 0),
         claimed_at = now() - interval '1 day'
   where id = p_id
     and claimed_at = p_claimed_at
     and sent_at is null;
$$;

revoke execute on function public.release_rate_limited_mail_slot(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.release_rate_limited_mail_slot(uuid, timestamptz) to service_role;
