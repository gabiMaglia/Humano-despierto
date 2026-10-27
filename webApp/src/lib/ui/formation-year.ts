// La seed vieja guardó los años de `formations` en romanos («MMXII»): es dato, pero la ficha
// muestra años de verdad. Sólo se convierte un romano canónico; cualquier otro texto queda igual.
const CANONICAL_ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const VALUE: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function formationYear(year: string): string {
  const roman = year.trim().toUpperCase();
  if (!roman || !CANONICAL_ROMAN.test(roman)) return year;
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const v = VALUE[roman[i]];
    total += v < (VALUE[roman[i + 1]] ?? 0) ? -v : v;
  }
  return String(total);
}
