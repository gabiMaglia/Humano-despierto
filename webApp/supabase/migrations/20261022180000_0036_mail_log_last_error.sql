-- T-054 · ADR-014, enmienda E2 · mail_log.last_error
--
-- Con Resend, un 4xx que no sea 429 ni `409 concurrent_idempotent_requests` es permanente:
-- `notify.ts` retira el turno (`attempts = 3`, fencing de `claimed_at`) para no gastar
-- reintentos. Esta columna guarda POR QUÉ se retiró, para que la recuperación distinga:
--
--   · 401/403 por mala config (clave rotada, dominio sin verificar): el mail NO salió.
--     Recuperación, una vez corregida la config:
--       delete from public.mail_log
--       where sent_at is null and last_error ~ '^permanent:(401|403)/';
--   · 409 `invalid_idempotent_request`: la misma clave ya se usó con otro payload, o sea que
--     ALGO salió. La consulta de arriba lo excluye a propósito: borrarlo reenvía.
--
-- Whitelist de formato, no texto libre: el `message` del proveedor puede traer la dirección del
-- destinatario y no tiene por qué quedar en la base. Un valor que no cumple hace fallar el
-- UPDATE de retiro, y el turno queda como un reintentable más (degrada, no rompe).
--
-- Privilegios: 0019 revocó todo a anon/authenticated sobre la tabla; una columna nueva no
-- abre nada. Sigue siendo exclusiva de `service_role`.

alter table public.mail_log add column last_error text;

alter table public.mail_log add constraint mail_log_last_error_format
  check (last_error is null or last_error ~ '^permanent:[0-9]{3}/[a-z0-9_]{1,64}$');

comment on column public.mail_log.last_error is
  'Causa del retiro por falla permanente del proveedor: permanent:<status>/<name>. Solo service_role. ADR-014 (E2).';
