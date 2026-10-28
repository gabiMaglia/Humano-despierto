# Tarot Rider-Waite-Smith: notas de investigación

Acompaña a `rider-waite-78.json` (78 cartas, validado). Fecha: 2026-10-27.

## 1. Estructura de la baraja

- **78 cartas** = 22 arcanos mayores + 56 arcanos menores.
- **Arcanos mayores**: numerados 0 (El Loco) a XXI (El Mundo).
- **Arcanos menores**: 4 palos × 14 cartas. Cada palo: As, 2–10 (pips, "cartas numerales") y 4 figuras de corte (Sota/Paje, Caballero, Reina, Rey).
- En el JSON las figuras llevan `numero` 11 (sota), 12 (caballero), 13 (reina), 14 (rey) para que el orden sea estable; esto es una convención nuestra, no de Waite.

| Palo (ES) | Palo (EN) | Elemento | Ámbito |
|---|---|---|---|
| Bastos | Wands | Fuego | acción, deseo, creatividad, trabajo-impulso |
| Copas | Cups | Agua | emociones, vínculos, intuición |
| Espadas | Swords | Aire | mente, conflicto, verdad, comunicación |
| Oros | Pentacles | Tierra | cuerpo, dinero, trabajo concreto, hogar |

## 2. Nombres alternativos en español

| Canónico en el JSON | Variantes frecuentes | Comentario |
|---|---|---|
| Sota | Paje, Page, Valet, Infante, Princesa (Thoth/Golden Dawn) | "Sota" es el nombre de la baraja española y el más usado en Argentina y España para tarot. "Paje" aparece en ediciones traducidas del RWS (ej. ediciones de US Games en español) y en bibliografía anglófona traducida. |
| Caballero | Caballo, Knight, Príncipe (Thoth) | "Caballo" es coloquial y viene de la baraja española; en tarot se prefiere "Caballero". |
| Reina | Queen, Dama | — |
| Rey | King | — |
| Oros | Pentáculos, Monedas, Discos (Thoth), Deniers (Marsella francés) | "Oros" es el nombre de la baraja española; "Pentáculos" es traducción literal de Waite (él mismo dice que sustituyó las monedas por pentáculos). En sitios argentinos y españoles conviven "Oros" y "Pentáculos"; muchos escriben "Oros (Pentáculos)". |
| Bastos | Varas, Varitas, Cetros, Wands | "Bastos" (baraja española). "Varas" es común en traducciones literales. |
| Espadas | Swords | — |
| Copas | Cups, Cálices | — |
| El Loco | El Bufón, El Necio | — |
| El Mago | El Malabarista, El Prestidigitador (Marsella: Le Bateleur) | — |
| La Sacerdotisa | La Suma Sacerdotisa, La Papisa (Marsella) | — |
| El Sumo Sacerdote | El Hierofante, El Papa (Marsella) | — |
| Los Enamorados | El Enamorado, Los Amantes | — |
| La Fuerza | La Fortaleza (Waite la llama "Fortitude" en el texto de significados) | — |
| El Colgado | El Ahorcado | "El Colgado" evita la connotación de muerte; ambas se usan. |
| La Muerte | El Arcano sin Nombre (Marsella, XIII sin título) | — |
| La Templanza | La Temperancia | — |
| El Juicio | El Juicio Final, La Resurrección | — |
| El Mundo | El Universo (Thoth) | — |
| La Rueda de la Fortuna | La Rueda | — |

Regla editorial del JSON: `nombre_es` usa Sota / Caballero / Reina / Rey y Oros / Bastos / Copas / Espadas, con artículo en los mayores ("El Loco", "La Fuerza").

## 3. Convenciones de orden

