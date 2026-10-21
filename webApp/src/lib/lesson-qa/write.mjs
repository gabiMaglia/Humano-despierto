/**
 * Escritura del Q&A por leccion (T-030). Modulo plano, sin `server-only` ni Next, por el mismo
 * motivo que `lib/reviews/write.mjs`: la suite de la base lo importa y lo corre contra PGlite con
 * el SQL que emite PostgREST.
 *
 * Ninguna funcion re-autoriza: quien puede lo deciden RLS, grants y los guards de la migracion.
 * Aca solo se elige el camino que no pide permisos inexistentes y se traduce el error.
 */

/** Marca que comparten los `raise` de localizador (`guard_locator_exacto`, 0025). */
const MARCA_LOCALIZADOR = 'localizador de contenido pago';

/** No es un SQLSTATE: "la sentencia corrio y no toco ninguna fila" (RLS la filtro). */
export const SIN_FILAS = 'NO_ROWS';

/**
 * @typedef {{ code?: string | null; message: string }} ErrorDb
 * @typedef {{ error: ErrorDb | null; id: string | null }} Resultado
 */

/**
 * Una escritura que no alcanzo ninguna fila no es un exito: una docente ajena no ve la fila y el
 * UPDATE vuelve vacio y sin error. Por eso todo lo que modifica pide `returning`.
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
 * Sin `course_id`: no tiene grant de INSERT y lo deriva el trigger desde la leccion.
 * @param {any} supabase
 * @param {{ lessonId: string; authorId: string; title: string; body: string }} input
 */
export function preguntar(supabase, { lessonId, authorId, title, body }) {
  return filaUnica(
    supabase.from('lesson_questions').insert({ lesson_id: lessonId, author_id: authorId, title, body }).select('id'),
    'la pregunta',
  );
}

/**
 * Sin `is_instructor_answer`: lo calcula el trigger desde `author_id`.
 * @param {any} supabase
 * @param {{ questionId: string; authorId: string; body: string }} input
 */
export function responder(supabase, { questionId, authorId, body }) {
  return filaUnica(
    supabase.from('lesson_answers').insert({ question_id: questionId, author_id: authorId, body }).select('id'),
    'la respuesta',
  );
}

/**
 * @param {any} supabase
 * @param {{ questionId: string; userId: string }} input
 * @returns {Promise<{ error: ErrorDb | null }>}
 */
export async function votar(supabase, { questionId, userId }) {
  const r = await supabase.from('lesson_question_votes').insert({ question_id: questionId, user_id: userId });
  return { error: r.error ?? null };
}

/**
 * @param {any} supabase
 * @param {{ questionId: string; userId: string }} input
 */
export function quitarVoto(supabase, { questionId, userId }) {
  return filaUnica(
    supabase
      .from('lesson_question_votes')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .select('question_id'),
    'el voto',
  );
}

/**
 * La hora y la firma las pone el guard; el valor que se manda solo dice "resuelta o no".
 * @param {any} supabase
 * @param {{ questionId: string; resolved: boolean }} input
 */
export function marcarResuelta(supabase, { questionId, resolved }) {
  return filaUnica(
    supabase
      .from('lesson_questions')
      .update({ resolved_at: resolved ? new Date().toISOString() : null })
      .eq('id', questionId)
      .select('id'),
    'la pregunta',
  );
}

/**
 * @param {any} supabase
 * @param {{ answerId: string; featured: boolean }} input
 */
export function destacar(supabase, { answerId, featured }) {
  return filaUnica(
    supabase
      .from('lesson_answers')
      .update({ featured_at: featured ? new Date().toISOString() : null })
      .eq('id', answerId)
      .select('id'),
    'la respuesta',
  );
}

const MODERABLES = new Set(['lesson_questions', 'lesson_answers']);

/**
 * @param {any} supabase
 * @param {{ tabla: string; id: string; moderatorId: string; reason: string }} input
 */
export function moderar(supabase, { tabla, id, moderatorId, reason }) {
  // El nombre de tabla termina en el SQL: una whitelist, no confianza en quien llama.
  if (!MODERABLES.has(tabla)) throw new Error(`tabla no moderable: ${tabla}`);
  return filaUnica(
    supabase
      .from(tabla)
      .update({ deleted_at: new Date().toISOString(), deleted_by: moderatorId, deleted_reason: reason })
      .eq('id', id)
      .select('id'),
    'el mensaje',
  );
}

/**
 * @param {ErrorDb | null | undefined} error
 * @param {{ duplicado: string; fallback: string }} textos
 * @returns {string}
 */
export function traducirErrorQa(error, { duplicado, fallback }) {
  const code = error?.code;
  if (code === '42501') {
    if ((error?.message ?? '').includes(MARCA_LOCALIZADOR)) {
      return 'El texto contiene el identificador de un video o archivo del curso. Ese dato es de contenido pago y no puede aparecer acá.';
    }
    return 'No tenés permiso para hacer esto en esta lección.';
  }
  if (code === '23514') return 'El texto no puede contener links.';
  if (code === '23505') return duplicado;
  if (code === SIN_FILAS) return 'No encontramos ese mensaje en esta lección.';
  return fallback;
}
