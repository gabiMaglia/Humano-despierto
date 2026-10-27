-- T-080 · D-102 (supera a D-65) · `courses.roman_num` se retira de la base.
--
-- El numeral romano dejo de dibujarse en tarjetas con el rediseño Brote; quedaba vivo solo como
-- dato que el form preservaba con un input oculto y la OG leia. Una columna de texto publico que
-- nadie muestra sigue siendo superficie: entra a la clase de ADR-009 y hay que cubrirla para nada.
--
-- ORDEN. El guard exacto declara la columna por nombre y `guard_locator_exacto` FALLA (42704) si
-- no existe -- a proposito, para que un typo no apague la proteccion en silencio. Por eso el
-- trigger se re-declara SIN la columna antes del drop. El CHECK `courses_roman_num_no_locator`
-- (0008) es de una sola columna y cae con ella; los grants por columna de 0003 tambien.
--
-- DESTRUCTIVA: no se aplica a la base local compartida mientras otras ramas la lean.

drop trigger courses_locator_guard on public.courses;
create trigger courses_locator_guard
  before insert or update on public.courses
  for each row execute function public.guard_locator_exacto(
    'title', 'title_em', 'subtitle', 'intro', 'description', 'slug',
    'discipline', 'level', 'moon_glyph',
    'includes', 'learning_objectives', 'prerequisites', 'cover_path'
  );

alter table public.courses drop column roman_num;