- **Fuerza VIII / Justicia XI** (RWS, 1909). Waite, siguiendo a la Golden Dawn, invirtió el orden de Marsella para que Fuerza corresponda a Leo y Justicia a Libra en la secuencia zodiacal. La ficha de Wikipedia lo señala explícitamente; el Sola Busca (s. XV) ya tenía Fuerza en esa posición.
- **Marsella y la mayoría de barajas francesas/italianas**: Justicia VIII, Fuerza XI. El Tarot de Thoth (Crowley) mantiene el orden RWS pero renombra (Lust/Adjustment).
- Si en el futuro el producto incorpora Marsella, el campo `numero` de Fuerza y Justicia debe depender de la baraja, no ser global.
- **El Loco** es 0; Waite lo lista al final de sus significados como "Zero" entre el XX y el XXI, pero en la numeración de las cartas es 0.
- En el texto de Waite el Juicio se llama "The Last Judgment" y la Fuerza "Fortitude"; en las cartas impresas dicen "Judgement" y "Strength".
- Aces: Waite describe los menores de Rey a As (orden descendente). El JSON los ordena ascendentemente As→Rey.

## 4. Lógica de lectura de los menores

### Por número (As a 10)

| Número | Idea base | Bastos | Copas | Espadas | Oros |
|---|---|---|---|---|---|
| As | semilla, potencial puro del elemento | chispa, inspiración | apertura del corazón | claridad, verdad | oportunidad material |
| 2 | dualidad, elección, equilibrio | planificar, visión | unión mutua | indecisión, tregua | malabares, adaptación |
| 3 | expansión, primer crecimiento | barcos que zarpan | celebración, amistad | dolor, ruptura | equipo, maestría |
| 4 | estabilidad, estructura | festejo, hogar | apatía, estancamiento | descanso, retiro | control, aferrarse |
| 5 | conflicto, crisis, pérdida | competencia | duelo, pérdida parcial | victoria vacía | carencia, exclusión |
| 6 | armonía recuperada, reciprocidad | victoria, reconocimiento | nostalgia, infancia | transición, viaje | generosidad, intercambio |
| 7 | desafío, evaluación, prueba | defender la posición | ilusiones, opciones | astucia, engaño | paciencia, cosecha pendiente |
| 8 | movimiento, poder en acción | velocidad, noticias | irse en busca de más | sentirse atrapado | oficio, dedicación |
| 9 | casi culminación, acumulación | resiliencia, última prueba | deseo cumplido | angustia, insomnio | independencia, abundancia |
| 10 | culminación y exceso | sobrecarga | felicidad familiar | final doloroso, fondo | legado, riqueza familiar |

Nota: en Bastos, Espadas y en parte Oros la escala 1→10 va de ligera a pesada (el exceso del elemento); en Copas es casi lineal hacia la plenitud, con los "baches" en 4, 5, 7 y 8. En Espadas casi todo el tramo 3→10 es difícil: el aire sin templar corta.

### Por figura de corte

| Figura | Golden Dawn | Sub-elemento | Función en la lectura |
|---|---|---|---|
| Sota / Paje | Princesa | Tierra del palo | inicio, aprendizaje, mensaje/noticia, persona joven o inmadura, "estudiante" del elemento |
| Caballero | Príncipe (en Golden Dawn el "King" a caballo) | Aire del palo | acción, movimiento, búsqueda; el elemento en marcha, a veces en exceso |
| Reina | Reina | Agua del palo | madurez receptiva, dominio interior, energía que nutre e irradia |
| Rey | Príncipe (Golden Dawn) | Fuego del palo | madurez activa, autoridad exterior, responsabilidad |

Advertencia sobre correspondencias: la Golden Dawn llama "King" a la figura montada (que en RWS es el Caballero) y "Prince" al rey sentado en carro (que en RWS es el Rey). En el JSON, el campo `astrologia` de los Caballeros y Reyes indica el equivalente Golden Dawn entre paréntesis para que no haya confusión al cruzar con bibliografía.

Lectura de figuras: pueden ser (a) una persona del entorno del consultante, (b) un aspecto del propio consultante, (c) una actitud recomendada, o (d) un mensaje/evento (sobre todo las Sotas). Waite les asigna tipos físicos ("dark man", "fair woman") que hoy se consideran obsoletos y no se replican en los textos propios.

