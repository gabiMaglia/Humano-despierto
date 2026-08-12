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
  // Espejo EXACTO de la migracion 0016. LA BARRA FINAL NO ES DECORATIVA: es lo unico que
  // separa un enlace de una frase en castellano.
  //
  // Historia, porque este renglon ya se equivoco dos veces en direcciones opuestas. Antes
  // terminaba en `([^A-Za-z]|$)` y la alternancia iba en minuscula sin /i, para no comerse
  // el typo de prosa que capitaliza al arrancar oracion ("termina.Me parece"). Eso dejaba
  // DOS agujeros a la vez: bloqueaba "la devolucion.me sirvio muchisimo" -- prosa legitima,
  // y `me` es una palabra del castellano ademas de un TLD -- y NO bloqueaba
  // "YOUTU.BE/xxxx", que es un localizador de verdad, porque la alternancia era lowercase.
  //
  // Exigir la ruta resuelve las dos: un enlace para compartir siempre tiene barra y una
  // frase nunca la tiene, asi que la alternancia puede volverse insensible a mayusculas
  // sin riesgo. La restriccion que habia que relajar y la que habia que endurecer eran la
  // misma, tiradas para lados opuestos.
  /[A-Za-z0-9]\.(com|net|org|io|co|app|dev|edu|gov|info|me|be|ly|gl|nz|cloud|link|site|online|page|xyz|tv)\//i,
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
