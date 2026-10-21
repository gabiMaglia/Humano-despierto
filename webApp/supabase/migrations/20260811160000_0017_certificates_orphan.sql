-- T-018 · el certificado no podia quedar huerfano, que es justo lo que 0013 prometia
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- 0013 declara en su cabecera (linea 23) que `user_id`/`course_id` son `on delete set null`
-- para que "la fila sobreviva aunque el perfil o el curso desaparezcan". Y despues instala
-- `guard_certificates_immutable`, que levanta excepcion en TODO update y TODO delete, sin
-- ninguna condicion. El `SET NULL` de la FK **es un UPDATE**, disparado por Postgres solo, asi
-- que lo comia el mismo guard: **borrar un perfil con certificado emitido era imposible**, ni
-- siquiera con `service_role`.
--
--   delete from auth.users where email='...';
--   ERROR: un certificado emitido no se modifica ni se borra (T-018 c.6)
--   CONTEXT: ... UPDATE ONLY "certificates" SET "user_id" = NULL WHERE ...
--
-- Lo encontro un agente de T-020 intentando limpiar sus fixtures — no buscandolo. El impacto
-- real no son los fixtures: es que **una cuenta con certificado no se puede dar de baja nunca**.
-- Cualquier baja de usuario (a pedido de la persona, o por un admin) choca contra esto, y una
-- escuela que emite certificados va a tener cuentas con certificado por definicion.
--
-- LA CORRECCION, y por que no debilita el invariante.
-- El criterio 6 de T-018 es que el certificado sobreviva a que se revoque la inscripcion o se
-- despublique el curso: certifica algo que YA paso. Los cuatro datos que la pagina publica
-- muestra —`student_name`, `course_title`, `teacher_name`, `completed_at`— son **snapshot**,
-- texto propio de la fila copiado al emitir. Perder el `user_id` no cambia ni uno de ellos: la
-- pagina publica sigue mostrando exactamente lo mismo. O sea que el desvinculo es precisamente
-- el caso que el diseño ya habia previsto, y lo unico que faltaba era que el guard lo dejara
-- pasar.
--
-- Se permite EXCLUSIVAMENTE nulificar `user_id`/`course_id`, y solo en la direccion
-- valor -> NULL. Todo lo demas sigue rechazado igual que antes: no se puede reasignar el
-- certificado a otra persona (NULL -> valor), no se puede cambiar el nombre, el curso, la fecha
-- ni el codigo, y el DELETE sigue prohibido para todos. **Sin bypass de `service_role`**, como
-- en 0013: un invariante con puerta trasera no es un invariante.

create or replace function public.guard_certificates_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'un certificado emitido no se modifica ni se borra (T-018 c.6)'
      using errcode = '42501';
  end if;

  -- La unica mutacion admitida: el `SET NULL` que dispara la FK cuando desaparece el perfil o
  -- el curso. Se comprueba por FORMA, no por quien la ejecuta -- da igual si viene de la
  -- cascada, de un admin o de `service_role`: si el resultado es exactamente "se corto el
  -- vinculo y no se toco nada mas", es legitimo; si no, no.
  if new.id           is not distinct from old.id
     and new.code         is not distinct from old.code
     and new.student_name is not distinct from old.student_name
     and new.course_title is not distinct from old.course_title
     and new.teacher_name is not distinct from old.teacher_name
     and new.completed_at is not distinct from old.completed_at
     and new.created_at   is not distinct from old.created_at
     -- valor -> NULL, o sin cambio. Nunca NULL -> valor: reasignar un certificado a otra
     -- persona seria falsificarlo, y es la razon por la que esto no es simplemente
     -- "permitir updates de user_id".
     and (new.user_id   is not distinct from old.user_id   or new.user_id   is null)
     and (new.course_id is not distinct from old.course_id or new.course_id is null)
  then
    return new;
  end if;

  raise exception 'un certificado emitido no se modifica ni se borra (T-018 c.6)'
    using errcode = '42501';
end;
$$;
