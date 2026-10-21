// T-042 · telefono, fecha de nacimiento y avatar (D6). Lo que el cliente puede y lo que no.
//
// POR QUE UN ARCHIVO PROPIO. `phone` y `birth_date` son la primera PII de `profiles` que NO es
// publica, y `profiles_read_public` deja leer las filas de docentes a cualquiera. Las barreras son
// tres y cada una tiene su control de mutacion al final: sin grant de SELECT (ni la duena las lee
// por select directo), RLS en el UPDATE (otra usuaria no las escribe) y `my_private_profile()`
// como unica lectura. El avatar suma un guard de carpeta (ADR-011) y un CHECK de forma que lo mete
// en la clase de ADR-009.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const TEL_DOCENTE = '+54 11 4000-0000';
const ARCHIVO = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const avatarDe = (uid, ext = 'jpg') => `avatars/${uid}/${ARCHIVO}.${ext}`;

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asTeacher = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);
const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

const sembrarPrivados = (db) =>
  db.query(`update public.profiles set phone = $1, birth_date = '1985-03-21' where id = $2`, [
    TEL_DOCENTE,
    ID.teacherA,
  ]);

const telefonoDeLaDocente = async (db) =>
  (await db.query(`select phone from public.profiles where id = $1`, [ID.teacherA])).rows[0].phone;

