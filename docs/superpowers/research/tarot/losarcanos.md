# losarcanos.com — investigación del tarot online (solo lectura)

Fecha: 2026-10-27. Método: descarga directa del HTML con `curl` (el sitio no bloquea), extracción de texto con un parser local, y envío de los formularios POST de las tiradas para observar los pasos 2 (elección de cartas) y 3 (lectura). No se usó navegador; todo lo que depende de JS en vivo (animaciones, sonido, video de fondo) se infiere del código fuente descargado.

HTML crudo guardado en `/private/tmp/claude-501/-Users-gabrielsk-Documents-Proyects-Humano-despierto/8ecf9654-0e28-4bf1-aa36-a871c61cd396/scratchpad/research/raw/` (78 fichas `significado-tarot/`, 78 fichas `baraja/`, 34 páginas de tiradas en `tiradas/`, pasos 2 y 3 en `flow/`, motor JS `flow/xvi-menta23.js`).

> **Nota legal.** Todos los textos de significados, lecturas y combinaciones citados o extraídos al JSON son contenido con derechos de autor de LosArcanos.com. Son **referencia, no para copiar literal**. El equipo debe redactar sus propios significados.

---

## 0. Hallazgo central (afecta a todo lo demás)

**Las tiradas interactivas usan SOLO los 22 Arcanos Mayores, nunca las 56 menores.** Lo confirma el motor `https://www.losarcanos.com/xvi-menta23.js` (`var mver = "Menta v2.1 Luis Walter Reynoso"`): la función `SorteoCartas()` construye el mazo con `for (i = 1; i <= 22; i++)`, y el array `arcanos` tiene 22 nombres. Las 56 cartas menores existen únicamente como fichas de significado (sección "Significado Tarot") y en combinaciones mayor+menor. Para un producto Rider-Waite de 78 cartas, el sitio NO es un modelo de la mecánica de lectura con menores; sí lo es del catálogo de tiradas, de las posiciones y del formato de las fichas.

Otros datos del motor (verificados en el JS):
- **Invertidas:** por carta, `rnd = floor(random()*3)+1; if (rnd == 3) inv = "1"` → **probabilidad 1/3 de salir invertida**. Se desactivan (`inv = "0"`) en las tiradas con `ttirada` ∈ {`mcs`, `desesp`, `espejo`, `sn2`, `email`} (Mente‑Cuerpo‑Espíritu, Sanación Emocional, Desarrollo Espiritual, Encontrar el Amor, Conoce tu Verdadero Yo, Espejo del Alma, Sí/No 2 cartas, consulta por email).
- **Mezcla:** barajado por extracción aleatoria sin reemplazo (`cart1.splice(rnd-1,1)`) en el cliente, con `Math.random()`. Cada carta boca abajo recibe `name = "NN" + inv` (p. ej. `"161"` = carta 16 invertida) y su imagen `https://www.losarcanos.com/img_oracle2/{tipotarot}{NN}{inv}.jpg` (p. ej. `r011.jpg` = Rider, El Mago, invertido; verificado HTTP 200).
- **Numeración interna del motor:** 01=El Mago … 12=El Colgado, 13="La Transformacion" (La Muerte), … 21=El Mundo, **22=El Loco**. Esto difiere de las fichas, que usan 0=El Loco.
- **Flujo de selección:** las 22 cartas se dispersan al azar en el "marco" (posición y rotación aleatorias), se juntan en un mazo, se reparten en abanico (3 filas, o 2/1 si la pantalla es baja), y entonces `activocartas()` muestra "Elige tu Arcano para: {posición}". Al tocar una carta (`#bbNN`) suena un efecto, la carta se agranda y se da vuelta (jQuery `flip`), se muestra "Arcano: {nombre}{ Inv.} para: {posición}", y después se desplaza a su posición fija (`atop[]`/`aleft[]`). En la Cruz Celta la 2ª carta se rota -90° (cruzada); en Cábala todas se rotan -32°; en "mcs" las tres se rotan en abanico; en "sn2" ±20°. Al completar `totcartas`, "Tirada terminada, cargando resultados…" y `llamoform()` envía por POST el campo oculto `A` = lista `"011,220,051,"` al script de resultado.
- Hay música de fondo (SoundJS, mp3 por tirada: `oraculo-c1.mp3`, `love2.mp3`, `musica2.mp3`…), sonido al elegir y un video HLS de fondo (Cloudflare Stream) en el paso 2.

