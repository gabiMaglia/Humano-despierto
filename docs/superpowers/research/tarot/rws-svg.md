# Tarot Rider-Waite-Smith vectorizado en Wikimedia Commons — informe

Fecha: 2026-10-27. Investigación de solo lectura vía API de Commons (`action=query`, `list=categorymembers`, `prop=imageinfo`, `prop=revisions`), descarga de los 78 SVG y análisis local. JSON por archivo: `rws-svg-commons.json` (misma carpeta).

## Veredicto corto

- **Sí existen los 78.** Categoría exacta: `Category:Vectorized Tarot by Immanuelle` (79 archivos: 78 cartas + 1 extra "Waite–Smith Tarot Roses and Lilies cropped.svg", que es el reverso/decoración, no una carta). Subcategorías: `Vectorized major arcana` (22), `Vectorized wands` / `cups` / `swords` / `pents` (14 c/u). Padre: `Category:Rider-Waite tarot deck`.
- **Son vectores reales, sin raster embebido.** 0 etiquetas `<image>` y 0 `base64` en los 78 (verificado por archivo, no por muestra). Sólo `<g>`, `<path>`, `<rect>` y `<text>`. Cumplen "sin raster".
- **Licencia: dominio público** en los 78, sin licencia propia del vectorizado. Plantillas `{{PD-US-expired}}{{PD-old-70}}`; `extmetadata`: `LicenseShortName=Public domain`, `UsageTerms=Public domain`, `AttributionRequired=false`, `Artist=Pamela Colman Smith`, `Credit=http://muzendo.jp/blog/` (fuente del escaneo). La descripción dice "Vectorization of [File:X.jpg] by Immanuelle using https://vectorizer.com/ and later inkscape editing". El usuario Immanuelle **no reclama** CC-BY-SA ni nada propio; vectorizer.com no reclama derechos sobre la salida (cláusula 5 de sus términos: uso personal o comercial). Un auto-trazado de una obra PD no genera originalidad protegible en la práctica, así que el riesgo es bajo.
- **Peso: pesadísimos.** Total 271.597.936 bytes (259 MiB) crudos; min 1.108.487 (Swords03), max 6.658.152 (Wands14), promedio 3.482.024 por carta. Gzip: 83,3 MB total, promedio 1,07 MB/carta. Con svgo multipass: Fool 2,05 MB → 869 KB (313 KB gz); Wands14 6,66 MB → 2,42 MB (838 KB gz). Son auto-trazados: ~3.800 `<path>` por carta (548–8.690), cada uno con su `<g>`; el fondo de las cartas tiene moteado del escaneo trazado como miles de parches.

**Conclusión:** sirven como *fuente* (licencia limpia, vector real, 78 completos), pero **no para servir tal cual en producción**: aún minificados y gzipeados, una carta pesa 300–850 KB y la baraja completa ~25–65 MB. Hay que post-procesarlas (simplificar paths, quitar moteado, unir por color) o rasterizarlas a imagen — lo segundo rompe la regla "sin raster". Alternativa realista: usarlas sólo para unas pocas cartas destacadas (hero, player) tras simplificar, y no cargar la baraja entera.

## 1. Categoría y archivos

Nombre exacto: **`Category:Vectorized Tarot by Immanuelle`** (pageid 180672018, creada 2025-12-25). Subida entre 2025-12-25 y 2026-01-31 por el usuario `Immanuelle`. Todos 1086×1810 px nominales.

Nomenclatura: arcanos mayores `RWS Tarot NN Nombre.svg` (00 Fool … 21 World; 08 Strength / 11 Justice, orden Waite); menores `Cups01..14`, `Pents01..14`, `Swords01..14`, `Wands01..14` (01 = As, 11 = Paje, 12 = Caballero, 13 = Reina, 14 = Rey).

