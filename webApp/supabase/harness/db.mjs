import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const here = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = join(here, '..', 'migrations');
export const BASELINE_SQL = join(here, '00_supabase_baseline.sql');

/**
 * Levanta un Postgres efimero con la linea de base de Supabase + todas las migraciones.
 * `extraBaseline` permite inyectar SQL despues de las migraciones para simular una
 * regresion (ver el control negativo del test).
 */
export async function bootDatabase({ afterMigrations = [] } = {}) {
  const db = await PGlite.create();
  await db.exec(await readFile(BASELINE_SQL, 'utf8'));

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error('no hay migraciones en supabase/migrations');
  for (const file of files) {
    try {
      await db.exec(await readFile(join(MIGRATIONS_DIR, file), 'utf8'));
    } catch (error) {
      throw new Error(`migracion ${file} fallo: ${error.message}`);
    }
  }
  for (const sql of afterMigrations) await db.exec(sql);
  return { db, migrations: files };
}

/** Vuelve al rol dueño (equivalente a cerrar la conexion de PostgREST). */
export async function asOwner(db) {
  await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
}

/**
 * Ejecuta `fn` como lo haria PostgREST para un usuario logueado:
 * fija los claims del JWT en el GUC y hace SET ROLE al rol del token.
 */
export async function asUser(db, { sub, role = 'authenticated', userRole }, fn) {
  const claims = { sub, role, user_role: userRole, aud: 'authenticated' };
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(claims)]);
  await db.exec(`set role ${role};`);
  try {
    return await fn();
  } finally {
    await asOwner(db);
  }
}

export async function asAnon(db, fn) {
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ role: 'anon' })]);
  await db.exec(`set role anon;`);
  try {
    return await fn();
  } finally {
    await asOwner(db);
  }
}

/** Devuelve {ok:false, code} si la sentencia fue rechazada, {ok:true} si paso. */
export async function attempt(db, sql, params = []) {
  try {
    const res = await db.query(sql, params);
    return { ok: true, rows: res.rows ?? [] };
  } catch (error) {
    return { ok: false, code: error.code ?? null, message: error.message };
  }
}