## 5. Correspondencias astrológicas (Golden Dawn, "Book T")

### Mayores

| # | Carta | Letra hebrea | Atribución |
|---|---|---|---|
| 0 | El Loco | Álef | Aire (moderno: Urano) |
| I | El Mago | Bet | Mercurio |
| II | La Sacerdotisa | Guímel | Luna |
| III | La Emperatriz | Dálet | Venus |
| IV | El Emperador | He | Aries |
| V | El Sumo Sacerdote | Vav | Tauro |
| VI | Los Enamorados | Zain | Géminis |
| VII | El Carro | Jet | Cáncer |
| VIII | La Fuerza | Tet | Leo |
| IX | El Ermitaño | Yod | Virgo |
| X | La Rueda de la Fortuna | Kaf | Júpiter |
| XI | La Justicia | Lámed | Libra |
| XII | El Colgado | Mem | Agua (moderno: Neptuno) |
| XIII | La Muerte | Nun | Escorpio |
| XIV | La Templanza | Sámej | Sagitario |
| XV | El Diablo | Ayin | Capricornio |
| XVI | La Torre | Pe | Marte |
| XVII | La Estrella | Tsade | Acuario |
| XVIII | La Luna | Qof | Piscis |
| XIX | El Sol | Resh | Sol |
| XX | El Juicio | Shin | Fuego (moderno: Plutón) |
| XXI | El Mundo | Tav | Saturno (y Tierra) |

Nota: Crowley intercambió Tsade/He entre la Estrella y el Emperador en Thoth; el JSON sigue la atribución Golden Dawn clásica, que es la que Waite conocía.

### Menores: decanatos

Los pips 2–10 se reparten en los 36 decanatos (10° cada uno). Cada palo cubre los tres signos de su elemento: 2-3-4 en el signo cardinal, 5-6-7 en el fijo, 8-9-10 en el mutable. Los Ases son "raíz del poder" del elemento, fuera del zodíaco. Las figuras cubren 30° a caballo de dos signos (del 20° de uno al 20° del siguiente); las Sotas rigen un cuadrante entero.

| Palo | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| Bastos | Marte/Aries | Sol/Aries | Venus/Aries | Saturno/Leo | Júpiter/Leo | Marte/Leo | Mercurio/Sag | Luna/Sag | Saturno/Sag |
| Copas | Venus/Cáncer | Mercurio/Cáncer | Luna/Cáncer | Marte/Esc | Sol/Esc | Venus/Esc | Saturno/Piscis | Júpiter/Piscis | Marte/Piscis |
| Espadas | Luna/Libra | Saturno/Libra | Júpiter/Libra | Venus/Acu | Mercurio/Acu | Luna/Acu | Júpiter/Gém | Marte/Gém | Sol/Gém |
| Oros | Júpiter/Cap | Marte/Cap | Sol/Cap | Mercurio/Tauro | Luna/Tauro | Saturno/Tauro | Sol/Virgo | Venus/Virgo | Mercurio/Virgo |

## 6. Símbolos recurrentes en las ilustraciones de Pamela Colman Smith