| Archivo | bytes | gzip | paths | text | URL directa |
|---|---|---|---|---|---|
| Cups01.svg | 3,121,251 | 949,782 | 2824 | 2 | https://upload.wikimedia.org/wikipedia/commons/1/1d/Cups01.svg |
| Cups02.svg | 5,298,842 | 1,669,112 | 3762 | 0 | https://upload.wikimedia.org/wikipedia/commons/8/88/Cups02.svg |
| Cups03.svg | 5,861,391 | 1,681,611 | 8690 | 1 | https://upload.wikimedia.org/wikipedia/commons/9/9c/Cups03.svg |
| Cups04.svg | 4,214,441 | 1,278,365 | 3730 | 1 | https://upload.wikimedia.org/wikipedia/commons/9/95/Cups04.svg |
| Cups05.svg | 2,422,702 | 742,602 | 2142 | 1 | https://upload.wikimedia.org/wikipedia/commons/8/89/Cups05.svg |
| Cups06.svg | 4,634,494 | 1,292,952 | 6260 | 0 | https://upload.wikimedia.org/wikipedia/commons/1/1f/Cups06.svg |
| Cups07.svg | 3,331,105 | 1,065,761 | 3066 | 0 | https://upload.wikimedia.org/wikipedia/commons/2/2f/Cups07.svg |
| Cups08.svg | 2,042,272 | 641,542 | 1582 | 3 | https://upload.wikimedia.org/wikipedia/commons/d/dd/Cups08.svg |
| Cups09.svg | 3,559,343 | 1,133,503 | 2961 | 1 | https://upload.wikimedia.org/wikipedia/commons/3/36/Cups09.svg |
| Cups10.svg | 3,951,314 | 1,205,176 | 4031 | 1 | https://upload.wikimedia.org/wikipedia/commons/6/67/Cups10.svg |
| Cups11.svg | 3,959,251 | 1,183,321 | 4530 | 2 | https://upload.wikimedia.org/wikipedia/commons/8/85/Cups11.svg |
| Cups12.svg | 5,141,481 | 1,540,953 | 4929 | 2 | https://upload.wikimedia.org/wikipedia/commons/e/ef/Cups12.svg |
| Cups13.svg | 3,746,078 | 1,175,283 | 4049 | 2 | https://upload.wikimedia.org/wikipedia/commons/9/9a/Cups13.svg |
| Cups14.svg | 5,064,803 | 1,608,161 | 4359 | 2 | https://upload.wikimedia.org/wikipedia/commons/5/58/Cups14.svg |
| Pents01.svg | 3,853,574 | 1,200,240 | 2801 | 2 | https://upload.wikimedia.org/wikipedia/commons/a/ac/Pents01.svg |
| Pents02.svg | 2,591,697 | 793,329 | 2206 | 1 | https://upload.wikimedia.org/wikipedia/commons/1/18/Pents02.svg |
| Pents03.svg | 4,049,393 | 1,182,782 | 5457 | 0 | https://upload.wikimedia.org/wikipedia/commons/e/e6/Pents03.svg |
| Pents04.svg | 2,855,172 | 877,835 | 1942 | 1 | https://upload.wikimedia.org/wikipedia/commons/9/9c/Pents04.svg |
| Pents05.svg | 4,476,242 | 1,308,042 | 6799 | 3 | https://upload.wikimedia.org/wikipedia/commons/6/6c/Pents05.svg |
| Pents06.svg | 3,550,896 | 1,063,446 | 3321 | 1 | https://upload.wikimedia.org/wikipedia/commons/c/ce/Pents06.svg |
| Pents07.svg | 3,943,180 | 1,137,746 | 4813 | 1 | https://upload.wikimedia.org/wikipedia/commons/f/f9/Pents07.svg |
| Pents08.svg | 3,479,235 | 1,016,917 | 3653 | 1 | https://upload.wikimedia.org/wikipedia/commons/6/6a/Pents08.svg |
| Pents09.svg | 3,698,182 | 1,097,378 | 4315 | 1 | https://upload.wikimedia.org/wikipedia/commons/c/c0/Pents09.svg |
| Pents10.svg | 4,398,178 | 1,313,810 | 5678 | 1 | https://upload.wikimedia.org/wikipedia/commons/f/ff/Pents10.svg |
| Pents11.svg | 2,886,446 | 852,542 | 3457 | 2 | https://upload.wikimedia.org/wikipedia/commons/c/c2/Pents11.svg |
| Pents12.svg | 3,140,576 | 934,992 | 3737 | 2 | https://upload.wikimedia.org/wikipedia/commons/0/02/Pents12.svg |
| Pents13.svg | 4,782,902 | 1,346,147 | 8155 | 2 | https://upload.wikimedia.org/wikipedia/commons/7/75/Pents13.svg |
| Pents14.svg | 3,439,335 | 1,031,255 | 4732 | 2 | https://upload.wikimedia.org/wikipedia/commons/5/5c/Pents14.svg |
| RWS Tarot 00 Fool.svg | 2,045,087 | 670,547 | 2486 | 5 | https://upload.wikimedia.org/wikipedia/commons/3/3f/RWS_Tarot_00_Fool.svg |
| RWS Tarot 01 Magician.svg | 2,950,320 | 1,019,270 | 2598 | 0 | https://upload.wikimedia.org/wikipedia/commons/d/d6/RWS_Tarot_01_Magician.svg |
| RWS Tarot 02 High Priestess.svg | 2,295,449 | 718,568 | 2376 | 6 | https://upload.wikimedia.org/wikipedia/commons/f/fb/RWS_Tarot_02_High_Priestess.svg |
| RWS Tarot 03 Empress.svg | 2,292,905 | 740,811 | 3797 | 0 | https://upload.wikimedia.org/wikipedia/commons/8/84/RWS_Tarot_03_Empress.svg |
| RWS Tarot 04 Emperor.svg | 2,768,273 | 901,900 | 4360 | 0 | https://upload.wikimedia.org/wikipedia/commons/3/30/RWS_Tarot_04_Emperor.svg |
| RWS Tarot 05 Hierophant.svg | 2,088,289 | 679,937 | 3039 | 0 | https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_05_Hierophant.svg |
| RWS Tarot 06 Lovers.svg | 3,142,105 | 912,198 | 5101 | 2 | https://upload.wikimedia.org/wikipedia/commons/9/9f/RWS_Tarot_06_Lovers.svg |
| RWS Tarot 07 Chariot.svg | 2,456,180 | 827,011 | 2678 | 0 | https://upload.wikimedia.org/wikipedia/commons/6/69/RWS_Tarot_07_Chariot.svg |
| RWS Tarot 08 Strength.svg | 1,532,274 | 455,848 | 2424 | 2 | https://upload.wikimedia.org/wikipedia/commons/b/b6/RWS_Tarot_08_Strength.svg |
| RWS Tarot 09 Hermit.svg | 1,413,003 | 508,051 | 805 | 0 | https://upload.wikimedia.org/wikipedia/commons/1/14/RWS_Tarot_09_Hermit.svg |
| RWS Tarot 10 Wheel of Fortune.svg | 1,923,847 | 627,562 | 2640 | 0 | https://upload.wikimedia.org/wikipedia/commons/c/cb/RWS_Tarot_10_Wheel_of_Fortune.svg |
| RWS Tarot 11 Justice.svg | 2,134,452 | 696,908 | 3267 | 0 | https://upload.wikimedia.org/wikipedia/commons/4/42/RWS_Tarot_11_Justice.svg |
| RWS Tarot 12 Hanged Man.svg | 3,361,806 | 1,142,469 | 1521 | 0 | https://upload.wikimedia.org/wikipedia/commons/c/c5/RWS_Tarot_12_Hanged_Man.svg |
| RWS Tarot 13 Death.svg | 2,611,184 | 847,373 | 2740 | 0 | https://upload.wikimedia.org/wikipedia/commons/8/8e/RWS_Tarot_13_Death.svg |
| RWS Tarot 14 Temperance.svg | 2,837,918 | 920,819 | 3716 | 0 | https://upload.wikimedia.org/wikipedia/commons/4/46/RWS_Tarot_14_Temperance.svg |
| RWS Tarot 15 Devil.svg | 1,681,831 | 510,965 | 3405 | 0 | https://upload.wikimedia.org/wikipedia/commons/4/40/RWS_Tarot_15_Devil.svg |
| RWS Tarot 16 Tower.svg | 1,252,569 | 404,755 | 1280 | 0 | https://upload.wikimedia.org/wikipedia/commons/2/27/RWS_Tarot_16_Tower.svg |
| RWS Tarot 17 Star.svg | 3,177,235 | 1,052,793 | 2994 | 0 | https://upload.wikimedia.org/wikipedia/commons/2/22/RWS_Tarot_17_Star.svg |
| RWS Tarot 18 Moon.svg | 2,512,708 | 838,679 | 2141 | 0 | https://upload.wikimedia.org/wikipedia/commons/9/98/RWS_Tarot_18_Moon.svg |
| RWS Tarot 19 Sun.svg | 2,245,521 | 743,709 | 2574 | 0 | https://upload.wikimedia.org/wikipedia/commons/7/75/RWS_Tarot_19_Sun.svg |
| RWS Tarot 20 Judgement.svg | 2,243,816 | 732,529 | 2635 | 0 | https://upload.wikimedia.org/wikipedia/commons/9/93/RWS_Tarot_20_Judgement.svg |
| RWS Tarot 21 World.svg | 2,182,704 | 709,958 | 3130 | 0 | https://upload.wikimedia.org/wikipedia/commons/0/0a/RWS_Tarot_21_World.svg |
| Swords01.svg | 3,131,232 | 995,837 | 1871 | 3 | https://upload.wikimedia.org/wikipedia/commons/0/0e/Swords01.svg |
| Swords02.svg | 4,028,245 | 1,272,881 | 2657 | 1 | https://upload.wikimedia.org/wikipedia/commons/b/bd/Swords02.svg |
| Swords03.svg | 1,108,487 | 383,026 | 548 | 1 | https://upload.wikimedia.org/wikipedia/commons/3/3a/Swords03.svg |
| Swords04.svg | 4,419,825 | 1,409,752 | 2945 | 1 | https://upload.wikimedia.org/wikipedia/commons/9/90/Swords04.svg |
| Swords05.svg | 4,924,058 | 1,548,590 | 4044 | 1 | https://upload.wikimedia.org/wikipedia/commons/7/72/Swords05.svg |
| Swords06.svg | 4,505,061 | 1,361,478 | 4759 | 1 | https://upload.wikimedia.org/wikipedia/commons/3/3a/Swords06.svg |
| Swords07.svg | 3,069,271 | 927,885 | 3286 | 1 | https://upload.wikimedia.org/wikipedia/commons/7/74/Swords07.svg |
| Swords08.svg | 4,097,603 | 1,260,099 | 4109 | 1 | https://upload.wikimedia.org/wikipedia/commons/f/f4/Swords08.svg |
| Swords09.svg | 2,602,665 | 709,923 | 4114 | 1 | https://upload.wikimedia.org/wikipedia/commons/c/cc/Swords09.svg |
| Swords10.svg | 3,009,677 | 889,636 | 3757 | 1 | https://upload.wikimedia.org/wikipedia/commons/4/49/Swords10.svg |
| Swords11.svg | 4,815,582 | 1,556,390 | 3468 | 2 | https://upload.wikimedia.org/wikipedia/commons/3/31/Swords11.svg |
| Swords12.svg | 3,451,048 | 1,074,463 | 3109 | 2 | https://upload.wikimedia.org/wikipedia/commons/c/c8/Swords12.svg |
| Swords13.svg | 1,825,330 | 545,372 | 2203 | 2 | https://upload.wikimedia.org/wikipedia/commons/7/7d/Swords13.svg |
| Swords14.svg | 4,954,179 | 1,553,611 | 4033 | 3 | https://upload.wikimedia.org/wikipedia/commons/7/72/Swords14.svg |
| Wands01.svg | 4,420,423 | 1,378,935 | 3153 | 3 | https://upload.wikimedia.org/wikipedia/commons/0/0f/Wands01.svg |
| Wands02.svg | 3,624,203 | 1,135,835 | 3383 | 1 | https://upload.wikimedia.org/wikipedia/commons/6/6b/Wands02.svg |
| Wands03.svg | 5,348,099 | 1,596,182 | 6132 | 1 | https://upload.wikimedia.org/wikipedia/commons/8/85/Wands03.svg |
| Wands04.svg | 4,141,557 | 1,236,166 | 4793 | 1 | https://upload.wikimedia.org/wikipedia/commons/9/9b/Wands04.svg |
| Wands05.svg | 4,649,016 | 1,388,564 | 5680 | 1 | https://upload.wikimedia.org/wikipedia/commons/8/8b/Wands05.svg |
| Wands06.svg | 3,575,011 | 1,032,454 | 4632 | 1 | https://upload.wikimedia.org/wikipedia/commons/6/69/Wands06.svg |
| Wands07.svg | 3,281,054 | 948,477 | 4190 | 1 | https://upload.wikimedia.org/wikipedia/commons/d/dd/Wands07.svg |
| Wands08.svg | 4,400,256 | 1,334,797 | 4540 | 1 | https://upload.wikimedia.org/wikipedia/commons/e/e0/Wands08.svg |
| Wands09.svg | 4,171,212 | 1,269,071 | 5112 | 1 | https://upload.wikimedia.org/wikipedia/commons/8/8f/Wands09.svg |
| Wands10.svg | 4,890,508 | 1,448,084 | 6153 | 1 | https://upload.wikimedia.org/wikipedia/commons/d/d1/Wands10.svg |
| Wands11.svg | 3,930,536 | 1,199,030 | 3846 | 3 | https://upload.wikimedia.org/wikipedia/commons/0/03/Wands11.svg |
| Wands12.svg | 5,182,785 | 1,504,934 | 6916 | 2 | https://upload.wikimedia.org/wikipedia/commons/d/dd/Wands12.svg |
| Wands13.svg | 4,739,609 | 1,390,236 | 6443 | 3 | https://upload.wikimedia.org/wikipedia/commons/6/69/Wands13.svg |
| Wands14.svg | 6,658,152 | 1,972,887 | 8361 | 2 | https://upload.wikimedia.org/wikipedia/commons/a/a6/Wands14.svg |
Extra (no carta): `File:Waite–Smith Tarot Roses and Lilies cropped.svg` — https://upload.wikimedia.org/wikipedia/commons/… (ver `raw-imageinfo.json`), misma licencia.

