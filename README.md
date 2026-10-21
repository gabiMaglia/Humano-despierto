# Humano Despierto

Escuela online de oficios holísticos. Next.js 16 + Supabase. Todo el detalle está en [CLAUDE.md](CLAUDE.md).

## Setup local

1. `git clone` y `cd Humano-despierto`
2. `nvm use` (Node 22)
3. `cp webApp/.env.example webApp/.env.local` y completar los secretos
4. `cd webApp && npm install`
5. `npx supabase start` (necesita Docker o colima corriendo)
6. `npx supabase db reset` (aplica migraciones y seed)
7. `npm run dev` y abrir http://localhost:3000
8. Tests del schema: `cd supabase && npm install && npm test`

Usuarios de prueba (la contraseña está en el seed): `admin@test.local` (admin) · `docente@test.local` (docente) · `alumna@test.local` (alumna).
