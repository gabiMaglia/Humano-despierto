# webApp/supabase

Migraciones (`migrations/`), seeds locales, tests de schema (`tests/`, PGlite) y harness HTTP (`harness/`).

## Qué corre dónde

| Archivo | Local (`supabase db reset`) | Nube |
|---|---|---|
| `migrations/*.sql` | sí | sí, con `supabase db push` |
| `seed.sql` | sí (`[db.seed] sql_paths`) | **no** |
| `seed.fixtures.sql` | sí (`[db.seed] sql_paths`) | **no** |
| `demo.sql` | a mano, después del seed | **no** |

`seed.sql` es contenido de muestra (catálogo, currículum, docentes `@seed.humano.local` con clave
`seed-teacher-1234`, ids de video marcados `SEED_PLACEHOLDER`). `seed.fixtures.sql` son las cuentas
`@test.local` con clave conocida que usan los e2e. `demo.sql` agrega alumnas, reseñas y anuncios para
la demo. Los tres traen cuentas con contraseña pública: ninguno va a producción (D-22).

## Checklist de nube

1. Aplicar sólo migraciones: `supabase db push`. No hay seed de producción: `db push` no siembra y
   estos tres archivos no se pasan a mano. En producción las docentes entran por invitación (T-049)
   y el contenido lo carga cada docente desde el panel.
2. Si algún día hace falta un `supabase db reset` contra un entorno remoto, sacar `seed.sql` y
   `seed.fixtures.sql` de `sql_paths` antes (o usar otro `config.toml`): resetear con ellos
   plantaría cuentas con clave conocida, una de ellas admin (`admin@test.local`).
3. Verificar que `auth.users` no tenga ningún `@test.local` ni `@seed.humano.local` ni `@demo.humano`.
4. Re-correr `harness/b1-postgrest-attacks.sh` contra la instancia (PGlite no ejecuta PostgREST).
5. Ajustes de Auth, mail y OAuth: ver "External dependencies" en el `CLAUDE.md` de la raíz y la
   lista de nube del engram (`secure_password_change`, `additional_redirect_urls`, hook de JWT,
   SPF/DKIM del dominio de `MAIL_FROM_ADDRESS`, Google OAuth con `redirect_uri` de producción).

## Reglas de migraciones

- **Timestamp al arrancar, no por adelantado (D-39).** `0032` tiene un timestamp menor que `0031`
  porque se reservó el número antes de escribirla: en un reset corre antes. Hoy son independientes y
  no se renumera (ya están aplicadas). Con ramas paralelas, el timestamp se asigna cuando se crea el
  archivo, no cuando se reserva el número.
- Los grants son una lista blanca por columna (`0003_privileges.sql`); ver `CLAUDE.md`.

## Trampa conocida: symlinks en `node_modules` (D-11)

Dos symlinks autorreferenciales (`webApp/node_modules/node_modules` y el equivalente en
`webApp/supabase/`), creados por el setup de un worktree, hacían entrar en pánico a Turbopack, y por
eso `--webpack` figuraba en `dev` sin explicación. Ya no existen y ningún script del repo los crea.
Si `npm run dev` vuelve a entrar en pánico al resolver módulos, buscar con
`find webApp -maxdepth 3 -type l -name node_modules` y borrarlos; no volver a agregar `--webpack`.