## 2. Licencia (muestra de 12 páginas leídas en wikitext + extmetadata de los 78)

Leídos en wikitext: Fool, Death, World, Cups01, Cups14, Pents05, Pents10, Swords03, Swords10, Wands08, Wands14, Roses and Lilies. Los 12 tienen exactamente el mismo bloque:

```
|description={{en|1=Vectorization of [[File:X.jpg|50px]] by Immanuelle using using https://vectorizer.com/ and later inkscape editing}}
|date=1910
|source=http://muzendo.jp/blog/
|author={{Creator:Pamela Colman Smith}}
{{PD-US-expired}}{{PD-old-70}}
```

`extmetadata` de los 78 (vía API): `LicenseShortName="Public domain"` ×78, `UsageTerms="Public domain"` ×78, `AttributionRequired="false"` ×78, `Attribution` ausente ×78, `Artist=Pamela Colman Smith` ×78, `Credit=http://muzendo.jp/blog/` ×78.

**¿El vectorizado reclama licencia propia distinta del PD del original? No.** Ninguna plantilla CC, ninguna mención de "own work", ningún `{{Attribution}}`. Lo único que hay es el crédito de descripción a Immanuelle como vectorizadora, sin exigencia.

Matices:
- `PD-old-70`: Pamela Colman Smith murió en 1951 → PD en países vida+70 desde 2022. `PD-US-expired`: publicado 1909/1910, PD en EE.UU. Argentina es vida+70 → PD.
- Los escaneos fuente (muzendo.jp, deck de 1910 "Pam-A"/Roses & Lilies) son PD por ser reproducción fiel de obra PD.
- US Games Systems reclama copyright sólo sobre su edición de 1971 (reversos, caja, recoloreo); no aplica a estas cartas de 1909/1910.
- Buena práctica, no obligación: acreditar "Pamela Colman Smith, 1909 · vectorización: Immanuelle (Wikimedia Commons), dominio público".

