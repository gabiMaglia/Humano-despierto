// Cliente minimo con la forma de supabase-js que emite el MISMO SQL que PostgREST para cada metodo
// del query builder. Nacio local en course-reviews-app.test.mjs (T-028 r2: el upsert real daba
// 42501 y la suite estaba verde porque nunca ejecutaba lo que manda la app). T-030 lo necesita
// igual, asi que vive aca.
import { asUser, attempt } from './db.mjs';

export function clientePostgrest(db, actor) {
  const run = (sql, params) =>
    asUser(db, actor, async () => {
      const r = await attempt(db, sql, params);
      return r.ok ? { data: r.rows, error: null } : { data: null, error: { code: r.code, message: r.message } };
    });

  const where = (filtros, offset) =>
    filtros.length ? ` where ${filtros.map(([c], i) => `${c} = $${offset + i + 1}`).join(' and ')}` : '';

  // El SQL se arma recien en `then`: `.eq()`/`.select()`/`.single()` se pueden encadenar en
  // cualquier orden, igual que en supabase-js.
  const builder = (armar) => {
    const filtros = [];
    let returning = '';
    let single = false;
    const b = {
      eq(col, v) {
        filtros.push([col, v]);
        return b;
      },
      select(cols) {
        returning = ` returning ${cols}`;
        return b;
      },
      single() {
        single = true;
        return b;
      },
      then(resolve, reject) {
        const [sql, params] = armar(filtros, returning);
        return run(sql, params)
          .then((r) => {
            if (!single || r.error) return r;
            return r.data.length === 1
              ? { data: r.data[0], error: null }
              : { data: null, error: { code: 'PGRST116', message: `se esperaba 1 fila y hubo ${r.data.length}` } };
          })
          .then(resolve, reject);
      },
    };
    return b;
  };

  return {
    from(table) {
      return {
        insert(row) {
          const cols = Object.keys(row);
          return builder((_, ret) => [
            `insert into public.${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})${ret}`,
            Object.values(row),
          ]);
        },
        // PostgREST traduce upsert a ON CONFLICT DO UPDATE SET sobre TODAS las columnas del payload.
        upsert(row, { onConflict }) {
          const cols = Object.keys(row);
          return builder((_, ret) => [
            `insert into public.${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
             on conflict (${onConflict}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}${ret}`,
            Object.values(row),
          ]);
        },
        update(vals) {
          const sets = Object.keys(vals);
          return builder((filtros, ret) => [
            `update public.${table} set ${sets.map((c, i) => `${c} = $${i + 1}`).join(', ')}${where(filtros, sets.length)}${ret}`,
            [...Object.values(vals), ...filtros.map(([, v]) => v)],
          ]);
        },
        delete() {
          return builder((filtros, ret) => [
            `delete from public.${table}${where(filtros, 0)}${ret}`,
            filtros.map(([, v]) => v),
          ]);
        },
      };
    },
  };
}
