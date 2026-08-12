-- T-022 (QA, ronda 2) · La coincidencia exacta cubría SOLO `body`, y además se evadía por
-- ofuscación de caracteres.
--
-- ================================================================ H1 — BLOQUEANTE
--
-- `guard_diario_posts` (migración 0018) invocaba `body_has_known_locator()` únicamente sobre
-- `new.body`. `title`, `slug` y `excerpt` quedaban protegidos solo por `text_has_locator()` — la
-- heurística de FORMA — que no atrapa un id desnudo: un `video_id` de YouTube son 11 caracteres
-- sin `://`, sin `www.` y sin llegar al umbral de 25 de la corrida opaca (regla 4 de 0008).
-- QA lo reprodujo publicando un post con `title = 'dQw4w9WgXcQ'` (o el `drive_file_id` real de
-- un recurso en `slug`/`excerpt`): pasa el CHECK, se publica, y `getPublishedPosts()` /
-- `getPostBySlug()` lo sirven a `anon` SIN sesión. Es la fuga que ADR-003 existe para cerrar,
-- entrando por una columna que la primera ronda de "coincidencia exacta" no miraba.
--
-- El test de "criterio 5" de la ronda anterior (`diario-posts.test.mjs`) solo probaba payloads
-- con FORMA de link (que el CHECK ya atrapaba) — nunca un id real desnudo, así que el hueco
-- quedaba invisible: un verificador modelado sobre el PREDICADO en vez de sobre la AMENAZA. Es
-- el mismo patrón que este proyecto ya registró varias veces (ver playbook).
--
-- Arreglo: `guard_diario_posts` ahora llama a `body_has_known_locator()` sobre las CUATRO
-- columnas que `anon` lee sin sesión — `body`, `title`, `slug`, `excerpt` — no solo `body`. Es
-- la clase completa ("todo campo del post que el cliente escribe y que se lee sin inscripción"),
-- la misma lógica de ADR-009 aplicada sin recortarla a un solo campo. El CHECK de forma
-- (`text_has_locator`) sobre `title`/`slug`/`excerpt` sigue en pie sin cambios (0018) — esto se
-- SUMA, no lo reemplaza. `body` sigue sin ese CHECK, a propósito: esa parte del diseño (un post
-- SÍ es un lugar para un link externo legítimo) no la cuestionó QA y no se toca acá.
--
-- ================================================================ H2 — no bloqueante, misma pasada
--
-- `body_has_known_locator()` (0016) comparaba el localizador CRUDO contra el texto CRUDO con
-- `position(... in ...)`: alcanza con un espacio, un guión, un carácter invisible o un cambio de
-- mayúscula DENTRO del id real para que dos strings iguales dejen de matchear byte a byte. QA
-- reprodujo las cuatro variantes contra el `video_id` real del seed (`dQw4w9WgXcQ` como
-- `dQw4 w9Wg XcQ`, `dQw4-w9Wg-XcQ`, con un U+200B insertado, y en mayúsculas).
--
-- CORRECCIÓN A UNA AFIRMACIÓN DE 0016 — mismo patrón que 0016 usó para corregir a ADR-009/0008
-- (ver esa nota, más abajo en ese mismo archivo): no se edita el archivo ya aplicado, se corrige
-- acá, a la vista, no borrada.
--
-- La cabecera de 0016 decía: "cero falsos negativos para nuestro propio material". Tal como
-- estaba escrita la función, eso era falso: sobrevivía a cualquier variación de mayúsculas,
-- separadores o caracteres invisibles dentro del id. Lo que la función garantizaba de verdad
-- hasta esta migración era "cero falsos negativos para nuestro propio material copiado
-- LITERALMENTE, byte a byte". Con la normalización de abajo, la garantía real pasa a ser: cero
-- falsos negativos para nuestro propio material sometido a mayúsculas/minúsculas arbitrarias y a
-- la inserción de CUALQUIER carácter no alfanumérico (espacios, guiones, puntuación, caracteres
-- invisibles) entre sus caracteres reales.
--
-- LO QUE ESTO SIGUE SIN CUBRIR, dicho a propósito porque es la misma disciplina que le faltó a
-- la afirmación original: un id partido en fragmentos NO contiguos (mencionado en dos oraciones
-- separadas), una transliteración (base64, rot13, dictado al revés), o una paráfrasis del
-- contenido. Cerrar eso no es un problema de coincidencia de texto — y no es la fuga que ADR-003
-- pide cerrar (la fuga es "alguien pega el id real", no "alguien lo describe de memoria").
--
-- Y UNO MÁS, que QA encontró y que este párrafo ya estaba sub-declarando en su primera versión:
-- **sustituir un carácter del id por un homóglifo** — una `е` cirílica, o un carácter de ancho
-- completo — también evade. El normalizador BORRA lo que no es `[A-Za-z0-9]`, así que INSERTAR
-- un carácter raro entre medio no evade nada (se elimina y el id vuelve a quedar contiguo);
-- pero REEMPLAZAR uno de sus caracteres deja una cadena de 10 que no coincide con el id de 11.
-- Es mucho más barato que "base64 o rot13", que es lo que el párrafo de arriba ejemplificaba:
-- para quien lee el post el id se ve idéntico. Se deja SIN cerrar a propósito —el id resultante
-- no funciona pegado en YouTube, hay que retipearlo mirándolo— pero se declara acá en vez de
-- quedar tapado bajo la palabra "transliteración". **Tercera vez en este mismo hilo de tickets
-- que una cabecera promete más de lo que entrega; que la cuarta no sea ésta.**
--
-- Por qué normalizar los DOS LADOS de la comparación, no uno: si solo se normalizara el
-- localizador, "DQW4W9WGXCQ" en el texto del post seguiría sin matchear contra el
-- "dQw4w9WgXcQ" ya normalizado. Los dos lados tienen que llegar al mismo alfabeto canónico
-- (minúsculas, solo `[A-Za-z0-9]`) antes de compararse.
--
-- Por qué el riesgo de falso positivo sigue siendo despreciable: un id realista normalizado
-- sigue siendo una corrida de 8+ caracteres alfanuméricos específicos, no una palabra ni una
-- combinación previsible. Que "Ritual-de-Luna-Nueva-Enero2026" normalice a
-- "ritualdelunanuevaenero2026" no lo acerca a ningún id real: seguiría haciendo falta que ESE id
-- real, ya normalizado, aparezca como substring exacto de esa cadena. Verificado, no asumido,
-- contra el mismo corpus de títulos legítimos que 0008/0016 ya usan (control positivo del test).