---

## 1. Flujo del tarot online y catálogo de tiradas

### 1.1 Flujo de usuario (igual en todas las tiradas "clásicas")
1. **Página de la tirada** (`/tarot-xxx.php`): texto descriptivo + formulario `POST` con `NOMBRE` (texto), `SEXO` (Femenino/Masculino) y `TAROT` (mazo). Ejemplo: `https://www.losarcanos.com/tarot-celta.php` → `action="tarot-cruz-j.php"`. No se pide pregunta escrita ni signo (salvo en los servicios por email). Un `input hidden js_enabled` detecta JS.
2. **Paso 2** (`/tarot-xxx-j.php`): canvas de selección descrito en §0. El título saluda "Bienvenida {nombre}" según `SEXO`.
3. **Paso 3** (script de resultado, p. ej. `cruz-tarot-2.php`, `tarot-ppf-res-mf.php`, `amor_tarot.php`, `resultado_tarot2.php`): página con la fecha, nombre, una imagen por carta y un **texto por carta+posición**. Ver §5.
4. Botón "Realizar una nueva Consulta" y, en Sí/No, CTA a "Nuevo Tarot por Email" (`/tarot-personalizado.php`).

**Selector de mazo** (en todas las tiradas clásicas, extraído de `https://www.losarcanos.com/tarot_pre.php`): `a`=Los Arcanos, `t`=Marsella, `r`=Rider, `l`=Legacy (preseleccionado), `m`=Moon Garden, `g`=Gilded Tarot, `d`=Dream. **El mazo solo cambia las imágenes**: enviando las mismas cartas con `TA=a` y `TA=r` a `tarot-ppf-res-mf.php` el texto de la lectura fue idéntico. Cambiar `SEXO` tampoco cambió el texto (solo el saludo).

### 1.2 Tiradas con cartas (posiciones verificadas en el `amsg[]` del paso 2 y en el resultado)

