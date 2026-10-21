/**
 * Escritura de anuncios (T-031). Modulo plano, sin `server-only` ni Next, por el mismo motivo que
 * `lib/reviews/write.mjs`: la suite de la base lo importa y lo corre contra PGlite con el SQL que
 * emite PostgREST.
 *
 * Ninguna funcion re-autoriza: quien puede lo deciden RLS, grants y los triggers de la migracion.
 * `publicar` recibe el cliente de service_role; quien la llama ya verifico la titularidad.
 */

/** Marca que comparten los `raise` de localizador (`guard_locator_exacto`, 0025). */
const MARCA_LOCALIZADOR = 'localizador de contenido pago';
/** Marca del congelado de lo publicado (`course_announcements_freeze_published`). */
const MARCA_CONGELADO = 'ya salio por mail';

/** No es un SQLSTATE: "la sentencia corrio y no toco ninguna fila" (RLS la filtro, o ya no era borrador). */
export const SIN_FILAS = 'NO_ROWS';

/**
 * @typedef {{ code?: string | null; message: string }} ErrorDb
 * @typedef {{ error: ErrorDb | null; id: string | null }} Resultado
 */

/**
 * Una escritura que no alcanzo ninguna fila no es un exito: por eso todo pide `returning`.
 * @param {PromiseLike<{ data: any; error: ErrorDb | null }>} consulta
 * @param {string} que
 * @returns {Promise<Resultado>}
 */
async function filaUnica(consulta, que) {
  const r = await consulta;
  if (r.error) return { error: r.error, id: null };
  const filas = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
  if (filas.length === 0) return { error: { code: SIN_FILAS, message: `${que} no se encontro` }, id: null };
  return { error: null, id: filas[0].id ?? null };
}

/**
 * Sin `status`: no tiene grant y la fila nace borrador.
 * @param {any} supabase cliente de sesion
 * @param {{ courseId: string; authorId: string; title: string; body: string }} input
 */
export function crearBorrador(supabase, { courseId, authorId, title, body }) {
  return filaUnica(
    supabase.from('course_announcements').insert({ course_id: courseId, author_id: authorId, title, body }).select('id'),
    'el anuncio',
  );
}

/**
 * @param {any} supabase cliente de sesion
 * @param {{ id: string; courseId: string; title: string; body: string }} input
 */
export function editarBorrador(supabase, { id, courseId, title, body }) {
  return filaUnica(
    supabase.from('course_announcements').update({ title, body }).eq('id', id).eq('course_id', courseId).select('id'),
    'el anuncio',
  );
}

/**
 * `status = 'draft'` en el filtro: publicar dos veces no es un segundo evento. `published_at` lo
 * pone `sync_published_at`.
 * @param {any} service cliente de service_role
 * @param {{ id: string; courseId: string }} input
 */
export function publicar(service, { id, courseId }) {
  return filaUnica(
    service
      .from('course_announcements')
      .update({ status: 'published' })
      .eq('id', id)
      .eq('course_id', courseId)
      .eq('status', 'draft')
      .select('id'),
    'el borrador',
  );
}

/**
 * @param {any} supabase cliente de sesion (el guard firma con auth.uid(), ADR-012)
 * @param {{ id: string; moderatorId: string; reason: string }} input
 */
export function retirar(supabase, { id, moderatorId, reason }) {
  return filaUnica(
    supabase
      .from('course_announcements')
      .update({ deleted_at: new Date().toISOString(), deleted_by: moderatorId, deleted_reason: reason })
      .eq('id', id)
      .select('id'),
    'el anuncio',
  );
}

/**
 * @param {ErrorDb | null | undefined} error
 * @param {string} fallback
 * @returns {string}
 */
export function traducirErrorAnuncio(error, fallback) {
  const code = error?.code;
  const message = error?.message ?? '';
  if (code === '42501') {
    if (message.includes(MARCA_LOCALIZADOR)) {
      return 'El texto contiene el identificador de un video o archivo del curso. Ese dato es de contenido pago y no puede aparecer en un anuncio.';
    }
    if (message.includes(MARCA_CONGELADO)) {
      return 'Ese anuncio ya se envió por mail y no se puede editar. Si hace falta corregirlo, retiralo y publicá uno nuevo.';
    }
    return 'No tenés permiso para hacer esto en este curso.';
  }
  if (code === '23514') return 'El texto no puede contener links.';
  if (code === SIN_FILAS) return 'No encontramos ese anuncio, o ya no es un borrador.';
  return fallback;
}
