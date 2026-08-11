/**
 * El predicado de localizadores (ADR-009), en UN solo lugar.
 *
 * Es el espejo del `CHECK` de la DB (`public.text_has_locator`, migraciones 0008 y 0010).
 * Vive en un módulo plano —no en el `.ts`— para que el test de paridad **ejecute esta
 * misma función** en vez de leer el archivo fuente y reconstruirla.
 *
 * POR QUE. Antes esto vivía dentro de `teacher.ts` y el test lo reconstruía parseando el
 * texto del archivo. Esa forma falló dos veces seguidas: primero porque una de las cuatro
 * reglas estaba copiada a mano dentro del test, y después —ya con las cuatro leídas del
 * fuente— porque el parser solo entendía las reglas del array: una regla nueva con la
 * forma de la heurística de abajo quedaba invisible **sin ningún error**, y el meta-test
 * seguía en verde prometiendo lo contrario.
 *
 * La lección: **reconstruir una definición es tener dos definiciones.** Mientras el test
 * arme su propia copia del predicado, por más fielmente que la arme, hay una superficie
 * donde las dos pueden separarse en silencio. Importar la función real elimina esa
 * superficie: si alguien agrega una quinta regla acá, el test la ejercita porque es
 * literalmente el mismo código.
 *
 * Lo que sigue sin poder garantizarse desde acá —y no hay forma de que se garantice
 * solo— es que este predicado y el SQL digan lo mismo. Para eso está
 * `supabase/tests/locator-parity.test.mjs`, que corre los dos sobre el mismo corpus.
 */

export const LOCATOR_PATTERNS = [
  /:\/\//,
  /(^|[^a-z0-9])www\./i,
  // Espejo EXACTO de la migracion 0010. Dos cosas, y confundirlas ya costo un bug:
  //
  //  1. La alternancia de TLD va en minuscula y sin /i, a proposito: un dominio pegado
  //     viene en minuscula y el typo de prosa castellana ("termina.Me parece")
  //     capitaliza porque arranca oracion. Sin eso se bloquea texto legitimo.
  //  2. Las clases de alrededor SI cubren mayusculas — [A-Za-z0-9] y [^A-Za-z], no
  //     [a-z0-9]/[^a-z]. En SQL, pasar de ~* a ~ NO toca las clases POSIX
  //     [[:alnum:]]/[[:alpha:]], que siempre incluyen ambos casos. Al sacar /i aca sin
  //     ajustar las clases, "PDF.com/x" quedaba bloqueado por la DB y aceptado por el
  //     cliente: la direccion peligrosa. Son operaciones distintas, no la misma.
  /[A-Za-z0-9]\.(com|net|org|io|co|app|dev|edu|gov|info|me|be|ly|gl|nz|cloud|link|site|online|page|xyz|tv)([^A-Za-z]|$)/,
];

/**
 * true si el texto parece contener un localizador (URL, host o id largo).
 *
 * Entrada no-string devuelve `false` en vez de tirar. Recomendacion de QA en la ronda 6:
 * hoy ningun call site pasa null/undefined, pero el `CHECK` de la DB ante NULL da NULL
 * -o sea, pasa- y el JS tiraba TypeError. Esa asimetria no era alcanzable, pero el dia
 * que un campo opcional llegue vacio conviene que las dos definiciones sigan diciendo lo
 * mismo en vez de que una reviente.
 */
export function hasLocator(v) {
  if (typeof v !== 'string') return false;
  if (LOCATOR_PATTERNS.some((re) => re.test(v))) return true;
  return (v.match(/[A-Za-z0-9_]{25,}/g) ?? []).some(
    (run) => /[0-9]/.test(run) && /[a-z]/.test(run) && /[A-Z]/.test(run),
  );
}