| Tirada | URL | Cartas | Posiciones (orden de elección) | Invertidas | Notas |
|---|---|---|---|---|---|
| Tarot El Oráculo ("Oráculo Estelar") | `/tarot_pre.php` → `tarot-j.php` → `resultado_tarot2.php` | 12 | Laboral · Amistades · Proyectos · Preocupaciones · Cambios · Presente · Amor · Dinero · Salud · Viajes · Ambiciones · Familia (en el resultado: "Profesional y Laboral", "Sueños y Proyectos", "Preocupaciones Internas", "Cambios Transitorios", "El Presente", "Situación Economica", "Comunicacion y Viajes", "Placeres y Ambiciones", "Familia y Amigos") | sí | Dispuestas en círculo/arco. `/tarot-rider.php` es la misma tirada con `TAROT=r` fijo ("El Oráculo con las imágenes de TAROT RIDER"). |
| Tarot Sí o No | `/tarot-si-o-no.php` → `tarot-si-no-j.php` → `tarot-si-no-res.php` | 1 | "Si o No" | sí | El resultado da un veredicto embebido en el texto ("…pero es un SI, después de un periodo de tocar fondo") + párrafo "Consejo". Ejemplo obtenido con La Torre invertida. |
| Sí o No de 2 cartas | `/tarot-si-o-no-dos-cartas.php` → `tarot-si-no-dos-cartas-j.php` → `tarot-si-no-dos-cartas-res.php` | 2 | Primera Carta · Segunda Carta | **no** (`sn2`) | Texto de síntesis de la pareja (título corto + "Consejo"); la página admite "tal vez" cuando la combinación es ambigua. Ejemplo: El Mago + El Loco → "Iniciativa audaz hacia lo desconocido". |
| Pasado, Presente y Futuro ("Tarot 3 Cartas") | `/tarot-pasado-presente-futuro.php` → `tarot-ppf-j.php` → `tarot-ppf-res-mf.php` | 3 | Pasado · Presente · Futuro | sí | La página explica: carta 1 se interpreta en pasado; carta 2 en presente y en relación con la anterior; carta 3 "indica la tendencia final". |
| A Favor y en Contra | `/tarot-favor-y-contra.php` → `tarot-favor-j.php` → `tarot-afavor-r-mf.php` | 2 | A Favor · En Contra | sí | |
| La Encrucijada | `/tarot-encrucijada.php` → `tarot-encru-j.php` → `tarot-encrucijada-r.php` | 6 | Origen · Decisión · Encrucijada · 1 Alternativa · 2 Alternativa · Sugerencia | sí | "tres respuestas: qué pasará si eliges cada alternativa, y la que el Tarot ofrece como cierta". |
| Cruz Celta ("Tarot Celta") | `/tarot-celta.php` → `tarot-cruz-j.php` → `cruz-tarot-2.php` | 10 | A Favor · En Contra (cruzada) · Presente · Reciente · Anterior · Futuro · Personales · Medio · Esperanzas · Final | sí | El resultado antepone a cada carta la definición de la posición, p. ej. "Elementos que el consultante tiene a favor…", "Plano de resistencia y trabas…", "Base del problema…", "Los ancestros, el origen de la inquietud…", "Indica las distintas posibilidades…", "Da luz sobre las motivaciones reales…", "El ambiente, las opiniones de los que nos rodean…", "Ante lo que vivimos y se nos avecina", "Consecución probable del objetivo…". |
| Cábala | `/tarot-cabala.php` → `tarot-cabala-j.php` → `cabala-tarot20.php` | 10 | Iluminación · Sabiduría · Entendimiento · Fuerza · Misericordia · Belleza · Victoria · Esplendor · Fundamento · El Reino (las 10 sefirot) | sí | Cartas rotadas -32°. |
| La Estrella | `/tarot-estrella.php` → `tarot-estrella-j.php` → `tarot-david-r20.php` | 7 | Pasado · Presente · Futuro · Deseos · Entorno · Temores · Esperanzas | sí | Disposición en estrella de David. |
| Tarot Lunar | `/tarot-lunar.php` → `tarot-lunar-j.php` → `tarot-lunar-r.php` | 4 | `amsg = ['26-10-2026','','','']` (la 1ª posición es la fecha de la próxima luna llena; las otras tres no tienen rótulo en el paso 2) | sí | La página muestra "¿Cuándo es la próxima luna llena?". No pude verificar los rótulos finales de las 4 posiciones. |
| La Verdad Oculta | `/tarot-verdad-oculta.php` → `tarot-verdad-j.php` → `tarot-verdad-r.php` | 5 | Actitud · Sentimientos · Futuro · Nos ven · Frente | sí | |
| Mente, Cuerpo y Espíritu | `/tarot-mente-cuerpo-espiritu.php` → `tarot-mce-j.php` → `tarot-mcs-res.php` | 3 | Mente · Cuerpo · Espíritu | no | |
| Espejo del Alma | `/tarot-espejo-del-alma.php` → `tarot-espejo-del-alma-j.php` → `tarot-espejo-res.php` | 7 | El Yo Presente · Los Deseos del Corazón · Las Cadenas Ocultas · El Espejo del Pasado · Las Posibilidades del Futuro · El Reflejo de los Otros · Culminación del viaje ("La Síntesis") | no | La página describe cada posición (filter_1..7). La 7ª es explícitamente una **carta de síntesis**. |
| Conoce tu Verdadero Yo (Autoexploración) | `/tarot-autoexploracion.php` → `tarot-autoexploracio-j.php` → `tarot-autoexploracion-res.php` | 6 | Tu Ser Esencial · Tu Mente Consciente · Tu Mente Subconsciente · Tu Sombra · Tu Potencial Desbloqueado · Tu Guía Interna | no | |
| Tarot del Amor | `/amor.php` → `tarot-amor-j.php` → `amor_tarot.php` | 7 | Comunicación · Pareja · Amor · Presente · Sueños · Amistad · Sexo | sí | Resultado: "EL MAGO Y LA COMUNICACIÓN: …", "EL LOCO Y LA PAREJA: …" (texto por carta+tema). Disposición en arco. |
| ¿Qué siente por mí? (Tarot de los Sentimientos) | `/que-siente-por-mi.php` → `tarot-que-siente-j.php` → `tarot-que-siente-res.php` | 3 | ¿Qué siente? · Obstáculos · Es para mí (página: "Carta 1: ¿Qué siente por mí?", "Carta 2: Los Obstáculos", "Carta 3: Consejos del Universo") | no | |
| Encontrar el Amor | `/encontrar-el-amor.php` → `encontrar-el-amor-j.php` → `tarot-encontrar-elamor-res.php` | 7 | Yo mismo · Situación · El ser amado · Consejo · Desafíos · Próximos pasos · Potencial | no | Cada posición tiene pregunta guía en la página ("¿Cómo te percibes…?", "Factores sociales…", etc.). |
| Sanación Emocional (Tarot Terapéutico) | `/tarot-terapeutico.php` → `tarot-terapeutico-j.php` → `tarot-terapeutico-res.php` | 4 | ¿Por qué? · ¿Ahora? · ¿Cómo? · Consejo | no | |
| Desarrollo Espiritual ("Desvela tus dones") | `/desarrollo-espiritual.php` → `desarrollo-espiritual-j.php` → `desarrollo-espiritual-res.php` | 4 | ¿Señales? · ¿Cómo conectar? · ¿Bloqueando? · ¿Cómo desarrollo? | no | |
| Tarot del Dinero | `/tarot-del-dinero.php` → `tarot-dinero-j.php` → `tarot-dinero-r.php` | 5 | Base Financiera · ¿Dinero pronto? · ¿Dinero cerca? · ¿Quién o qué proyecto? · Resultado | sí | |
| Tarot Gitano | `/tarot-gitano.php` → `tarot-gitano-j.php` → `tarot-gitano-res.php` | 3 | Actual · Presente · Futuro (página: causa del problema / momento que vives / consejo) | — | **Mazo distinto**: 36 cartas del oráculo gitano ("Principal Masculino", "El Matrimonio", "Un viaje", "El Ancla"…), motor "Menta v1.8 gitano". |

