# Investigación · Tarot online (Rider-Waite-Smith) · 2026-10-27

Material de investigación previo al diseño del tarot online de Humano Despierto.
Producido por cuatro investigaciones paralelas, solo lectura web. No es código ni spec.

## Archivos
| Archivo | Qué es |
|---|---|
| `losarcanos.md` | Cómo funciona el tarot online de losarcanos.com: flujo, 21 tiradas, motor JS, modelo de negocio. |
| `tarot-historia-esoterismo.md` | Historia verificada (1440 → hoy), marcos de "cómo funciona", tablas completas de correspondencias Golden Dawn / Book T, ética. |
| `rider-waite-notas.md` | Estructura de la baraja, nombres en español, orden VIII/XI, lectura por número y figura, símbolos, licencias de imágenes. |
| `rider-waite-78.json` | **Dataset propio de 78 cartas** (textos originales en rioplatense + correspondencias + Waite 1911 en dominio público). Base del producto. |
| `tiradas-y-lectura.md` | 15 tiradas con posiciones, y los métodos de lectura combinada (narrativa, mirada, dignidades elementales, proporciones, quintaesencia, 41 combinaciones, invertidas, sí/no, redacción). |
| `tiradas.json` | Las 15 tiradas estructuradas con layout en grilla. |

El volcado de las 78 fichas de losarcanos.com (`losarcanos-cartas.json`) **no está en el repo**: es
texto con derechos de autor del sitio y se usó solo como referencia de estructura y vocabulario.

## Hallazgos que condicionan el diseño
1. **losarcanos tira solo con los 22 mayores.** Mazo de 22, `Math.random()` sin reemplazo, 1/3 de
   probabilidad de invertida, invertidas apagadas en 8 tiradas introspectivas. El mazo elegido solo cambia
   la imagen. La "lectura" es texto por carta × posición × inversión concatenado, sin síntesis.
   Esa es la vara a superar: nosotros tiramos con 78 y generamos un hilo entre cartas.
2. **No hay estándar fuera de Waite 1911.** Las cruces celtas modernas tienen dos numeraciones; se documentan ambas.
3. **Las correspondencias son datos, no magia:** 22 mayores → letra hebrea, sendero, signo/planeta;
   36 pips → decanato (planeta en signo); 16 cortes → sub-elemento y rango zodiacal; As-10 → sefirá.
   Todo verificado contra el Book T y ya cargado en `rider-waite-78.json`.
4. **Lectura combinada implementable como reglas:** dignidades elementales (fuego/aire y agua/tierra
   se refuerzan; fuego/agua y aire/tierra se debilitan), proporciones de la tirada (mayores, palo
   dominante, cortes, invertidas, números repetidos), quintaesencia, narrativa por posición.
5. **Invertidas:** cuatro escuelas; recomendación: interruptor global, una escuela por lectura,
   default "bloqueada". Sí/no: por carta positiva/negativa + orientación, mayoría en 3 cartas.
6. **Marco ético:** aviso de no sustitución de salud/legal/financiero; desalentar repetir la misma pregunta.
7. **Imágenes:** la edición 1909 de Pamela Colman Smith es dominio público en EE. UU., UE, Reino Unido y
   Argentina (Smith † 1951). Los recoloreados de US Games no lo son. En Wikimedia Commons hay escaneos
   completos y 78 SVG vectorizados (licencia por archivo a verificar). Para respetar la regla "sin
   imágenes raster" del proyecto, la opción es SVG o un diseño propio de cartas con glifos.

## Verificaciones posteriores (mismo día)
| Archivo | Qué es |
|---|---|
| `ia-en-navegador.md` | LLM en el navegador: Prompt API de Chrome (solo escritorio), WebLLM/Transformers.js (inviable en Android gama media e iOS), costo de Haiku 5.5 por tirada (USD 0,0003). Veredicto: reglas + plantillas como canónico; Prompt API como mejora progresiva opcional. |
| `rws-svg.md` + `rws-svg-commons.json` | Los 78 SVG del Rider en Commons: dominio público limpio, vectores reales sin raster, **pero 3,5 MB promedio por carta** (auto-trazado). Necesitan post-proceso para servirse. |