## 3. Tamaño y naturaleza del vector

| métrica | mín | máx | promedio | total |
|---|---|---|---|---|
| bytes crudos | 1.108.487 (Swords03) | 6.658.152 (Wands14) | 3.482.024 | 271.597.936 |
| bytes gzip -9 | 383.026 | 1.972.887 | 1.068.100 | 83.311.840 |
| `<path>` por carta | 548 | 8.690 | 3.819 | 297.925 |

Raster embebido: **0 de 78** (abiertos y grepeados los 78 por `<image` y `base64`; ninguno). Elementos presentes en toda la serie: `<g>` 297.250, `<path>` 297.925, `<rect>` 173, `<text>` 96. No hay `<filter>`, `<pattern>`, `<style>`, `<use>`, `<script>`, `<foreignObject>`.

Qué son: salida de vectorizer.com (auto-trace) editada en Inkscape 1.4. Cada mancha de color del escaneo es un `<path>` con `fill="#rrggbb"` propio (Cups01: 2.368 colores de relleno distintos; Wands14: 7.739). Por eso pesan tanto: el grano del papel y el moteado del fondo celeste/amarillo quedan trazados como miles de parches. Renderizados (QuickLook) se ven correctos y nítidos; el fondo muestra textura "sucia" de escaneo.

