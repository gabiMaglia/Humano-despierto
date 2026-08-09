-- NOTA: nacio como 0008 y colisiono con la migracion de T-016, que se creo en
-- paralelo con el mismo numero y timestamp. Renumerada a 0009 por el Orquestador.
-- Dos tickets con migraciones simultaneas necesitan numeros asignados por adelantado.

-- T-015 · el reloj de `seconds_watched` deja de declararlo el alumno
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- ADR-007 cerro que la VARA la mueva la parte interesada: `completed`/`completed_at` son
-- derivadas de (lesson_id, seconds_watched) y `duration_seconds` es de servidor (T-012). Quedo
-- declarado como residuo: nadie cerro que el RELOJ lo declare el alumno. El grant de UPDATE de
-- 0003 (`grant update (seconds_watched, last_seen_at) ... to authenticated`) deja escribir
-- CUALQUIER valor de `seconds_watched` en una sola sentencia — alcanza con
--     update lesson_progress set seconds_watched = <duration_seconds> where lesson_id = ...
-- para cruzar el umbral del 90% instantaneamente. `duration_seconds` es publico (se sirve a
-- `anon`, ADR-003), asi que ni siquiera hace falta adivinarlo.
--
-- DECISION DE PRODUCTO (tomada por el Orquestador, no el PO — asuncion REVERSIBLE, ver
-- engram/03_backlog.md T-015 y el handoff de esta entrega):
--   · El scrub NO cuenta: saltar el player al minuto 40 no acredita 40 minutos.
--   · La velocidad hasta 2x SI cuenta (Udemy/Coursera: penalizar a quien escucha rapido castiga
--     a quien ya sabe del tema).
-- Eso fija la forma del tope: entre dos escrituras separadas por N segundos de RELOJ real
-- (medidos en el SERVIDOR, nunca en el valor que declara el cliente), `seconds_watched` no puede
-- subir mas de 2N + un margen chico.
--
-- POR QUE ESCALAR-CON-TOPE Y NO INTERVALOS (alternativa descartada, con fundamento).
-- Plataformas del rubro (Udemy/Coursera/Teachable) guardan los INTERVALOS reproducidos, no un
-- total: el servidor los une y el hueco de un scrub se ve literalmente en el gap. Es mas preciso
-- — pero para esta etapa (Fase 1, sin pagos ni certificados, T-015 mismo lo dice) es
-- sobredimensionado. El tope por tiempo de reloj sobre el escalar ya cierra el agujero PRINCIPAL
-- de este ticket: una escritura que declare `seconds_watched = duration_seconds` de una sola vez
-- deja de ser posible salvo que haya pasado, en RELOJ REAL, aproximadamente la mitad de la
-- duracion de la leccion desde la ultima escritura — de "abrir la consola" paso a costar tiempo
-- real, que es el vector que este ticket cierra.
-- Limite conocido y ACEPTADO, no escondido: el tope acota la TASA de avance, no la CONTINUIDAD.
-- Un atacante que deje la pestaña realmente inactiva un tiempo largo (sin reproducir nada) y
-- despues declare un salto grande queda dentro del tope, porque el reloj si paso — el escalar no
-- puede distinguir "reproduje a 2x sin parar" de "espere en silencio y after escribo el numero".
-- Cerrar ESE residuo especifico exige guardar intervalos (la alternativa de arriba). Con nulo
-- costo de pagos/certificados en esta fase, se deja anotado para cuando haga falta, no se
-- construye ahora (YAGNI).
--
-- POR QUE `last_seen_at` PASA A SER 100% DE SERVIDOR (deja de fiarse del cliente).
-- El grant de UPDATE/INSERT de 0003 incluye `last_seen_at`: hoy el cliente puede declarar
-- cualquier timestamp (incluso futuro) y el guard de 0005 solo lo protegia de RETROCEDER
-- (`greatest(new, old)`), no de ADELANTARSE. Si el tope de este archivo se basara en el
-- `last_seen_at` que declara el cliente, alcanzaria con mandar un timestamp viejo en la PRIMERA
-- escritura (establece una base falsa de "hace rato que no escribo") para inflar el N de la
-- proxima. Por eso los dos guards de `lesson_progress` pasan a pisar `new.last_seen_at := now()`
-- SIEMPRE, ignorando lo que declare el cliente — igual que ya se hace con `completed`. La columna
-- sigue en el grant (no rompe el contrato del Server Action, que sigue mandandola) pero deja de
-- tener efecto: es el guard, no el cliente, quien decide que hora es.