### 1.3 Servicios de tarot sin elección de cartas
- **Pregúntale al Tarot / Pregúntale 1 carta** (`/consulta-tarot.php`, `/consulta-tarot-2.php`; "2 cartas" `/consulta-tarot-2c.php`): formulario → `tarot-email-envio.php` con nombre, sexo, **fecha de nacimiento** ("MUY IMPORTANTE! la consulta usa tus datos Astrológicos") y **pregunta en texto libre** (mín. 20 palabras, máx. 600 caracteres, "solo una pregunta… en primera persona"). Aviso en la página: *"Esta consulta será respondida mediante un sistema de inteligencia artificial… revisada por un integrante de LosArcanos.com"*; demora "1 minuto aprox."; gratuito; amenaza de bloqueo por abuso. **No lo ejecuté** (envía un email real). Es el único lugar donde la lectura depende de la pregunta.
- **Lectura Personalizada / Tarot por Email** (`/tarot-personalizado.php`): landing comercial del mismo servicio.
- **Carta del día = "Horóscopo Diario de Tarot"** (`/arcano_dia.php` → `arcano_hoy.php`): se ingresa fecha de nacimiento (no hay elección de carta); devuelve "una carta de tarot personalizada basada en tu fecha de nacimiento" con Amor, Trabajo, Salud, números de la suerte y consejo; permite ver ayer/mañana y suscribirse por email.
- **Arcano de Vida** (`/arcano-de-vida.php` → `arcano-de-vida-res.php`): arcano de nacimiento calculado desde la fecha.
- **Emociones Ocultas** (`/tarot-emociones-ocultas.php` → `tarot-memoria.php`): juego de memoria (encontrar pares) que "revela" un arcano mayor.
- **Aprender Tarot** (`/amp/aprender-tarot.php`): quiz de 10 preguntas: se muestra una descripción y hay que elegir entre 4 cartas.
- **Tarot 806** (`/tarot-806.php`): línea telefónica de pago solo España (806 50 1111) y tarot por Visa (911 229 587). Es el único servicio pago visible.

---

## 2. Las 78 cartas: nombres y URLs

Dos familias de fichas por carta:
- **"Significado Tarot"** (`/cartas-tarot.php` índice; palos en `/cartas-bastos.php`, `/cartas-copas.php`, `/cartas-espadas.php`, `/cartas-oros.php`): ficha corta en `/significado-tarot/{slug}.php`, con derecha, invertida, sugerencias, aspectos negativos, palabras clave.
- **"Baraja de Los Arcanos"** (`/baraja-de-tarot-losarcanos.php`): ficha larga en `/tarot-{slug}.php` con descripción extensa, cartas afines/contrarias y combinaciones.

