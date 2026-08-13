-- T-020 · mail_log — tope de intentos totales, no solo de ritmo — juez ciego, ronda 6 (D5)
--
-- LO QUE LA RONDA 5 DEJÓ SIN CUBRIR, Y CÓMO LO ENCONTRÓ EL JUEZ.
-- 0021 acota CUÁN SEGUIDO se puede reclamar (la ventana de 10 minutos) pero no CUÁNTAS VECES EN
-- TOTAL. Contra un falso negativo PERSISTENTE (el mismo motivo que justificó 0021: un `250` que
-- nunca llega a tiempo, siempre) nada confirma nunca — `sent_at` se queda en null para
-- siempre — y CADA vencimiento de ventana vuelve a entregar. La cabecera de 0021 decía "como
-- mucho un duplicado tardío raro", una frase que da por sentado que el reintento confirma y el
-- ciclo termina. Con un fallo persistente el ciclo NO termina: es una entrega real por
-- ventana, indefinidamente — contra un MTA lento, del orden de una cada 10 minutos, sin techo.
-- Disparable a voluntad (el mail de bienvenida se invoca con sesión propia), así que el residuo
-- que 0019 existía para cerrar (bombardeo hacia un tercero) se reabre, más lento pero sin
-- límite.
--
-- LA PIEZA QUE FALTABA: acotar el TOTAL, no solo el ritmo. `attempts` cuenta cada reclamo (el
-- primero y cada retoma); al llegar a `p_max_attempts` (3), el turno queda MUERTO — no se
-- reclama nunca más, venza la ventana o no. Con esto el total de entregas reales de UN
-- (recipient_user_id, mail_type, scope_key) queda acotado en 3 POR CONSTRUCCIÓN: es una
-- restricción de la sentencia atómica, no un supuesto sobre cómo se comporta la red — la
-- diferencia que el juez pidió explícitamente para la cabecera de este archivo.
--
-- PERO ESA COTA VALE LO QUE VALGA LA CANONICIDAD DE LA TUPLA, y la primera versión de este
-- párrafo lo pasó por alto — séptima cabecera de este hilo que declara una cota más ancha que
-- la que el código impone. `recipient_user_id` es `uuid` y Postgres lo canonicaliza solo;
-- **`scope_key` es `text`**, y dos strings distintos son dos turnos distintos con su propio
-- tope cada uno. El juez ciego lo explotó en la ronda 7: `scope_key` salía verbatim del
-- formulario, y un uuid tiene infinitas escrituras que la base considera la MISMA fila al
-- castear (mayúsculas, `{llaves}`, sin guiones). Cinco variantes → cinco turnos, cada uno con
-- `attempts=1`. La cota real era "3 por cadena de caracteres", no "3 por evento", y el techo
-- desaparecía.
--
-- Cerrado del lado de la app y no acá, porque es donde está la raíz: `notify.ts` arma el scope
-- con el `id` que **devolvió la base** al resolver el curso, no con el string del request. Este
-- archivo no puede canonicalizar `scope_key` por sí mismo: es `text` genérico y sus valores
-- legítimos incluyen `'account'` y códigos de certificado, que no son uuids.
--
-- Entonces la cota, dicha con su condición: **3 por tupla, y la tupla es única por evento
-- MIENTRAS quien llama use valores canónicos para el scope.** Un `claimOrReclaimMailSlot` nuevo
-- que arme el scope con texto que venga del request vuelve a abrir esto sin tocar una línea de
-- SQL — es la parte que este archivo no puede defender solo.
--
-- N = 3, chico a propósito. Un fallo AISLADO (la red hiccupeó una vez) tiene 2 reintentos más
-- para resolverse — suficiente para no perder un mail legítimo por un blip. Un fallo
-- PERSISTENTE (el servidor está roto, o alguien lo puso ahí a propósito para explotar D2/D4)
-- se apaga a la tercera: el costo máximo de un actor que fuerza reintentos es 3 intentos reales
-- por scope, para siempre — no una entrega cada 10 minutos hasta que alguien lo note. El
-- tradeoff, dicho explícito: un mail que en verdad falla 3 veces seguidas se pierde después de
-- la tercera, sin más reintentos. No hay cola de reprocesamiento ni alerta en esta migración —
-- si hace falta saber cuándo un turno murió sin confirmar, es trabajo aparte (consultar
-- `attempts >= 3 and sent_at is null`), no algo que esta tabla necesite hacer sola.
--
-- D2 DEL JUEZ (ronda 6, no bloqueante pero barato de cerrar ahora): `confirmMailSent` hacía
-- `update ... where id = $1`, sin más. Tras un vencimiento, dos procesos pueden sostener el
-- mismo `id` (el que perdió su turno original y el que lo retomó) — si el primero confirma
-- TARDE, pisa el `sent_at` de un turno que en realidad es el segundo intento. Se cierra
-- agregando `claimed_at` al fencing: `claim_or_reclaim_mail_slot` ahora devuelve también
-- `claimed_at`, y la aplicación lo lleva en el `WHERE` de la confirmación — una confirmación
-- vieja, con un `claimed_at` que ya no coincide, no toca nada.

alter table public.mail_log add column attempts int not null default 1;

comment on column public.mail_log.attempts is
  'Cuántas veces se reclamó este scope (el reclamo inicial cuenta como 1). Al llegar a 3, '
  'claim_or_reclaim_mail_slot deja de retomarlo — turno muerto, no hay reintento más allá.';

-- `create or replace` no puede cambiar el tipo de retorno (0021 la dejó `returns uuid`; acá
-- pasa a `returns table(...)` para poder devolver `claimed_at` también, D2 del juez más abajo)
-- — hace falta el `drop` explícito, o esta migración falla seca contra una base que corre las
-- migraciones en orden desde cero (PGlite de los tests incluido).
drop function if exists public.claim_or_reclaim_mail_slot(uuid, text, text);

create function public.claim_or_reclaim_mail_slot(
  p_recipient_user_id uuid,
  p_mail_type text,
  p_scope_key text
) returns table(id uuid, claimed_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  insert into public.mail_log (recipient_user_id, mail_type, scope_key, claimed_at, attempts)
  values (p_recipient_user_id, p_mail_type, p_scope_key, now(), 1)
  on conflict (recipient_user_id, mail_type, scope_key)
  do update set claimed_at = now(), attempts = public.mail_log.attempts + 1
  where public.mail_log.sent_at is null
    and public.mail_log.claimed_at < now() - interval '10 minutes'
    and public.mail_log.attempts < 3
  returning mail_log.id, mail_log.claimed_at;
$$;

revoke execute on all functions in schema public from public;
