-- T-017 · Donde viven bio/formacion/carta-natal/testimonios de `guia.ts` (268 de 490 lineas de mock)
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- El PO pidio sacar toda la data mockeada de cursos/docentes/alumnos. `guia.ts` es el mock mas
-- grande (268 lineas) y describe una ficha de docente mucho mas rica que `profiles` hoy
-- (`id, role, full_name, slug, glyph, bio`). Este archivo es la decision de donde vive cada campo,
-- con fundamento (handoff T-017: "es la decision del ticket y merece quedar escrita").
--
-- EL BARRIDO CAMPO POR CAMPO, con veredicto.
--
--  Campo del mock      | Destino                              | Por que
--  ---------------------+---------------------------------------+---------------------------------
--  bio                  | profiles.bio (ya existe)              | prosa, ya tiene CHECK anti-localizador (0008)
--  role ("Tarotista...")| profiles.headline (NUEVA)              | dato profesional real, autoreportable
--  location              | profiles.location (NUEVA)              | ciudad/pais, dato real, autoreportable
--  quote                 | profiles.quote (NUEVA)                 | frase propia, misma clase que bio
--  years ("XVIII")       | profiles.years_practice smallint (NUEVA) | anos de practica, editorial pero verificable
--  formations[]          | profiles.formations jsonb (NUEVA)       | lista chica, nunca se filtra/ordena por ella
--  testimonios[]         | profiles.testimonials jsonb (NUEVA)     | ver nota "testimonios" abajo
--  discipline            | DERIVADO de courses.discipline          | ya existe en courses; guardarlo en profiles
--                        | (moda de los cursos publicados del      | lo desincroniza en el primer curso nuevo
--                        | docente)                                | que dicte en otra disciplina
--  students/coursesCount | DERIVADO (count de enrollments/courses) | mismo criterio que "Derivados" del esquema
--                        |                                          | ratificado (02_architecture.md:532): si el
--                        |                                          | costo aparece, vista materializada -- no
--                        |                                          | columna que se desincroniza
--  rating ("4.9")        | DESCARTADO                              | no existe tabla de reviews/ratings en el
--                        |                                          | esquema de 9 tablas ratificado (T-001). Un
--                        |                                          | numero que no deriva de nada real es peor
--                        |                                          | que no mostrarlo (mismo criterio que T-007
--                        |                                          | c.5 aplico a los widgets decorativos del panel)
--  birthChart{date,      | DESCARTADO (columna y seccion de UI)    | ver nota "carta natal" abajo
--  planets[]}, sun/moon/ |                                          |
--  asc                   |                                          |
--
-- NOTA "TESTIMONIOS". No hay tabla `reviews` en el esquema ratificado y crear una (con alta desde
-- el cliente, moderacion, FK a enrollments reales) es una feature nueva -- alcance de Strong, no de
-- este ticket Advisory. `testimonials` queda como JSONB de contenido CURADO por el equipo (se
-- siembra desde el seed/admin, igual que hoy hace el propio mock): no es un sistema de reviews en
-- vivo, no hay formulario de alumno que la escriba, y por eso NO se le otorga GRANT UPDATE al
-- cliente (ver mas abajo). Declarado, no oculto: si el producto pide reviews reales de alumnos con
-- inscripcion verificada, es una tabla nueva con su propio ADR, no esta columna.
--
-- NOTA "CARTA NATAL". Exige inventar fecha de nacimiento y posiciones planetarias por docente sin
-- ningun dato real detras (ni siquiera una efemeride real: los angulos del mock son valores de
-- diseno elegidos a mano). Es la misma clase de "promesa sin respaldo" que ADR-004/T-007/T-014 ya
-- sacaron de este proyecto (fase lunar decorativa, bitacora, cohortes): T-013 SIGNAL ya encontro
-- una inconsistencia real ahi (el birthChart de Sol Mayor no coincide con el signo solar declarado
-- en la misma ficha) sin que nadie lo notara durante dos rondas de QA -- exactamente el riesgo de
-- guardar un dato fabricado que nadie puede verificar. Se descarta el campo Y la seccion de UI
-- (`BirthChart` SVG en `/guias/[slug]`), no solo se deja de sembrar.
--
-- QUE SE ABRE AL CLIENTE Y QUE NO.
-- `headline`/`location`/`quote` entran a la MISMA clase que `bio` (texto libre, escrito por la
-- propia docente, legido por `anon` sin inscripcion): mismo GRANT UPDATE, mismo CHECK
-- `*_no_locator` (ADR-009), mismo criterio de barrido -- se agregan a
-- `tests/locator-free-text.test.mjs`. `years_practice`/`formations`/`testimonials` NO se otorgan
-- al cliente: no hay formulario que los escriba hoy (igual que ADR-009 dejo `intro`/`bio` cerrados
-- "no hay formulario de perfil todavia") y `formations`/`testimonials` en particular no deberian
-- ser auto-editables sin curaduria (una docente no se autoadjudica un testimonio). Se abren de a
-- uno cuando el producto los pida, mismo patron de reversibilidad que ADR-009 ya establecio.

alter table public.profiles
  add column headline       text,
  add column location       text,
  add column quote          text,
  add column years_practice smallint,
  add column formations     jsonb not null default '[]'::jsonb,
  add column testimonials   jsonb not null default '[]'::jsonb;

alter table public.profiles
  add constraint profiles_years_practice_range
    check (years_practice is null or years_practice between 0 and 80);

-- formations/testimonials son jsonb (varios campos de texto por item): en vez de un predicado
-- nuevo, se reusa `text_has_locator` sobre la serializacion completa -- mismo predicado de 0008/
-- 0010, sin duplicar logica, y correcto para el caso: si un localizador se esconde en CUALQUIER
-- campo de CUALQUIER item, aparece en el texto serializado igual.
-- No es parte de la clase que exige el barrido de ADR-009 (no tienen GRANT UPDATE a authenticated,
-- ver nota arriba) -- se agrega igual como defensa en profundidad, sin costo: son columnas chicas,
-- de bajo volumen, escritas solo por el seed/service_role.
alter table public.profiles
  add constraint profiles_headline_no_locator     check (not public.text_has_locator(headline)),
  add constraint profiles_location_no_locator     check (not public.text_has_locator(location)),
  add constraint profiles_quote_no_locator        check (not public.text_has_locator(quote)),
  add constraint profiles_formations_no_locator   check (not public.text_has_locator(formations::text)),
  add constraint profiles_testimonials_no_locator check (not public.text_has_locator(testimonials::text));

-- select: mismo patron que el resto de la ficha publica (0003) -- anon+authenticated, gateado por
-- fila via `profiles_read_public` (0004: role in ('teacher','admin')).
grant select (headline, location, quote, years_practice, formations, testimonials)
  on public.profiles to anon, authenticated;

-- update: SOLO headline/location/quote, misma clase que full_name/slug/glyph/bio (0003:31-32).
-- years_practice/formations/testimonials quedan sin GRANT UPDATE -- service_role/seed unicamente.
grant update (headline, location, quote)
  on public.profiles to authenticated;