**Arcanos mayores (22)**, nombres y numeración del sitio: 0 El Loco · I El Mago · II La Sacerdotisa (la ficha imprime "[III]" por error) · III La Emperatriz · IV El Emperador · V El Sumo Sacerdote · VI Los Enamorados · VII El Carro · **VIII La Justicia · XI La Fuerza** (orden Marsella, no Rider‑Waite) · IX El Ermitaño · X La Rueda de la Fortuna · XII El Colgado · XIII La Muerte (en las lecturas aparece como "LA TRANSFORMACIÓN") · XIV La Templanza · XV El Diablo · XVI La Torre · XVII La Estrella · XVIII La Luna · XIX El Sol · XX El Juicio · XXI El Mundo. Slugs: `el-loco, el-mago, la-sacerdotisa, la-emperatriz, el-emperador, el-sumo-sacerdote, los-enamorados, el-carro, la-justicia, el-ermitano, la-rueda-de-la-fortuna, la-fuerza, el-colgado, la-muerte, la-templanza, el-diablo, la-torre, la-estrella, la-luna, el-sol, el-juicio, el-mundo`.

**Arcanos menores (56)**: palos **Bastos, Copas, Espadas, Oros**; rangos `as, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez, doncella, caballero, reina, rey` → slug `{rango}-de-{palo}` (p. ej. `/significado-tarot/doncella-de-copas.php`). El H1 de la ficha los nombra como "1 de Bastos", "12 de Copas" (As=1, Doncella=11, Caballero=12, Reina=13, Rey=14). Dentro de la ficha las figuras llevan doble nomenclatura: "Princesa [Sota] de Bastos", "Príncipe [Caballero] de Bastos", "Reina de Bastos", "Caballero [Rey] de Bastos" (nomenclatura Thoth entre corchetes la tradicional).

Listado completo con URLs en el JSON (campos `url` y `url_baraja`).

---

## 3. Significados: estructura y extracción

Estructura de una ficha `/significado-tarot/{slug}.php` (ej. `https://www.losarcanos.com/significado-tarot/el-loco.php`):
1. H1 "Tarot EL LOCO" → "Significado de EL LOCO" → línea de título con numeral y alias ("[I] El Mago, El Alquimista, El Prestidigitador") → **texto al derecho** (estilo telegráfico, listas de sustantivos: "Carencia de sentido común. Potencial fuerza de voluntad…") → "Posición Invertida:" → **texto invertido**.
2. "Sugerencias de Tarot …" (consejos en imperativo).
3. "Aspectos negativos de Tarot …" (lista de adjetivos).
4. "Palabras claves de Tarot …" (lista separada por comas).
5. Enlaces a artículos del blog y navegación a las demás cartas.

Estructura de la ficha larga `/tarot-{slug}.php` (ej. `https://www.losarcanos.com/tarot-el-loco.php`): "¿Que significa El Loco en el Tarot?" (3–5 párrafos narrativos), mismas sugerencias/negativos/palabras clave, **"Relaciones con otros Arcanos"** → "Cartas Afines" (p. ej. El Loco: El Carro, La Estrella) y "Cartas Contrarias" (El Emperador, La Justicia) con una frase de justificación; "Combinaciones del El Loco" (21 enlaces a parejas de mayores + 3 tríadas destacadas); bloque "Baraja exclusiva de Los Arcanos" con las 78 cartas; "Tipos de Tarot"; FAQ.

**El sitio NO separa amor / trabajo / salud / dinero en las fichas.** Esos ejes aparecen solo como *posiciones* de tiradas (Oráculo, Amor, Dinero) y en el Horóscopo Diario. En el JSON van en `null`.

**Resultado de la extracción: 78/78 fichas** con `derecha` e `invertida` y `descripcion_larga`, `cartas_afines`, `cartas_contrarias`. **72/78 con palabras clave**: faltan en 6 fichas que no tienen las secciones de sugerencias/negativos/palabras clave: `caballero-de-copas`, `diez-de-espadas`, `caballero-de-espadas`, `rey-de-espadas`, `ocho-de-oros`, `diez-de-oros`.

JSON: `/private/tmp/claude-501/-Users-gabrielsk-Documents-Proyects-Humano-despierto/8ecf9654-0e28-4bf1-aa36-a871c61cd396/scratchpad/research/losarcanos-cartas.json` — objeto `{meta, cartas[78]}`; cada carta: `numero, numeral_sitio, nombre, titulo_sitio, slug, arcano ("mayor"|"menor"), palo, palabras_clave[], derecha, invertida, sugerencias, aspectos_negativos, descripcion_larga, cartas_afines, cartas_contrarias, relacion_arcanos, amor, trabajo, salud, dinero (null), url, url_baraja`.

---

## 4. Combinaciones

