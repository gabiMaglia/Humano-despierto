# SP-0 · Higiene y base

**Fecha:** 2026-10-21 · **Maestro:** [cierre-funcional-master](docs/superpowers/specs/2026-10-21-cierre-funcional-master.md) ·
**Base:** `fix/auditoria-seo-a11y` (`4bd9f27`) · **Depende de:** nada · **Bloquea:** todos los demás SP.

SP-0 no agrega funcionalidad. Deja el repo en un estado desde el cual cualquier agente puede
arrancar un ticket sin preguntar: código subido, QA pendiente cerrado, variables documentadas,
fixtures que sobreviven un `db reset`, y un runner de tests que haga cumplir R-14. Las decisiones
(D7, D9, S-01 camino 1) ya están tomadas en el maestro y en `engram/_state.md`; acá sólo se ejecutan.

## Hechos medidos (2026-10-21, no re-verificar)
- `fix/auditoria-seo-a11y` tiene **71 commits sin upstream**. `main` en origin es la maqueta vacía
  del 2026-07-25, sin migraciones. `dev` local = `4157ab0`; `origin/dev` = `e3c28db`, un merge
  commit de más (PR #4 de D-09) cuyo contenido ya está en la rama.
- T-027, T-028, T-035 y T-036 están implementados en la rama, **en revisión QA sin veredicto**.
- No existe `.env.example`, `.nvmrc`, README ni CI. `engines.node >= 22` y el Node local es v20.
- `webApp/.env.local` tiene las 2 de Supabase, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`,
  `YOUTUBE_API_KEY`. Faltan `SITE_URL`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM_ADDRESS`,
  `MAIL_FROM_NAME`, que `webApp/src` sí lee.
- N-01: los fixtures manuales `admin@`, `docente@` y `alumna@test.local` se perdieron en un
  `db reset` porque no estaban en [seed.sql](webApp/supabase/seed.sql).
- D-10: la webApp no tiene ningún runner de tests. Sólo `webApp/supabase` tiene `node --test`.

---

## T-038 · Higiene de repo y cierre de lo pendiente

**Agente:** `nerv-orquestador` (git, backlog) + `nerv-web` (archivos) + `nerv-qa` (veredictos) ·
**Nivel:** Adversarial (toca ADR-013, P-11) · **Dependencias:** ninguna · **Migración:** ninguna.

### Por qué
Setenta y un commits que viven en una sola máquina no son un proyecto, son un riesgo. Cuatro
tickets "en revisión" sin veredicto bloquean a R-01 y T-037 que dependen de T-028. Un agente nuevo
no puede levantar el stack porque no hay lista de variables ni versión de Node declarada de forma
que `nvm` la lea. Y el certificado ya dice "completó el recorrido completo del curso" en
[page.tsx](webApp/src/app/certificado/[code]/page.tsx) línea 73, pero sin la segunda mitad de la
frase ("no acredita evaluación") y sin el ADR que respalde esa decisión.

**Ejecutar el QA es trabajo de `nerv-qa`, no del implementador.** El implementador prepara el
terreno (push, upstream, env, seed, ADR, README); `nerv-qa` audita T-027/028/035/036 contra sus
criterios y escribe el veredicto. El merge a `dev` espera esos cuatro veredictos.

### Qué se toca
- Git: `fix/auditoria-seo-a11y` → upstream en origin → PR a `dev` → PR de `dev` a `main`.
- [engram/03_backlog.md](engram/03_backlog.md): veredicto por ticket (T-027, T-028, T-035, T-036).
- [engram/02_architecture.md](engram/02_architecture.md): ADR-013 (vía `/nerv-adr`).
- [webApp/src/app/certificado/[code]/page.tsx](webApp/src/app/certificado/[code]/page.tsx): texto S-01.
- Nuevos: `webApp/.env.example`, `.nvmrc` (raíz), `README.md` (raíz).
- [webApp/supabase/seed.sql](webApp/supabase/seed.sql): tres fixtures de prueba.

### Criterios
1. **Dado** el repo local, **cuando** corro `git branch -vv`, **entonces** `fix/auditoria-seo-a11y`
   muestra `[origin/fix/auditoria-seo-a11y]` sin `ahead`.
2. **Dado** cada uno de T-027, T-028, T-035, T-036, **cuando** `nerv-qa` termina su auditoría,
   **entonces** la fila del ticket en `engram/03_backlog.md` dice `DONE` o `RECHAZADO` con fecha,
   agente y el criterio que falló si corresponde. Sin veredicto escrito no hay merge.
3. **Dado** los cuatro veredictos, **cuando** se abre el PR de `fix/auditoria-seo-a11y` a `dev`,
   **entonces** el PR lista los tickets incluidos y el merge deja `origin/dev` conteniendo `4bd9f27`
   y todo lo posterior. Luego PR de `dev` a `main`; `origin/main` deja de ser la maqueta vacía.
4. **Dado** `webApp/.env.example`, **cuando** lo abro, **entonces** contiene exactamente estas
   claves, cada una con un comentario de una línea sobre de dónde sale y si es secreto:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_DB_URL`, `SITE_URL`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`,
   `YOUTUBE_API_KEY`. Los valores de las claves locales de Supabase (demo, públicas) van
   completos; los secretos van vacíos. `SUPABASE_SERVICE_ROLE_KEY` lleva el aviso de nunca
   prefijarla con `NEXT_PUBLIC_`.
5. **Dado** `grep -rhoE "process\.env\.[A-Z_]+" webApp/src | sort -u`, **cuando** lo comparo con
   `.env.example`, **entonces** no hay ninguna variable leída en `src` que falte en el ejemplo.
   `SUPABASE_DB_URL` no se lee en `src` (la usa el seed) y se incluye igual, con esa aclaración.
6. **Dado** `.nvmrc` en la raíz con contenido `22`, **cuando** corro `nvm use`, **entonces**
   la versión activa satisface `engines.node` de [webApp/package.json](webApp/package.json).
7. **Dado** un `supabase db reset` limpio, **cuando** termina el seed, **entonces** existen en
   `auth.users` `admin@test.local`, `docente@test.local` y `alumna@test.local` con UUID fijo,
   `encrypted_password` vía `crypt(..., gen_salt('bf'))`, `email_confirmed_at = now()`,
   `raw_app_meta_data` de provider email y `on conflict (id) do nothing`, siguiendo el bloque de
   docentes de `seed.sql` (líneas 84 a 104). El trigger `on_auth_user_created` siembra `profiles`
   como `student`; un `update public.profiles set role = ...` posterior fija `admin` y `teacher`.
   La contraseña va en un comentario del seed, no en el README.
8. **Dado** los tres fixtures, **cuando** entro por `/entrar` con cada uno, **entonces** `admin@`
   llega al panel de admin, `docente@` al panel docente y `alumna@` a `/panel`.
9. **Dado** `engram/02_architecture.md`, **cuando** busco `ADR-013`, **entonces** existe, está
   `ACEPTADO`, tiene menos de 25 líneas y dice: el certificado acredita recorrido completo
   (`completed` derivada al 90% por lección, ADR-007), no acredita evaluación; el residuo de `0009`
   se acepta; si algún día el certificado tiene valor externo la respuesta es evaluación, no
   intervalos de reproducción.
10. **Dado** `/certificado/[code]` de un certificado válido, **cuando** se renderiza, **entonces**
    muestra, visible y en texto plano, la frase "Este certificado acredita el recorrido completo
    del curso, no una evaluación". Va con los componentes y tokens que hay (R-13).
11. **Dado** `README.md` en la raíz, **cuando** lo leo, **entonces** en no más de 10 líneas de
    setup dice: clonar, `nvm use`, copiar `.env.example` a `webApp/.env.local`, `npx supabase start`
    desde `webApp`, `supabase db reset`, `npm install` y `npm run dev` en `webApp`, `npm test` en
    `webApp/supabase`, y los tres usuarios de prueba por rol (sin contraseña). Apunta a
    [CLAUDE.md](CLAUDE.md) para todo lo demás; no duplica su contenido.
12. **Dado** [CLAUDE.md](CLAUDE.md), **cuando** cambia algo que describe (README, `.nvmrc`,
    fixtures), **entonces** su tabla de estado y la sección de comandos se actualizan en el mismo
    commit. CLAUDE.md equivocado es peor que ninguno.

### Cómo se verifica
```
git fetch && git branch -vv | grep auditoria            # c.1
git log origin/dev --oneline | grep 4bd9f27             # c.3
diff <(grep -rhoE "process\.env\.[A-Z_]+" webApp/src | sed 's/process.env.//' | sort -u) \
     <(grep -oE "^[A-Z_]+" webApp/.env.example | sort -u)   # c.5: sólo SUPABASE_DB_URL a la derecha
cat .nvmrc                                              # c.6
cd webApp && npx supabase db reset && psql "$SUPABASE_DB_URL" \
  -c "select email, (select role from public.profiles p where p.id = u.id) from auth.users u where email like '%@test.local'"   # c.7
cd webApp/supabase && npm test                          # sigue en verde
cd webApp && npx tsc --noEmit && npm run lint
grep -n "ADR-013" engram/02_architecture.md             # c.9
```

### Riesgo
El push expone 71 commits que nunca pasaron por otro par de ojos. Si `nerv-qa` rechaza uno de los
cuatro tickets, el merge a `dev` se demora, no se saltea: **la alternativa es mergear código sin
veredicto y eso es lo que N-01 y S-05 enseñaron a no hacer.** Segundo riesgo: los fixtures en el
seed quedan con contraseña conocida en un archivo versionado. Es aceptable mientras el seed sea sólo
local; el ticket que lleve el schema a la nube (fuera de este bloque) tiene que excluirlos.

---

## T-039 · Runner de tests para la webApp

**Agente:** `nerv-web` · **Nivel:** Strong (P-11: CÓMO obligatorio en `engram/plans/T-039.md`) ·
**Dependencias:** T-038 (fixtures en seed, `.env.example`) · **Migración:** ninguna.

### Por qué
R-14 exige prueba de rojo (P-18) desde T-039 y hoy no hay dónde escribirla: `webApp/package.json`
no tiene script `test`. La lógica de `src/lib/server/` (certificados, inscripción, player, mails)
se verifica a mano o no se verifica. El schema tiene 449 tests; la app que lo consume tiene cero.
Sin runner, cada SP siguiente nace incumpliendo R-14.

### Qué se toca
- [webApp/package.json](webApp/package.json): devDependencies y scripts `test`, `test:unit`, `test:e2e`.
- Nuevos: `webApp/vitest.config.ts`, `webApp/playwright.config.ts`, `webApp/src/**/*.test.ts`
  (unidades al lado del archivo probado), `webApp/e2e/*.spec.ts`, `webApp/e2e/fixtures.ts`
  (sesión con seed user).
- [webApp/tsconfig.json](webApp/tsconfig.json) si hace falta excluir `e2e/` del build.
- [CLAUDE.md](CLAUDE.md): sección de comandos.

### Criterios
1. **Dado** que el implementador va a fijar versiones y API de Vitest y Playwright, **cuando**
   arranca, **entonces** consulta Context7 (`resolve-library-id` + `query-docs`) para ambas y
   para su integración con Next.js 16 / React 19, y deja las versiones elegidas y la fuente en
   `engram/plans/T-039.md`. No se inventan versiones ni se copian de memoria.
2. **Dado** `webApp/vitest.config.ts`, **cuando** lo abro, **entonces** `environment: 'node'`,
   `include` cubre `src/lib/**/*.test.ts` y `src/app/**/actions.test.ts`, y el alias `@/`
   coincide con `tsconfig.json`. No hay jsdom ni testing-library: los componentes se prueban
   por Playwright, no por unidad.
3. **Dado** un módulo con `import 'server-only'`, **cuando** Vitest lo importa, **entonces** no
   explota: el config lo resuelve a un stub vacío.
4. **Dado** los clientes de [supabase-admin.ts](webApp/src/lib/server/supabase-admin.ts) y
   [supabase-public.ts](webApp/src/lib/server/supabase-public.ts), **cuando** un test de unidad
   los necesita, **entonces** los reemplaza con `vi.mock` por un doble que devuelve datos fijos.
   Ningún test de unidad abre red ni lee `.env.local`.
5. **Dado** la capa de unidad, **cuando** corro `npm run test:unit`, **entonces** hay al menos un
   test verde sobre una función pura de `src/lib/server/` (candidata: resolución de duración en
   [youtube.ts](webApp/src/lib/server/youtube.ts) o la clave de deduplicación de
   [mail/send.ts](webApp/src/lib/server/mail/send.ts)) y uno sobre una Server Action que valide
   entrada con zod y devuelva error sin tocar la base.
6. **Dado** `supabase start` y `npm run dev` levantados, **cuando** corro `npm run test:e2e`,
   **entonces** pasan tres flujos: (a) login en `/entrar` con `alumna@test.local` termina en
   `/panel` con la sesión en cookie; (b) con esa sesión, abrir una lección de un curso en el que
   la alumna está inscripta (el seed la inscribe) muestra un `iframe` cuyo `src` contiene
   `youtube.com`; (c) sin sesión, `/cursos/[slug]` de un curso publicado responde 200 con el
   título del curso en `h1`.
7. **Dado** el flujo (b), **cuando** la alumna no está inscripta, **entonces** el test afirma que
   **no** hay iframe. Es el ataque R-8 del lado del cliente; sin él, (b) sólo prueba el camino feliz.
8. **Dado** `npm test`, **cuando** lo corro sin stack levantado, **entonces** corre sólo la capa
   de unidad y termina verde; `test:e2e` falla con un mensaje que diga qué levantar, no con un
   timeout mudo. `playwright.config.ts` usa `webServer` apuntando a `npm run dev` con `reuseExistingServer`.
9. **Dado** P-18, **cuando** un ticket posterior escribe su test, **entonces** el flujo es: test
   escrito, `npm test` en rojo con el mensaje de fallo pegado en el handoff, implementación,
   `npm test` en verde. El runner tiene que hacer visible el rojo: salida en modo `--reporter`
   legible sin watch, sin `--passWithNoTests`.
10. **Dado** `npm run lint` y `npx tsc --noEmit`, **cuando** corren, **entonces** siguen verdes
    con los archivos de test incluidos en el proyecto de TypeScript.
11. **Dado** [CLAUDE.md](CLAUDE.md), **cuando** termina el ticket, **entonces** la sección de
    comandos lista `npm test`, `npm run test:unit`, `npm run test:e2e` con su precondición, y la
    tabla de estado deja de decir que la webApp no tiene tests.

### Cómo se verifica
```
cd webApp && npm run test:unit                          # c.5, c.8: verde sin stack
cd webApp && npx supabase start && npm run test:e2e     # c.6, c.7
cd webApp && npm test                                   # c.8
cd webApp && npx tsc --noEmit && npm run lint           # c.10
cd webApp/supabase && npm test                          # 449/449 intacto
grep -n "test:e2e" CLAUDE.md                            # c.11
```

### Riesgo
Playwright contra `next dev` es lento y a veces falla por compilación en caliente la primera vez
que toca una ruta; `reuseExistingServer` y un `timeout` generoso por test lo mitigan. El segundo
riesgo es que los mocks de Supabase hagan que los tests de unidad "prueben el mock": por eso el
alcance de unidad se limita a funciones puras y validación de entrada, y todo lo que toca RLS
sigue probándose en `webApp/supabase/tests/` y en el harness (R-6). Tercero: el flujo (b) depende
de que el seed tenga una lección con `video_id` real; si el seed cambia, el test debe elegir la
lección por consulta, no por slug fijo.