- **Colores**: amarillo/dorado = conciencia, sol, éxito (fondos de El Sol, Fuerza, As de Bastos). Rojo = deseo, acción, pasión (mantos de Mago, Emperador, Hierofante; capas de caballeros). Azul = agua, emoción, espíritu (Sacerdotisa, Reina de Copas). Blanco = pureza, inocencia (rosa del Loco, caballo de la Muerte y del Sol, lirios). Negro = misterio, lo oculto (fondo del Diablo y la Torre, gato de la Reina de Bastos). Gris = neutralidad, piedra, duelo (Cinco de Copas, tronos, el Ermitaño).
- **Animales**: perro (fidelidad, instinto: Loco, Diez de Oros, La Luna), león (fuerza, Leo: Fuerza, Rueda, Mundo, tronos de Bastos), gato negro (independencia, intuición: Reina de Bastos), salamandra (fuego: ropas de Bastos), pez (agua, inconsciente: Sota y Rey de Copas), conejo (fertilidad: Reina de Oros), halcón encapuchado (instinto disciplinado: Nueve de Oros), caracol (paciencia: Nueve de Oros), serpiente (conocimiento, renovación: Mago, Enamorados, Rueda), ibis (Thot, sabiduría: Estrella), paloma (Espíritu: As de Copas), mariposas (aire, mente: tronos de Espadas), cangrejo/escarabajo (lo que emerge del inconsciente: Luna), carnero (Aries: Emperador, Reina de Oros), toro (Tauro: Rey de Oros, Mundo), águila (Escorpio elevado: Rueda, Mundo).
- **Paisajes**: montañas lejanas = metas, lo espiritual, el camino por recorrer (Loco, Ermitaño, Enamorados, As de Oros). Agua/mar/río = emoción, inconsciente, tiempo (Sacerdotisa, Emperatriz, Muerte, Templanza, Estrella, Luna, Copas en general, Seis de Espadas, Dos de Oros). Campos de trigo y viñedos = abundancia (Emperatriz, Nueve y Diez de Oros). Desierto y pirámides = fuego, aventura, lo exótico (figuras de Bastos). Campo arado = trabajo paciente (Sota y Caballero de Oros). Ciudad/castillo lejano = civilización, meta social, lo construido (Carro, Cuatro de Oros, Ocho de Oros, Ocho de Espadas). Cielo gris/nublado = conflicto mental (Espadas). Cielo negro = crisis (Torre, Diablo, Diez de Espadas).
- **Objetos y gestos**: la mano que sale de la nube en los cuatro Ases (don divino). Yods (gotas de fuego/luz) en Ases, Torre, Luna. Lemniscata (infinito) sobre Mago y Fuerza, lazo del Dos de Oros. Columnas duales (Sacerdotisa, Hierofante, Justicia) = polaridad. Dos torres en el horizonte (Muerte, Luna) = umbral. Rosas y lirios (deseo y pureza) en Mago, Hierofante, Dos de Bastos, As de Oros. Granadas (Perséfone, fertilidad, misterio) en Sacerdotisa y Emperatriz. Corona (logro, autoridad; también lo que cae en la Torre). Arcoíris (promesa cumplida) en Diez de Copas. Sol naciente detrás de la escena (esperanza oculta) en Muerte y Diez de Espadas. Venda en los ojos (negación, bloqueo) en Dos y Ocho de Espadas. Figuras de espaldas (introspección, lo que no se ve) en Tres de Bastos, Cinco y Siete de Copas, Ocho de Copas.
- **Las cuatro criaturas** (ángel, águila, león, toro) en Rueda y Mundo: los cuatro elementos / evangelistas / signos fijos.
- **Pentagrama** en los Oros (Waite: "la correspondencia de los cuatro elementos en la naturaleza humana"); invertido en el Diablo.

## 7. Imágenes en dominio público y licencias

### Edición original (1909–1910, Rider & Son, Londres)

- **Estados Unidos**: el mazo entró en dominio público en 1966 (publicación + dos términos de 28 años, sin renovación). Esto lo confirma Wikipedia.
- **Reino Unido** (país de origen) y países con término "vida del último coautor + 70 años o menos": dominio público desde el 1 de enero de 2022 (Pamela Colman Smith murió el 18 de septiembre de 1951; Waite en 1942). Wikimedia Commons marca el mazo como PD en EE. UU. y en el Reino Unido.
- **Unión Europea, Argentina (vida + 70), Brasil, Australia**: mismo criterio, PD desde 2022. **México** (vida + 100) no sería PD hasta 2052 por la vía de Smith; en la práctica el riesgo es bajo, pero vale anotarlo si se licencia contenido allí.
- **US Games Systems** reclama derechos sobre su edición de 1971 y posteriores (dorsos, caja, recoloreados, "Universal Waite", "Radiant Rider-Waite", "Smith-Waite Centennial"). Esos recoloreados y redibujados **no** son PD: usar solo escaneos de la edición original (1909 "Roses & Lilies", 1910 "Pam-A" con dorso "cracked mud", y las "Pam-B/C/D" hasta 1920).
- Advertencia de Commons: "algunas versiones coloreadas pueden seguir protegidas".