Índice: `https://www.losarcanos.com/combinaciones.php` (572 enlaces) y `https://www.losarcanos.com/combinacion-3-tarot.php`. Familias de URL:
- **Pares de mayores** (462 = 22×21, ambas direcciones): `/combinaciones/{a}-y-{b}.php`. Ej. `https://www.losarcanos.com/combinaciones/el-loco-y-el-mago.php`: "Emparejamiento de EL LOCO Y EL MAGO" (lista de frases), y **cuatro variantes por inversión**: "EL LOCO Invertido y EL MAGO" ("Amor por quien no lo merece"), "EL LOCO y EL MAGO Invertido" ("Amor poco aconsejable"), "EL LOCO y EL MAGO invertidos los dos" ("Impotencia"). Más 6 tríadas sugeridas.
- **Mayor + 56 menores** (22 páginas índice `/combinaciones/{mayor}-mx.php`, cada una con 56 enlaces `/combinaciones/{mayor}-{menor}-am.php`). Ej. `https://www.losarcanos.com/combinaciones/elloco-asdeespadas-am.php`: título SEO ("Libertad con Claridad"), "Sinergia entre…", "Palabras Claves de esta relación", y las tres variantes invertidas. Total implícito ≈1.232 páginas.
- **Tríadas de mayores**: `/combinaciones/combinacion-3-{mayor}.php` (22 índices paginados, ~60 tríadas cada uno) → `/combinaciones/{a}-y-{b}-y-{c}-tc.php`. Ej. `https://www.losarcanos.com/combinaciones/el-loco-y-el-emperador-y-el-carro-tc.php`: "Triada Arcana" (frase de síntesis), "Significado Individual" de cada carta, "Interpretación de la Combinación" con subtítulos ("El Viaje Dinámico", "Construyendo Sobre Cimientos Sólidos", "El Éxito de la Integración"). Redacción homogénea tipo generada.
- El texto de `combinacion-3-tarot.php` explica el enfoque: "las cartas adyacentes pueden formar una narrativa secuencial, como un desafío seguido de una solución"; hay un buscador con 3 selects (Carta 1/2/3) limitado a mayores.

**Lo que NO existe en el sitio:** no hay reglas de lectura relacional tipo "de dónde viene / hacia dónde va", dirección de la mirada de los personajes, carta de síntesis sumando numerales, ni ponderación por cantidad de mayores/palos. Las únicas nociones relacionales son: afines/contrarias por carta, y la carta 7 "Síntesis" en Espejo del Alma. En las tiradas, el resultado **no cruza cartas entre sí** (salvo Sí/No de 2 cartas, que sí emite un texto único por pareja).

---

## 5. Cómo genera la lectura

Verificado enviando cartas elegidas por POST a los scripts de resultado:
- **Texto por carta × posición, concatenado, sin síntesis** (PPF, Celta, Amor, Oráculo). Ej. `tarot-ppf-res-mf.php` con `A=011,220,051,`: "Pasado — EL MAGO (INVERTIDO): Esta carta nos muestra que en el pasado tu actitud fue más bien déspota…", "Presente — EL LOCO: Es un buen momento para realizar viajes…", "Futuro — EL SUMO SACERDOTE (INVERTIDO): …". El texto está redactado **específicamente para esa posición** (habla en pasado/presente/futuro) y para la inversión → el sitio mantiene una tabla aproximada de 22 cartas × 2 estados × N posiciones por tirada. En Amor: "EL SOL Y LA AMISTAD: Tiempo propicio para el compañerismo…".
- En la Cruz Celta cada bloque es: definición genérica de la posición + nombre de carta (+ "(INVERTIDO)") + párrafo.
- **No varía por pregunta** (no se pide), **ni por mazo**, **ni por sexo** (comprobado con mismas cartas). Varía por inversión.
- Sí/No 1 carta: un párrafo con veredicto embebido + "Consejo". Sí/No 2 cartas: título + "Consejo" por pareja (sin invertidas).
- El Oráculo de 12: en mi fetch sin navegador el resultado trajo la cabecera y el nombre de cada carta por tema pero `div.txtdetalle` vacío. **No pude verificar el texto del Oráculo**; es probable que el servidor exija sesión o un parámetro adicional (`B`, `V5`).
- Se muestra nombre y fecha; no hay persistencia ni URL compartible (la página de resultado es la respuesta a un POST).

---

## 6. Otras barajas ofrecidas (solo lista)

