-- T-006 · Privilegios de service_role sobre el contenido (ADR-001, ADR-003 regla A)
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- 0003_privileges.sql revoca de anon/authenticated y da por sentado que `service_role` ya tiene
-- acceso total via el baseline estandar de Supabase
-- (`alter default privileges ... grant all on tables to postgres, anon, authenticated,
-- service_role`, ver supabase/harness/00_supabase_baseline.sql). Ese baseline lo aplica el stack
-- completo de `supabase start` (Docker). Esta instancia local corre con `auto_expose_new_tables`
-- sin fijar en config.toml —
-- que en las versiones nuevas de la CLI es el default de cloud ("false"): las tablas NUEVAS de
-- `public` no quedan expuestas a NINGUN rol de Data API sin GRANT explicito, ni siquiera a
-- `service_role`.
--
-- Medido dos veces, por el agente de T-006 y por el Orquestador (2026-08-07): `select video_id from lessons` con el JWT de service_role via
-- PostgREST devuelve 42501 ("permission denied for table lessons"), y
-- `has_table_privilege('service_role','public.lessons','SELECT')` da false. Sin este grant NINGUN Server Action de service_role puede
-- funcionar — no solo el de T-006 (servir `video_id`, ADR-003 regla A), tambien los que van a
-- necesitar T-005 (publicar curso/leccion) y T-008 (inscripciones manuales).
--
-- `service_role` ya tiene BYPASSRLS (00_supabase_baseline.sql:17): este grant no agrega NINGUN
-- control de acceso nuevo, solo restituye el privilegio de tabla que ese bypass presupone. El
-- corte de seguridad real sigue siendo "que codigo del servidor decide usar este cliente y
-- cuando" (ADR-001: dos clientes, nunca mezclados; server-only; verificar acceso ANTES de leer
-- con service_role) — eso no lo toca esta migracion.

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Para que las tablas/funciones que agreguen T-005/T-008/etc en migraciones futuras nazcan con
-- el mismo privilegio sin depender de que cada migracion se acuerde de repetirlo.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