describe('T-042 · datos privados del perfil', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await sembrarPrivados(db);
  });

  after(async () => db?.close());

  describe('c.3 · grants por columna', () => {
    test('ni anon ni authenticated tienen SELECT sobre phone ni birth_date', async () => {
      const r = await db.query(`
        select r.rol || '.' || c.col as par
          from (values ('anon'), ('authenticated')) as r(rol),
               (values ('phone'), ('birth_date')) as c(col)
         where has_column_privilege(r.rol, 'public.profiles', c.col, 'SELECT')`);
      assert.deepEqual(r.rows.map((x) => x.par), []);
    });

    test('avatar_path se lee sin sesion; las tres columnas nuevas solo las escribe authenticated', async () => {
      const r = await db.query(`
        select has_column_privilege('anon', 'public.profiles', 'avatar_path', 'SELECT') as anon_lee,
               has_column_privilege('anon', 'public.profiles', 'avatar_path', 'UPDATE') as anon_escribe,
               has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE')
                 and has_column_privilege('authenticated', 'public.profiles', 'birth_date', 'UPDATE')
                 and has_column_privilege('authenticated', 'public.profiles', 'avatar_path', 'UPDATE') as auth_escribe`);
      assert.deepEqual(r.rows[0], { anon_lee: true, anon_escribe: false, auth_escribe: true });
    });

    test('otra sesion no lee el telefono de la docente: 42501, no cero filas', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select phone from public.profiles where id = $1`, [ID.teacherA]),
      );
      assert.equal(r.ok, false, 'el telefono de la docente se leyo desde otra sesion');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('anon tampoco lee fechas de nacimiento', async () => {
      const r = await asAnon(db, () => attempt(db, `select birth_date from public.profiles`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni la duena por select directo: su unica via es my_private_profile()', async () => {
      const r = await asTeacher(db, () =>
        attempt(db, `select phone from public.profiles where id = $1`, [ID.teacherA]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });
  });

  describe('c.2 · otra usuaria no me cambia el telefono', () => {
    test('el UPDATE sobre la fila ajena afecta cero filas y el valor sigue', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.profiles set phone = '+54 9 0000-0000' where id = $1 returning id`, [
          ID.teacherA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'el UPDATE alcanzo la fila de otra persona');
      assert.equal(await telefonoDeLaDocente(db), TEL_DOCENTE);
    });

    test('control positivo: la duena cambia el suyo y lo vacia', async () => {
      const cambiar = await asTeacher(db, () =>
        attempt(db, `update public.profiles set phone = '+54 9 11 5555-0000' where id = $1 returning id`, [
          ID.teacherA,
        ]),
      );
      assert.equal(cambiar.ok, true, cambiar.message);
      assert.equal(cambiar.rows.length, 1);
      const vaciar = await asTeacher(db, () =>
        attempt(db, `update public.profiles set phone = null where id = $1 returning id`, [ID.teacherA]),
      );
      assert.equal(vaciar.ok, true, vaciar.message);
      assert.equal(vaciar.rows.length, 1);
      await sembrarPrivados(db);
    });
  });

  describe('c.4 · my_private_profile()', () => {
    test('la duena recibe su telefono y su fecha', async () => {
      const r = await asTeacher(db, () =>
        attempt(db, `select phone, birth_date::text as birth_date from public.my_private_profile()`),
      );
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(r.rows, [{ phone: TEL_DOCENTE, birth_date: '1985-03-21' }]);
    });

    test('otra sesion recibe SU fila, nunca la de la docente', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select phone, birth_date::text as birth_date from public.my_private_profile()`),
      );
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(r.rows, [{ phone: null, birth_date: null }]);
    });

    test('anon no tiene EXECUTE', async () => {
      const r = await asAnon(db, () => attempt(db, `select * from public.my_private_profile()`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });
  });

  describe('c.5 · avatar_path: guard de carpeta y forma', () => {
    test('apuntar el avatar al archivo de otra docente se rechaza', async () => {
      const r = await asTeacher(db, () =>
        attempt(db, `update public.profiles set avatar_path = $1 where id = $2`, [avatarDe(ID.teacherB), ID.teacherA]),
      );
      assert.equal(r.ok, false, 'el avatar quedo apuntando a la carpeta de otra persona');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('camino legitimo: carpeta propia y despues null', async () => {
      const poner = await asTeacher(db, () =>
        attempt(db, `update public.profiles set avatar_path = $1 where id = $2 returning avatar_path`, [
          avatarDe(ID.teacherA, 'webp'),
          ID.teacherA,
        ]),
      );
      assert.equal(poner.ok, true, poner.message);
      assert.deepEqual(poner.rows, [{ avatar_path: avatarDe(ID.teacherA, 'webp') }]);
      const sacar = await asTeacher(db, () =>
        attempt(db, `update public.profiles set avatar_path = null where id = $1 returning id`, [ID.teacherA]),
      );
      assert.equal(sacar.ok, true, sacar.message);
      assert.equal(sacar.rows.length, 1);
    });

    test('service_role tampoco: es un invariante, no un permiso (ADR-011)', async () => {
      const r = await asService(db, () =>
        attempt(db, `update public.profiles set avatar_path = $1 where id = $2`, [avatarDe(ID.teacherB), ID.teacherA]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('en la carpeta propia, un nombre que no es uuid o una extension fuera de lista violan el CHECK', async () => {
      for (const ruta of [`avatars/${ID.teacherA}/foto.jpg`, avatarDe(ID.teacherA, 'gif')]) {
        const r = await asTeacher(db, () =>
          attempt(db, `update public.profiles set avatar_path = $1 where id = $2`, [ruta, ID.teacherA]),
        );
        assert.equal(r.ok, false, `${ruta} entro`);
        assert.equal(r.code, CHECK_VIOLATION, `${ruta} fallo por otra razon: ${r.message}`);
      }
    });
  });

  describe('formato de telefono y fecha', () => {
    // El espejo zod acepta un codigo de area entre parentesis; si el CHECK no, la persona ve un
    // 23514 crudo con un telefono que el formulario dio por bueno.
    test('un telefono con codigo de area entre parentesis entra', async () => {
      const r = await asTeacher(db, () =>
        attempt(db, `update public.profiles set phone = '(011) 4000-0000' where id = $1 returning id`, [ID.teacherA]),
      );
      assert.equal(r.ok, true, r.message);
      await sembrarPrivados(db);
    });

    test('un telefono con letras viola el CHECK', async () => {
      const r = await asTeacher(db, () =>
        attempt(db, `update public.profiles set phone = 'llamame al fijo' where id = $1`, [ID.teacherA]),
      );
      assert.equal(r.code, CHECK_VIOLATION, r.message);
    });

    test('una fecha futura o anterior a 1900 viola el CHECK', async () => {
      for (const fecha of ['2999-01-01', '1899-12-31']) {
        const r = await asTeacher(db, () =>
          attempt(db, `update public.profiles set birth_date = $1 where id = $2`, [fecha, ID.teacherA]),
        );
        assert.equal(r.code, CHECK_VIOLATION, `${fecha}: ${r.message}`);
      }
    });
  });

  describe('c.9 · nombre y bio siguen bajo ADR-009/010', () => {
    test('un link en la bio lo frena el CHECK de forma', async () => {
      const r = await asTeacher(db, () =>
        attempt(db, `update public.profiles set bio = $1 where id = $2`, [
          'Material en drive.google.com/file/d/LEAKED123',
          ID.teacherA,
        ]),
      );
      assert.equal(r.code, CHECK_VIOLATION, r.message);
    });

    test('el video_id real en el nombre lo frena el guard exacto', async () => {
      const r = await asTeacher(db, () =>
        attempt(db, `update public.profiles set full_name = $1 where id = $2`, [`Sol ${SECRET.videoId}`, ID.teacherA]),
      );
      assert.equal(r.code, PRIV_DENIED, r.message);
    });
  });
});

// Cada control revierte UNA barrera y exige que su ataque pase. Sin esto, los verdes de arriba no
// distinguen "la barrera funciona" de "el ataque estaba mal escrito".
describe('T-042 · controles de mutacion', () => {
  test('con grant de SELECT sobre phone, anon lee el telefono de la docente', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`grant select (phone, birth_date) on public.profiles to anon, authenticated;`],
    });
    try {
      await seed(db);
      await sembrarPrivados(db);
      const r = await asAnon(db, () =>
        attempt(db, `select phone from public.profiles where id = $1`, [ID.teacherA]),
      );
      assert.equal(r.ok, true, 'con el grant el ataque deberia pasar; si no pasa, c.3 no esta probando el grant');
      assert.equal(r.rows[0]?.phone, TEL_DOCENTE);
    } finally {
      await db.close();
    }
  });

  test('con una policy de UPDATE abierta, otra usuaria si cambia el telefono', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `drop policy profiles_update_self on public.profiles;
         create policy regresion_update on public.profiles for update to authenticated using (true) with check (true);`,
      ],
    });
    try {
      await seed(db);
      await sembrarPrivados(db);
      const r = await asStudent(db, () =>
        attempt(db, `update public.profiles set phone = '+54 9 0000-0000' where id = $1 returning id`, [
          ID.teacherA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'sin la policy acotada el ataque deberia alcanzar la fila');
    } finally {
      await db.close();
    }
  });

  test('sin el guard de carpeta, el avatar apunta al archivo ajeno', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`drop trigger profiles_avatar_path_guard on public.profiles;`],
    });
    try {
      await seed(db);
      const r = await asTeacher(db, () =>
        attempt(db, `update public.profiles set avatar_path = $1 where id = $2`, [avatarDe(ID.teacherB), ID.teacherA]),
      );
      assert.equal(r.ok, true, 'sin el trigger el ataque deberia pasar; si no pasa, c.5 no esta probando el guard');
    } finally {
      await db.close();
    }
  });
});