### Dónde descargar

- **Wikimedia Commons, categoría principal**: https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck — subcategorías útiles:
  - `Rider-Waite tarot deck (Roses & Lilies)` — 80 archivos, escaneos de la primera tirada 1909.
  - `Rider-Waite-Smith tarot deck (Geldard)` — 78 archivos, escaneos limpios.
  - `Rider-Waite-Smith tarot deck (TaionWC)` — 78 archivos.
  - `The Pictorial Key to the Tarot` — 84 archivos, las láminas en blanco y negro del libro de 1911.
  - `Vectorized Tarot by Immanuelle` — **79 SVG**: `RWS Tarot 00 Fool.svg` … `RWS Tarot 21 World.svg`, y `Cups01.svg`…`Cups14.svg`, `Wands01.svg`…, `Swords01.svg`…, `Pents01.svg`…. Son vectorizaciones (trazado automático) de los escaneos PD; cada archivo declara su licencia en su página (verificar una por una antes de empaquetar; lo esperable es PD-art/PD-old o CC0 del vectorizador).
  - `Rider-Waite tarot deck (Yale University)` — 10 archivos de la Beinecke.
  - Archivos sueltos con patrón `RWS_Tarot_NN_Name.jpg` (ej. `RWS_Tarot_00_Fool.jpg`, `Cups01.jpg`): son los más enlazados desde Wikipedia.
- **Wikipedia (lista y artículo)**: https://en.wikipedia.org/wiki/Rider%E2%80%93Waite_Tarot (artículo con estado legal y lista de las 78 cartas enlazadas a Commons).
- **Texto de Waite (PD)**: *The Pictorial Key to the Tarot* (1911). Wikisource: https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot (Part III contiene los significados adivinatorios usados en el campo `waite_divinatory`). También en sacred-texts.com (`/tarot/pkt/`), pero ese sitio bloquea descargas automatizadas con Cloudflare; Wikisource sirvió el texto completo sin problema.

### Decks abiertos / alternativos y sus licencias

| Recurso | Formato | Licencia | Notas |
|---|---|---|---|
| Commons "Vectorized Tarot by Immanuelle" | SVG (78 + dorso) | la de cada archivo (PD / CC0 esperable) | única fuente SVG completa del RWS encontrada. Trazado automático: pesado y no editable "limpio". |
| luciellaes — "Rider-Waite Smith Tarot Cards (CC0)" (itch.io) | JPG/PNG 300×527, bordes redondeados | CC0 declarado para el dorso; las cartas son escaneos PD de Wikipedia retocados; la autora evaluó PD bajo ley australiana y pide "hacé tu propia evaluación" y no revender tal cual | https://luciellaes.itch.io/rider-waite-smith-tarot-cards-cc0 |
| mixvlad/TarotCards (GitHub) | JPG/PNG 720 px, versiones optimizadas | PD (fuente: Commons) | raster, bueno para prototipar rápido. https://github.com/mixvlad/TarotCards |
| Searge/tarot (GitHub) | datos XML + imágenes | CC-BY-SA-4.0 para el repo; imágenes "public domain Rider-Waite" | el share-alike aplica a los textos/estructura del repo, no a las imágenes PD. https://github.com/Searge/tarot |
| arcanaland/specifications + Tarot Canvas | spec de formato de mazo (soporta SVG y raster), visor MIT | MIT | útil como referencia de esquema de datos, no como fuente de imágenes. |
| Tarot de Marsella (Conver 1760, Dodal, Noblet) | escaneos BnF/Gallica en Commons | PD | alternativa sin ninguna duda legal en ningún país, pero sin escenas en los menores. |
| "Open Source Tarot" / decks de artistas en CC-BY o CC-BY-SA | varía | CC-BY / CC-BY-SA / CC-BY-NC | revisar NC: incompatible con producto comercial. Ninguno es RWS pixel-exacto. |