-- ================================================================ la normalización

create or replace function public.normalize_locator_text(v text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(coalesce(v, ''), '[^A-Za-z0-9]', '', 'g'));
$$;
-- Clases ASCII explícitas (`A-Za-z0-9`), no POSIX (`[:alnum:]`) — la lección de
-- 0012_locator_ascii_classes: una clase POSIX cambia de significado según el locale del server,
-- un rango explícito no. No necesita GRANT propio: el único llamador es `body_has_known_locator`
-- (más abajo), que es SECURITY DEFINER — durante su ejecución corre "como" su dueño, así que la
-- llamada anidada no le exige EXECUTE a `authenticated`/`service_role`. Confirmado contra
-- Postgres real (PGlite), no supuesto: sin ningún grant explícito para esta función, el guard de
-- una docente autenticada sigue funcionando (ver el test de esta migración).

-- ================================================================ H2 · la coincidencia, normalizada

create or replace function public.body_has_known_locator(v text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    where length(public.normalize_locator_text(l.video_id)) >= 8
      and position(public.normalize_locator_text(l.video_id) in public.normalize_locator_text(v)) > 0
  ) or exists (
    select 1 from public.lesson_resources r
    where (length(public.normalize_locator_text(r.drive_file_id)) >= 8
           and position(public.normalize_locator_text(r.drive_file_id) in public.normalize_locator_text(v)) > 0)
       or (length(public.normalize_locator_text(r.url)) >= 8
           and position(public.normalize_locator_text(r.url) in public.normalize_locator_text(v)) > 0)
  );
$$;
-- El umbral de longitud (8+) se mide sobre el localizador YA NORMALIZADO, no sobre el original:
-- lo que importa es cuántos caracteres específicos quedan del lado que se busca, después de
-- sacarle todo lo que no sea alfanumérico — no cuántos tenía antes.

-- ================================================================ H1 · guard_diario_posts, las 4 columnas
--
-- Resto de la función sin cambios de comportamiento respecto de 0018 (autoría, status,
-- published_at, bypass de service_role solo para ESAS reglas de permiso — el invariante de
-- locator sigue sin bypass, igual que en 0018).
create or replace function public.guard_diario_posts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.body is distinct from old.body)
     and public.body_has_known_locator(new.body) then
    raise exception 'diario_posts.body contiene un localizador de contenido pago de la plataforma'
      using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' or new.title is distinct from old.title)
     and public.body_has_known_locator(new.title) then
    raise exception 'diario_posts.title contiene un localizador de contenido pago de la plataforma'
      using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' or new.slug is distinct from old.slug)
     and public.body_has_known_locator(new.slug) then
    raise exception 'diario_posts.slug contiene un localizador de contenido pago de la plataforma'
      using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' or new.excerpt is distinct from old.excerpt)
     and public.body_has_known_locator(new.excerpt) then
    raise exception 'diario_posts.excerpt contiene un localizador de contenido pago de la plataforma'
      using errcode = '42501';
  end if;

  if public.is_service_context() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.teacher_id is distinct from auth.uid() then
      raise exception 'diario_posts.teacher_id tiene que ser quien escribe' using errcode = '42501';
    end if;
    if new.status is distinct from 'draft' then
      raise exception 'un post nace en draft: publicar es privilegio de service_role (ADR-008)'
        using errcode = '42501';
    end if;
    if new.published_at is not null then
      raise exception 'diario_posts.published_at lo fija el servidor al publicar' using errcode = '42501';
    end if;
    return new;
  end if;

  -- tg_op = 'UPDATE' de acá en más.
  if new.teacher_id is distinct from old.teacher_id then
    raise exception 'diario_posts.teacher_id no se reasigna desde el cliente' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    raise exception 'diario_posts.status solo lo cambia service_role (publicar/despublicar)'
      using errcode = '42501';
  end if;
  if new.published_at is distinct from old.published_at then
    raise exception 'diario_posts.published_at lo fija el servidor' using errcode = '42501';
  end if;

  return new;
end;
$$;
-- `create or replace` conserva el OID: el trigger `diario_posts_guard` (0018) ya apunta acá,
-- no hace falta recrearlo.

-- ================================================================ privilegios de ejecución
--
-- REGLA de 0005:153 — toda migración que crea funciones termina con este revoke. Se crea UNA
-- función nueva (`normalize_locator_text`) y se reemplazan dos existentes (mismo nombre, mismo
-- OID, no necesitan re-grant). `normalize_locator_text` no recibe grant explícito — ver la nota
-- de arriba sobre por qué no lo necesita.
revoke execute on all functions in schema public from public;