- En el selector de las tiradas: Los Arcanos (propia), Marsella, Rider, Legacy, Moon Garden, Gilded Tarot, Dream (`/tarot_pre.php`).
- Páginas de baraja: `/baraja-de-tarot-losarcanos.php`, `/tarot-rider-waite.php` (22 mayores con imágenes Rider; afirma, erróneamente, "Siglo XVIII"), `/tarot-de-marsella.php`, `/tarot-egipcio.php` (+ curso `/cursos/tarot_egipcio/`), `/tarot-gitano.php` (36 cartas).
- "Museo" en `/tipos-de-tarot.php`: 45 barajas listadas (Witches, Heavenly Host, Triple Diosa, Steampunk, Star, Marchetti, Thelema, Oráculo del Universo, Disney Villains, Fatum, Nightmare Before Christmas, Book of Shadows, Navideño, Angel Deck, Bruja Moderna, Arcane Limbus, Art Nouveau, Fuerzas Ocultas, Celestial, Grand Luxe, True Black, Celtic Dragon, Círculo Sagrado, Connolly, Light Seer's, Osho Zen, Titanic, Cosmic, Diosas de la Nueva Luz, Fenestra, Gilded, Moon Garden, Ibis, Revelations, Angélico, Tarot of Dreams, Spacious, Angel Voices, Sol y Luna, The Muse…).
- Otros oráculos del sitio: Runas, I‑Ching, Consulta Angélica, Numerología, Carta Astral, etc.

---

## 7. Modelo de negocio, UX y SEO

- **Gratuito con publicidad**: Google AdSense (`ca-pub-6365311543536420`, 6 bloques en home), CMP de Clickio, Vidoomy; GA4 `G-59NE5FHD8X`. "Todos los servicios de Los Arcanos son totalmente gratis" (`/mas-arcanos.php`). Ingresos adicionales: línea 806 (España), newsletter (`/suscripcion-news.php`), cursos gratuitos, clasificados gratis, app Android mencionada en `/mas-arcanos.php` (no encontré el enlace a Play Store en la home).
- **Sin registro ni guardado**: la política (`/pprivacidad.php`) afirma "no pedimos datos personales… ni guardamos ningún tipo de datos personales"; no hay login, historial ni URLs de tiradas. El nombre solo personaliza el saludo.
- **Stack**: PHP clásico (`.php`), jQuery 3.2.1 + Materialize 1.0.0, SoundJS, hls.js, Delius de Google Fonts, imágenes en `img.losarcanos.com` / `tarot.losarcanos.com`. Versión inglesa en `/en/` (164 URLs en el sitemap), AMP en `/amp/`.
- **SEO**: URLs planas con slug en español y `.php`; familias `tarot-*.php` (tiradas y fichas largas), `significado-tarot/*.php` (fichas cortas), `combinaciones/*.php` (≈1.800 páginas programáticas), `cartas-{palo}.php`, `tarot-articulos/*-art.php` (blog), `cursos/`, `pregunta/`. Sitemap de 558 URLs (`/sitemap.xml`; no incluye las fichas de combinaciones). JSON‑LD `Organization` + `WebSite` (SearchAction) + `WebPage` + `Article` + `Person` en cada página. Mucho texto SEO repetitivo en cada tirada ("Preguntas al Tarot: ¿Qué siente por mí?, ¿Volveré con mi ex?…"). `robots.txt` casi vacío.
- **UX observada en código**: formularios de entrada mínimos; paso 2 inmersivo (música, video, animación de mezcla, "Elige tu Arcano para: X"); resultado como página larga con imágenes y párrafos; CTA cruzados a otras tiradas y al tarot por email; disclaimer de IA en la consulta personalizada.

---

## 8. Lo que NO pude verificar

- Texto de la lectura del **Oráculo de 12 cartas** (resultado vino con detalle vacío fuera de navegador).
- Rótulos de las 4 posiciones del **Tarot Lunar** (el paso 2 solo rotula la primera con la fecha de luna llena).
- Contenido real de la **consulta por email/IA** (no envié el formulario) y del **Horóscopo Diario** / **Arcano de Vida** (no envié fechas).
- Si el servidor valida que las cartas del POST sean las "sorteadas" (parece aceptar cualquier lista: acepté `A=011,220,051,` sin sesión).
- Apariencia real (animaciones, layout) — inferida del JS/CSS, no vista en navegador.
