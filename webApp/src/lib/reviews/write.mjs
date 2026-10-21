/**
 * Escritura de reseñas desde la app (T-028). Módulo plano, sin `server-only` ni Next, por el mismo
 * motivo que `validation/locator.mjs`: el test de la base IMPORTA estas funciones y las corre
 * contra PGlite con un cliente que emite el SQL de PostgREST. La ronda 1 tenía la lógica inline
 * en la action y 449 tests verdes mientras ni la primera reseña se podía crear.
 *
 * Ninguna función re-autoriza: quién puede lo decide RLS + grants + guard. Acá solo se elige el
 * camino que no pide permisos inexistentes y se traduce el error.
 */

/** Marca que comparten los `raise exception` de localizador (0024/0026 `guard_course_reviews`,
 *  0025 `guard_locator_exacto`). Todo 42501 sin ella es un permiso, no un video. */
const MARCA_LOCALIZADOR = 'localizador de contenido pago';

/** No es un SQLSTATE: es el caso "la sentencia corrió y no tocó ninguna fila". */
export const SIN_FILAS = 'NO_ROWS';

/**
 * @typedef {{ code?: string | null; message: string }} ErrorDb
 * @typedef {{ error: ErrorDb | null; created?: boolean }} ResultadoEscritura
 */

/**
 * Crea la reseña y, si ya existe (23505), edita `rating`/`body`. NO usa `upsert`: PostgREST lo
 * traduce a `ON CONFLICT DO UPDATE SET` sobre TODAS las columnas del payload, incluidas
 * `user_id`/`course_id`, que no tienen grant de UPDATE (a propósito: con ese grant una reseña se
 * podría mover a otro curso) -> 42501 siempre.
 *
 * @param {any} supabase cliente de sesión (supabase-js)
 * @param {{ courseId: string; userId: string; rating: number; body: string | null }} input
 * @returns {Promise<ResultadoEscritura>}
 */
export async function guardarResena(supabase, { courseId, userId, rating, body }) {
  const ins = await supabase
    .from('course_reviews')
    .insert({ course_id: courseId, user_id: userId, rating, body });
  if (!ins.error) return { error: null, created: true };
  if (ins.error.code !== '23505') return { error: ins.error };

  const upd = await supabase
    .from('course_reviews')
    .update({ rating, body })
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .select('id');
  if (upd.error) return { error: upd.error };
  if (!upd.data || upd.data.length === 0) {
    return { error: { code: SIN_FILAS, message: 'la reseña no se encontró' } };
  }
  return { error: null, created: false };
}

/**
 * La guía dueña responde. Manda SOLO el texto: quién firma y cuándo lo estampa el guard (0026).
 * Una guía que no es dueña no ve la fila en RLS y el UPDATE afecta 0 filas SIN error; por eso se
 * pide `id` de vuelta y 0 filas es un error, no un "Respuesta publicada".
 *
 * @param {any} supabase
 * @param {{ reviewId: string; response: string }} input
 * @returns {Promise<ResultadoEscritura>}
 */
export async function responderResena(supabase, { reviewId, response }) {
  const upd = await supabase
    .from('course_reviews')
    .update({ response })
    .eq('id', reviewId)
    .select('id');
  if (upd.error) return { error: upd.error };
  if (!upd.data || upd.data.length === 0) {
    return { error: { code: SIN_FILAS, message: 'la reseña no es de un curso tuyo' } };
  }
  return { error: null };
}

/**
 * @param {ErrorDb | null | undefined} error
 * @param {string} fallback
 * @returns {string}
 */
export function traducirErrorResena(error, fallback) {
  const code = error?.code;
  if (code === '42501') {
    if ((error?.message ?? '').includes(MARCA_LOCALIZADOR)) {
      return 'El texto contiene el identificador de un video o archivo del curso. Ese dato es de contenido pago y no puede aparecer en una reseña, que se lee sin inscripción.';
    }
    return 'No tenés permiso para hacer esto. Si creés que es un error, volvé a iniciar sesión.';
  }
  if (code === '23514') return 'El texto no puede contener links.';
  if (code === '23505') return 'Ya dejaste una reseña de este curso. Editá la que tenés.';
  if (code === SIN_FILAS) return 'No encontramos esa reseña en tus cursos.';
  return fallback;
}
