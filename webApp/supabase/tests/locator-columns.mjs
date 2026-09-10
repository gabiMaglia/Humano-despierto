// ADR-009 · La definicion de "columna de texto libre del catalogo", en UN solo lugar.
//
// POR QUE ESTE ARCHIVO EXISTE. La mitad de FORMA (locator-free-text.test.mjs) y la mitad EXACTA
// (locator-exact-invariant.test.mjs) necesitan la MISMA lista de columnas. Con una copia en cada
// archivo, el dia que alguien ajuste el recorte en uno los dos invariantes dejan de hablar de lo
// mismo -- y un invariante que cubre distinto que el otro no es un invariante, es una opinion.
//
// El recorte: columnas de texto que `anon` puede LEER y un rol de cliente puede ESCRIBIR. Esa
// conjuncion es la clase de riesgo de ADR-009: si `anon` no la lee, no hay fuga; si el cliente no
// la escribe, no hay vector.

/**
 * @param {import('@electric-sql/pglite').PGlite} db
 * @returns {Promise<Array<{columna: string, cubierta: boolean}>>}
 *   `columna` con formato "tabla.col". `cubierta` indica si un CHECK `%_no_locator` la incluye
 *   -- es la mitad de FORMA. La mitad EXACTA no se puede leer del catalogo (vive en un trigger
 *   plpgsql), y por eso su invariante la PRUEBA en vez de consultarla.
 */
export const columnasDeLaClase = async (db) =>
  (
    await db.query(`
      with cols as (
        select c.relname as tabla, a.attname as col, c.oid as reloid, a.attnum
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
        where c.relkind = 'r'
          and format_type(a.atttypid, a.atttypmod) ~ 'text|char'
      )
      select tabla || '.' || col as columna,
             exists (
               select 1 from pg_constraint k
               where k.conrelid = cols.reloid
                 and k.contype = 'c'
                 and k.conname like '%\\_no\\_locator'
                 and cols.attnum = any (k.conkey)
             ) as cubierta
      from cols
      where has_column_privilege('anon', reloid, attnum, 'SELECT')
        and (has_column_privilege('authenticated', reloid, attnum, 'UPDATE')
          or has_column_privilege('authenticated', reloid, attnum, 'INSERT'))
      order by 1
    `)
  ).rows;