Recomendación práctica: para el MVP usar los escaneos PD de Commons (Geldard o Roses & Lilies, ~78 JPG) servidos desde el propio bucket (no hotlinkear a Commons). Si se quiere SVG, verificar la licencia archivo por archivo de la categoría Immanuelle y considerar re-vectorizar a mano los 22 mayores. Nunca usar imágenes de la Universal Waite, Radiant o Centennial de US Games.

## 8. Fuentes consultadas

- Waite, A. E. *The Pictorial Key to the Tarot* (1911), Part III, Wikisource: https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot/Part_3 — fuente de `waite_divinatory` (texto en dominio público, citado literalmente en inglés). Nota: el Dos de Copas no tiene "Reversed" en la entrada principal; se tomó "Passion" de §4 "Some additional meanings" y se marcó en el JSON.
- Wikipedia, "Rider–Waite Tarot": https://en.wikipedia.org/wiki/Rider%E2%80%93Waite_Tarot — estado legal, historia de ediciones, intercambio Fuerza/Justicia.
- Wikimedia Commons, Category:Rider-Waite tarot deck: https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck y Category:Vectorized Tarot by Immanuelle: https://commons.wikimedia.org/wiki/Category:Vectorized_Tarot_by_Immanuelle
- Biddy Tarot, "Tarot Card Meanings": https://www.biddytarot.com/tarot-card-meanings/ — contraste de palabras clave modernas (derecha/invertida) de los 22 mayores.
- Labyrinthos (labyrinthos.co) — la URL de correspondencias astrológicas devolvió 404 al momento de la consulta; las correspondencias se tomaron del *Book T* de la Golden Dawn (conocimiento establecido, coincidente con Biddy Tarot y Wikipedia "Tarot card astrology").
- luciellaes, "Rider-Waite Smith Tarot Cards (CC0)": https://luciellaes.itch.io/rider-waite-smith-tarot-cards-cc0
- GitHub mixvlad/TarotCards: https://github.com/mixvlad/TarotCards ; Searge/tarot: https://github.com/Searge/tarot ; arcanaland/specifications: https://github.com/arcanaland/specifications
- Vocabulario en español: laps4.com ("¿Qué figura es la sota?", "¿Qué son los bastos de la baraja?") y manuales de tarot en español que listan "Rey, Reina, Sota o Paje, Caballo o Caballero". No se encontró una fuente académica que compare el uso argentino y español; la elección Sota/Caballero/Oros se basa en el uso mayoritario de tarotistas rioplatenses y en la baraja española.

## 9. Decisiones de redacción del JSON

- Textos de `significado_*`, `amor`, `trabajo`, `dinero`, `salud`, `consejo` y `descripcion_imagen` son originales; no se copió ningún párrafo de Biddy, Labyrinthos ni otros sitios con copyright.
- Tono: cálido, claro, no fatalista, voseo rioplatense en los consejos. Sin emojis.
- `si_no`: 49 "sí", 17 "no", 12 "depende". Es una heurística para tiradas de una carta; conviene exponerla como "tendencia" y no como veredicto.
- `numerologia` es `null` en los mayores (el campo describe el número de los menores).
- `elemento` en figuras usa el sub-elemento Golden Dawn ("agua del fuego" para la Reina de Bastos) para que la UI pueda mostrar tanto el palo como la cualidad.
- Longitudes medidas: `significado_derecha` 92–112 palabras; `significado_invertida` 68–84 palabras.
