-- T-016 · Las clases POSIX dependen del locale, y eso divergía del espejo JS.
--
-- EL DEFECTO, encontrado por QA atacando la superficie JS↔SQL. No era hipotético: ya
-- divergían, y en las DOS direcciones a la vez.
--
--   "resumen del cursoó.com/x"   ⇒ SQL bloquea · JS acepta   ← la dirección peligrosa
--   "info.comÓptico avanzado"    ⇒ SQL acepta  · JS bloquea   ← rechaza texto legítimo
--
-- LA CAUSA. `[[:alnum:]]` y `[[:alpha:]]` se resuelven según el locale de la base. El
-- contenedor corre `en_US.UTF-8`, donde una `ó` ES alfanumérica; el `hasLocator` de
-- `validation/locator.mjs` usa clases ASCII explícitas. Las dos definiciones decían lo
-- mismo mientras el texto fuera ASCII, y este es un producto en castellano: los acentos
-- no son un caso borde, son el caso normal.
--
-- Y no es solo un problema de paridad: el mismo `CHECK` puede comportarse distinto entre
-- dos instancias con locales distintos. Un `CHECK` que depende del locale es un
-- invariante que cambia de significado al mover la base.
--
-- EL ARREGLO. Clases ASCII explícitas, exactamente como ya hacía la regla 4 de este mismo
-- predicado (`[A-Za-z0-9_]{25,}`) — la única de las cuatro que no divergía, justamente
-- porque no usaba POSIX. Es alinear las otras tres con la que ya estaba bien.
--
-- LIMITACION QUE ESTO HACE EXPLICITA. Con clases ASCII, un dominio escrito con caracteres
-- no-ASCII (IDN: "sitió.com") no se detecta. Se acepta, y es coherente con el modelo de
-- amenaza de ADR-009 —el pegado accidental de un link de Drive, que es ASCII— pero ahora
-- queda dicho en vez de ser un efecto colateral del locale.

create or replace function public.text_has_locator(v text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select v ~* '://'
      or v ~* '(^|[^a-zA-Z0-9])www\.'
      -- Sensible a mayúsculas a propósito (ver 0010) y ASCII a propósito (ver arriba).
      or v ~  '[a-zA-Z0-9]\.(com|net|org|io|co|app|dev|edu|gov|info|me|be|ly|gl|nz|cloud|link|site|online|page|xyz|tv)([^a-zA-Z]|$)'
      or exists (
           select 1
           from regexp_matches(v, '[A-Za-z0-9_]{25,}', 'g') as t(m)
           where t.m[1] ~ '[0-9]' and t.m[1] ~ '[a-z]' and t.m[1] ~ '[A-Z]'
         );
$$;

comment on function public.text_has_locator(text) is
  'ADR-009 · true si el texto parece contener un localizador (URL, host o id largo). '
  'Clases ASCII explicitas, NO POSIX: [[:alnum:]] depende del locale y hacia que este '
  'CHECK divergiera del espejo JS con texto acentuado, que en un producto en castellano '
  'es el caso normal. Sensible a mayusculas por 0010. Ver 0012 para el porque.';