Detalles técnicos a tener en cuenta:
- **Títulos de los arcanos menores son `<text>` vivo**, no trazado: los 56 menores tienen 1–2 `<text>` con `font-family:'Calisto MT'` (p. ej. "ACE" "CUPS" en Cups01, y=1812, es decir *fuera* del viewBox nominal de 1810 → puede quedar recortado). Calisto MT no existe en web; el navegador cae a serif genérica. Los mayores no tienen texto excepto Fool, que tiene un `<switch systemLanguage="ja">` (〇 / 0) y un `<text>` perdido en x=−341 (fuera del lienzo).
- **56 archivos con viewBox ≠ width/height**: los menores declaran `width=1086 height=1810` pero `viewBox="0 0 ~1120 ~1929"` (desvío de aspecto 2,4–3,2 %). Con `preserveAspectRatio` por defecto no deforma, sólo deja un pequeño margen; conviene normalizar. Los 22 mayores tienen viewBox 1086×1810 coherente.
- Cruft de Inkscape (`sodipodi:*`, `inkscape:*`, `id` por nodo) presente; svgo lo quita y reduce ~55–65 % crudo, ~50–60 % gzip.

Peso realista en producción si se usan tal cual, minificados: ~0,3–0,85 MB gz por carta; baraja entera ~25–65 MB transferidos. Inaceptable para un listado; tolerable para 1–3 cartas con lazy-load, nunca inline en el HTML.