-- Tope de avance entre dos escrituras, en un solo lugar (evita divergencia INSERT/UPDATE).
-- `p_desde` es SIEMPRE un timestamp que puso el propio guard en una escritura anterior (o el
-- instante actual si no hay escritura previa): nunca un valor que haya podido tocar el cliente.
-- Aritmetica: `extract(epoch ...)` da `double precision` de forma inevitable (no hay resta de
-- timestamps en enteros en Postgres), pero se trunca a `bigint` de entero de segundos ANTES de
-- cualquier otra operacion — no hay float en ningun valor que se compare ni se guarde, que es lo
-- que pide la regla de la casa (`duration_seconds`/`price_cents` sin float).
-- `2` = velocidad maxima que acredita (decision de producto de este archivo). `10` = margen chico:
-- cubre el throttle de persistencia del player (5s, T-006 c.5) mas latencia de red, sin ser tan
-- generoso como para reabrir el agujero (10s de margen no alcanzan ni de lejos el 90% de ninguna
-- leccion real).
create or replace function public.lesson_progress_tope_incremento(p_desde timestamptz)
returns bigint
language sql
stable
set search_path = ''
as $$
  select greatest(0, floor(extract(epoch from (now() - p_desde)))::bigint) * 2 + 10;
$$;

revoke execute on function public.lesson_progress_tope_incremento(timestamptz) from public;

-- Reemplaza la version de 0006: agrega el tope de reloj sobre la PRIMERA escritura. Sin esto, el
-- alumno se auto-certifica en el INSERT mismo (no hace falta ni una segunda escritura): no hay
-- "old" contra el que acotar, asi que el N efectivo es 0 y el tope se reduce al margen fijo.
create or replace function public.guard_lesson_progress_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.seconds_watched := least(new.seconds_watched, public.lesson_progress_tope_incremento(now()));
  new.last_seen_at    := now();

  new.completed    := public.lesson_progress_completes(new.lesson_id, new.seconds_watched);
  new.completed_at := case when new.completed then now() else null end;
  return new;
end;
$$;

-- Reemplaza la version de 0006: agrega el tope de reloj entre `old.last_seen_at` (que el propio
-- guard escribio en la escritura anterior, nunca el cliente) y `now()`. Criterio 3: un salto
-- imposible se RECORTA al maximo legitimo, no se rechaza — un alumno que dejo la pestaña dormida
-- y vuelve no debe ver un error, solo un avance acotado.
create or replace function public.guard_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tope bigint;
begin
  tope := public.lesson_progress_tope_incremento(old.last_seen_at);

  -- El piso (`greatest(old, ...)`) sostiene la monotonia heredada de 0005: la pestaña lenta no
  -- pisa el avance de la rapida. El techo (`least(new, old + tope)`) es lo nuevo de T-015.
  new.seconds_watched := greatest(old.seconds_watched, least(new.seconds_watched, old.seconds_watched + tope));
  new.last_seen_at    := now();

  if old.completed then
    -- Completar es irreversible: el sello original no se reescribe.
    new.completed    := true;
    new.completed_at := old.completed_at;
  elsif public.lesson_progress_completes(new.lesson_id, new.seconds_watched) then
    new.completed    := true;
    new.completed_at := now();
  else
    new.completed    := false;
    new.completed_at := null;
  end if;

  return new;
end;
$$;

-- Regla de 0005:153 / 0006:233 — toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
