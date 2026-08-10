-- T-016 · Corrección del predicado `text_has_locator` tras el rechazo de QA.
--
-- EL DEFECTO. La regla de TLD usaba `~*`, insensible a mayúsculas, así que un typo
-- de prosa castellana muy común —punto sin espacio antes de una palabra que empieza
-- con `Me`, `Co`, `Info`, `Be`, `Tv`— se leía como un dominio. Reproducido:
--
--   "El curso termina.Me parece importante volver"   ⇒ RECHAZADA
--   "Ocho semanas.Co-creamos el material"            ⇒ RECHAZADA
--   "Detalle del temario.Info completa abajo"        ⇒ RECHAZADA
--
-- Las tres son prosa legítima, y `courses.intro` es justamente el campo de prosa larga
-- donde ese typo aparece. El CHECK bloqueaba contenido real en producción.
--
-- POR QUE NO LO ATRAPO EL CONTROL POSITIVO. Probaba títulos cortos ("Manual v2.1",
-- "cap. IV") para las 21 columnas: exhaustivo en amplitud, ciego en profundidad.
-- Ninguna prueba tenía un párrafo con puntuación real. Las columnas de prosa son otra
-- clase de dato y necesitaban sus propios casos.
--
-- EL ARREGLO. La alternancia de TLD pasa a ser sensible a mayúsculas (`~`, no `~*`):
-- un dominio real se pega en minúscula (`drive.google.com/file/...`), y el typo de
-- prosa capitaliza porque arranca oración. Ese es el discriminador, y no depende de
-- mantener un diccionario de palabras castellanas cortas.
--
-- LIMITACION DECLARADA. Un dominio escrito en mayúsculas ("VER EJEMPLO.COM") escapa a
-- esta regla. Se acepta: las otras dos reglas (`://` y `www.`) siguen siendo
-- insensibles a mayúsculas y cubren la mayoría, y el modelo de amenaza de ADR-009 es el
-- pegado accidental de un link —que llega en minúscula— y la republicación por
-- PostgREST, no una docente decidida a ofuscar.

create or replace function public.text_has_locator(v text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select v ~* '://'
      or v ~* '(^|[^[:alnum:]])www\.'
      -- Sensible a mayúsculas a propósito: ver el encabezado de esta migración.
      or v ~  '[[:alnum:]]\.(com|net|org|io|co|app|dev|edu|gov|info|me|be|ly|gl|nz|cloud|link|site|online|page|xyz|tv)([^[:alpha:]]|$)'
      or exists (
           select 1
           from regexp_matches(v, '[A-Za-z0-9_]{25,}', 'g') as t(m)
           where t.m[1] ~ '[0-9]' and t.m[1] ~ '[a-z]' and t.m[1] ~ '[A-Z]'
         );
$$;

comment on function public.text_has_locator(text) is
  'ADR-009 · true si el texto parece contener un localizador (URL, host o id largo). '
  'La regla de TLD es sensible a mayusculas a proposito: un dominio pegado viene en '
  'minuscula y el typo de prosa capitaliza. Ver 0010 para el porque.';