## 4. Alternativas buscadas

No encontré ninguna otra serie de los 78 RWS en SVG real con licencia libre:

- **Commons, otras categorías RWS**: `Rider-Waite-Smith tarot deck (TaionWC)` 78 JPG; `(Geldard)` 78 PNG; `Rider-Waite tarot deck (Roses & Lilies)` 78 JPEG (son los escaneos fuente de esta serie); `(Yale University)` 10 JPG. Búsqueda `filemime:image/svg+xml` fuera de la serie: 9 archivos sueltos (símbolos, un "Wheel of Fortune" vectorizado, "Celtic Cross Spread", emblemas de palos). Ninguna otra baraja SVG.
- **GitHub**: `mixvlad/TarotCards` (RWS 78 JPG/PNG PD, sin SVG); `Searge/tarot` (CC-BY-SA-4.0, 100 JPG + XML/XSLT, sin SVG); `victorwestmann/BackDeck` (sólo reversos en SVG, AGPL). Búsquedas "rider waite svg", "rider-waite-smith vector": sin repos relevantes.
- **Zarf's SVG Tarot** (eblong.com): arte original dibujado en Inkscape, sólo parte de los mayores, sin licencia declarada. No es RWS.
- **itch.io "Rider Waite Smith Tarot Cards CC0"** (luciellaes): escaneos limpiados 300×527 px, raster.
- **Plugin WordPress "Tarot"**: dice traer SVG en blanco y negro generados del deck de 1910; no verificado (GPL, calidad desconocida). Pista si se quisiera una versión monocroma de línea.
- Opción propia: partir de los PNG Geldard / JPEG Roses & Lilies (PD) y trazar con potrace/Inkscape en modo "colores: 8–16, suavizar, quitar manchas", que daría vectores de 50–200 KB por carta. Más trabajo pero resultado servible.

## 5. Recomendación para Humano Despierto

1. **Licencia**: OK para uso comercial sin atribución obligatoria; acreditar igual a Pamela Colman Smith y a Immanuelle/Commons en el footer o en `/diario`.
2. **No cargar la baraja entera** como SVG tal cual. Pipeline sugerido por carta: svgo multipass → Inkscape "Simplificar" (Ctrl+L) o `vpype`/`svgcleaner` → unir paths por color (`Path > Combine` por fill) → eliminar paths < N px² (moteado del fondo) → reemplazar `<text>` Calisto MT por path (`Object to Path`) o por el texto en Cinzel del design system → normalizar viewBox a 1086×1810. Objetivo: < 150 KB gz por carta.
3. Si el presupuesto no da para 78 post-procesadas, usar 3–6 cartas (Fool, Star, Moon, Sun, World, Wheel) para hero/player y mantener el resto como CSS/Unicode como hoy.
4. Guardar los originales en `design_handoff_humano_humano/reference/` (nunca en `public/`) y versionar sólo los derivados optimizados.

## Archivos generados
- `rws-svg-commons.json`: 78 entradas `{archivo, url, bytes, bytes_gzip, licencia, raster_embebido, image_tags, path_tags, text_tags, viewBox, width_height, desvio_aspecto_pct, uploader, fecha_subida}`.
- `raw-imageinfo.json`: respuesta cruda de imageinfo (79 archivos, incluye el extra).
- `all/`: los 78 SVG descargados (259 MiB). `dl/`: muestras + `Fool.min.svg`, `Wands14.min.svg` (svgo) + PNG de QuickLook.
