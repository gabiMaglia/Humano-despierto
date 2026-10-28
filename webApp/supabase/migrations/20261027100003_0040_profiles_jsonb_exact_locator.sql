-- T-080 · D-15 · `profiles.formations` y `profiles.testimonials` entran a la mitad EXACTA de ADR-009.
--
-- QUE FALTABA (QA T-035). Las dos columnas jsonb las lee `anon` (ficha publica de la guia,
-- /guias/[slug]) y tienen la mitad de FORMA (CHECK de 0011 sobre `::text`), pero no la exacta: el
-- invariante de ADR-010 recorta por `text|char` y por escritura de cliente, y ninguna de las dos
-- cumple (jsonb, solo service_role/seed). "Hoy no las escribe un cliente" es una propiedad del
-- codigo de hoy, no del esquema: el dia que haya formulario de formaciones, el localizador pago
-- entra por aca sin que ningun test lo note.
--
-- `guard_locator_exacto` ya sabe jsonb: un array va por elemento (`jsonb_array_elements_text`
-- devuelve cada objeto como texto) y un objeto va entero por `#>> '{}'`. `body_has_known_locator`
-- normaliza, asi que las comillas y llaves del JSON no esconden nada. Solo faltaba declararlas.
--
-- SIN BYPASS (ADR-011): el que las escribe hoy ES service_role.

drop trigger profiles_locator_guard on public.profiles;
create trigger profiles_locator_guard
  before insert or update on public.profiles
  for each row execute function public.guard_locator_exacto(
    'full_name', 'bio', 'slug', 'glyph', 'headline', 'location', 'quote', 'avatar_path',
    'formations', 'testimonials'
  );
