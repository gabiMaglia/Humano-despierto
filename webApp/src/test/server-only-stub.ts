// `server-only` lanza si se importa fuera de un entorno de servidor de Next. En Vitest no hay
// tal entorno; el stub vacio deja importar los modulos de `src/lib/server/` sin tocar su codigo.
export {};
