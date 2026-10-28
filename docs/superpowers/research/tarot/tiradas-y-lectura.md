# Tiradas y lectura combinada del tarot — informe para un motor de lecturas

Investigación de solo lectura (web), 2026-10-27. Objetivo: que el motor genere lecturas coherentes
(hilo entre cartas, dirección temporal, síntesis), no una concatenación de significados sueltos.

Convenciones del informe:
- Todas las coordenadas de layout son relativas en una grilla: `x` crece a la derecha, `y` crece hacia abajo.
  `rotada: true` = carta cruzada 90° (solo la posición 2 de la cruz celta).
- Las fuentes se citan por URL al final de cada bloque. Donde la fuente primaria no pudo leerse
  (403/404) se indica y se cita la mejor secundaria.
- "RWS" = Rider-Waite-Smith. "TdM" = Tarot de Marsella.

El JSON con la estructura de tiradas está en `tiradas.json` en esta misma carpeta.

---

## PARTE A — Tiradas (spreads)

Nota general de criterio: fuera de la cruz celta de Waite (1911), **no existe un estándar**. Cada sitio
numera y nombra las posiciones a su manera; Labyrinthos, Biddy, TeachMeTarot y los sitios en español
coinciden en la intención de cada posición pero no en el orden. El motor debería tratar cada tirada como
una **definición de datos** (posiciones con significado) y no como una verdad canónica. Donde hay
variantes documentadas se listan.

### A.1 Carta del día / una carta (ES: "carta del día", EN: "card of the day", "one-card pull")
- **Cartas:** 1.
- **Layout:** (0,0).
- **Posición 1 — "Mensaje / energía del día":** la energía, tendencia o aprendizaje de un periodo de 24 h;
  también sirve como respuesta simple a una pregunta concreta.
- **Para qué sirve:** guía diaria, práctica de aprendizaje, respuesta rápida. Astrostyle (ES) la describe
  como "sacar una carta y obtener una respuesta o idea simple... lecturas rápidas o guía diaria".
- **Cómo se lee (importante para el motor):** mirar primero la imagen y la "primera sensación"; si se sacan
  varias, cuenta la primera y las demás son matiz (astrosofa). Se recomienda formularla como pregunta
  abierta ("¿qué energía me acompaña hoy?") y relacionar la carta con el dilema del momento, no como
  predicción fija.
- **Variantes:** carta del día + "carta sombra" (la de abajo del mazo) como influencia inconsciente
  (angelorum); "carta de consejo" adicional.
- Fuentes: https://astrostyle.com/es/tarot/tiradas-de-tarot/ ·
  https://www.astrosofa.com/ar/Esoterismo/Tarot/Carta-del-tarot-del-d%C3%ADa-saca-la-tuya ·
  https://angelorum.co/tarot-spreads/the-only-tarot-spread-youll-ever-need/

### A.2 Sí / No con una carta (ES: "sí o no", EN: "yes/no one-card")
- **Cartas:** 1. **Layout:** (0,0).
- **Posición 1 — "Respuesta":** la carta se evalúa como sí / no / depende (ver B.8 para las reglas).
- **Para qué sirve:** preguntas binarias ("¿me llamará?", "¿me conviene aceptar?").
- **Regla básica (Biddy, técnica 1):** derecha = sí, invertida = no; exige un mazo con mezcla
  equilibrada de derechas/invertidas (cortar el mazo y girar una parte 180°). Que.es (ES) repite la misma
  regla: "las cartas invertidas significan no... solo funciona si las cartas se mezclan sobre la mesa".
- **Variantes:** "sí, si… / no, si…" (Biddy técnica 4): sacar una segunda carta que indica la condición;
  "favorable / desfavorable" en lugar de sí/no (técnica 3).
- Fuentes: https://biddytarot.com/?p=21707 (BTP34, "5 Sure-Fire Ways to Answer Yes/No") ·
  https://www.que.es/2021/03/11/tarot-si-o-no-lectura-te-ayudara-tomar-decisiones/

### A.3 Sí / No con tres cartas (EN: "three-card yes/no", "majority yes/no")
- **Cartas:** 3. **Layout:** (0,0) (1,0) (2,0).
- **Posiciones:** 1 "Primer voto", 2 "Segundo voto (centro)", 3 "Tercer voto". Cada carta se puntúa
  sí/no/depende y gana la mayoría (selfgazer: "If two or three cards indicate yes, the answer is yes").
- **Variantes documentadas:**
  - Variante 5 cartas con centro doble (que.es / periódico de Ibiza vía búsqueda): "si la mayoría sale en
    posición normal, sí; invertida, no. La carta del centro vale el doble". Elimina empates en 3 cartas si se
    aplica también ahí (centro vale 2 → 1+2+1 = 4 votos, aún puede empatar 2-2; ver B.8).
  - Variante "respuesta / razones / consejo" (jenova.ai vía búsqueda): 1 = sí/no principal, 2 = por qué,
    3 = consejo. Más útil para generar texto que el voto crudo.
  - Labyrinthos, "4 yes/no spreads" (3 cartas c/u): *Factores a favor / Factores en contra / Lo que más
    necesitás saber*; *Mente / Cuerpo / Espíritu* (para "¿debería…?"); *Presente / Pasos / Meta*; *Si sí /
    Si no / Guía*. Labyrinthos aclara que su objetivo es "convertir preguntas de sí/no en guía con contexto,
    no en respuestas planas".
- Fuentes: https://www.selfgazer.com/blog/tarot-yes-or-no-cards-list ·
  https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/how-to-answer-yes-no-questions-with-tarot-4-yes-or-no-tarot-spreads ·
  https://www.que.es/2021/03/11/tarot-si-o-no-lectura-te-ayudara-tomar-decisiones/

### A.4 Pasado – Presente – Futuro (ES: "tirada simple / de tres cartas", EN: "three-card spread")
- **Cartas:** 3. **Layout:** (0,0) (1,0) (2,0), de izquierda a derecha.
- **Posiciones:** 1 Pasado — "origen de la situación, lo que ya influyó"; 2 Presente — "estado actual,
  energía que se vive ahora"; 3 Futuro — "hacia dónde tiende si nada cambia / lo que viene".
- Benebell Wen matiza: izquierda = "influencias pasadas que informan hacia dónde va", centro = la
  influencia "que viene encima" (más que un mero presente), derecha = "hacia dónde es más probable que se
  dirija".
- **Para qué sirve:** cualquier pregunta abierta; es la tirada de entrenamiento universal.
- **Variantes de 3 lineales (Univision ES, Labyrinthos EN):** mente/cuerpo/espíritu; tú/tu pareja/la
  relación; pensamientos/sentimientos/acciones; fortalezas/debilidades/consejo; situación/acción/resultado;
  lo que te une/lo que te separa/en qué enfocarte (astrostyle); opción A/opción B/cómo decidir.
- **Variante con 4ª carta por suma** (El Diario NY): se suman los números de las tres y si pasa de 22 se
  reduce (24 → 2+4 = 6); la 4ª carta es "el resultado". Es la "quintaesencia" (ver B.5).
- **Variante cruzada** (Labyrinthos): carta 2 cruzada sobre la 1 = "lo que bloquea"; 3 = consejo a
  distancia. (Univision describe también la "expansión de 9": tres columnas de 3 = pasado/presente/futuro.)
- Fuentes: https://benebellwen.com/2014/04/01/your-tarot-spreads-repertoire/ ·
  https://www.univision.com/horoscopos/las-distintas-formas-de-leer-las-cartas-tarot-fotos ·
  https://eldiariony.com/?p=2474150 · https://astrostyle.com/tarot/tarot-spreads-for-love-and-relationships

### A.5 Situación – Obstáculo – Consejo (EN: "situation / challenge / advice")
- **Cartas:** 3. **Layout:** (0,0) (1,0) (2,0).
- **Posiciones:** 1 Situación — "qué está pasando realmente (no lo que el consultante cree)";
  2 Obstáculo / Desafío — "el verdadero bloqueo"; 3 Consejo / Acción — "la acción más alineada".
- Angelorum la llama "la única tirada que vas a necesitar" y la lee así: primero la quintaesencia (tema),
  después 1→2→3, después la carta sombra (que "suele aclarar el Desafío").
- **Variante:** Labyrinthos "crossed" (obstáculo cruzado sobre la situación). Univision: "fortalezas /
  debilidades / consejo o reto".
- Fuentes: https://angelorum.co/tarot-spreads/the-only-tarot-spread-youll-ever-need/ ·
  https://www.univision.com/horoscopos/las-distintas-formas-de-leer-las-cartas-tarot-fotos

### A.6 Tirada del amor, 3 cartas (ES: "tú / la otra persona / la relación")
- **Cartas:** 3. **Layout:** Labyrinthos: dos cartas a los lados y la tercera **en el medio** (0,0) (2,0)
  (1,0). Astrostyle/Univision: lineal 1-2-3.
- **Posiciones:** 1 Tú — "tu rol y cómo te ves"; 2 La otra persona — "su rol y cómo la ves";
  3 La relación / Dinámica — "la tercera entidad que se forma" (astrostyle), "carácter general del vínculo".
- **Variantes:** "lo que vos querés / lo que quiere / el futuro"; "lo que une / lo que separa / en qué
  enfocarse"; "interés 1 / interés 2 / cómo decidir" (astrostyle).
- Fuentes: https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/examining-relationships-with-tarot-3-love-tarot-spreads-to-understand-you-your-partner ·
  https://astrostyle.com/tarot/tarot-spreads-for-love-and-relationships

### A.7 Tirada del amor, 5 cartas (EN: "5-card cross love spread")
- **Cartas:** 5.
- **Layout (Labyrinthos, cruz):** columna central vertical de 3 (pasado arriba, presente centro, futuro
  abajo) y una carta a cada lado: Tú (0,1), Otra persona (2,1), Pasado (1,0), Presente (1,1), Futuro (1,2).
- **Posiciones (Labyrinthos):** 1 Tu rol; 2 Rol de tu pareja; 3 Fundamento pasado — "cómo empezó, qué
  los unió"; 4 Estado presente — "dinámica actual"; 5 Futuro que asoma — "hacia dónde va si sigue igual".
- **Variantes:** astrostyle lineal "Tú / Otro / Relación / Pasado / Futuro" y "Tus deseos / Sus deseos /
  Tema / Desafíos / Potencial" (la 5ª "no es un sí/no simple"); angelorum "Relationship Dynamics":
  tu rol / su rol / fortaleza / obstáculos / consejo-resultado.
- Fuentes: ídem A.6 · https://angelorum.co/topics/divination/desire-action-outcome-relationship-tarot-spread/

### A.8 Cruz simple, 5 cartas (ES: "cruz simple / tirada en cruz", EN: "five-card cross")
- **Cartas:** 5. **Layout:** fila central Pasado (0,1) Presente (1,1) Futuro (2,1); Razón/raíz abajo (1,2);
  Potencial arriba (1,0).
- **Posiciones (HowStuffWorks + Univision ES):** 1 Pasado; 2 Presente; 3 Futuro; 4 Razón — "por qué
  ocurren las cosas / la causa de fondo"; 5 Potencial — "lo que puede manifestarse / el mejor desarrollo".
  Univision: "arriba, el potencial a seguir; abajo, la razón por la que ocurren las cosas".
- **Variantes:** cruz de 4 (El Diario NY): izquierda situación, derecha entorno, arriba pensamientos/ánimo,
  abajo desenlace. Benebell Wen "simple cross": significador al centro, pasado/presente/futuro a los lados,
  arriba "lo que podría manifestarse", abajo "lo subconsciente". Univision: extensible a 7 hacia abajo
  (premisa / evolución / consejo final). HowStuffWorks "rectángulo": tema en el centro y 4 alrededor.
- Fuentes: https://science.howstuffworks.com/science-vs-myth/extrasensory-perceptions/tarot-card-spreads.htm (vía búsqueda; la página devolvió vacío al fetch) ·
  https://www.univision.com/horoscopos/las-distintas-formas-de-leer-las-cartas-tarot-fotos ·
  https://eldiariony.com/?p=2474150 · https://benebellwen.com/2014/04/01/your-tarot-spreads-repertoire/

### A.9 Herradura, 7 cartas (ES: "tirada de la herradura", EN: "horseshoe spread")
- **Cartas:** 7. **Layout:** V o U abierta hacia arriba, se lee desde abajo a la izquierda en sentido
  horario (La Opinión): 1 (0,2) · 2 (1,1) · 3 (2,0) · 4 (3,0) · 5 (4,0) · 6 (5,1) · 7 (6,2).
  (Univision: "tres a cada lado y una al final"; TeachMeTarot numera 1-7 sin diagrama.)
- **Posiciones (La Opinión ES, citando El Mago Arcano):** 1 Pasado — "lo que originó el problema";
  2 Presente — "situación actual"; 3 Futuro cercano — "lo que pasará y lo que conviene hacer";
  4 Resultado actual y estrategia — "estado del problema y estrategias para resolverlo"; 5 Entorno —
  "postura de las personas cercanas"; 6 Obstáculos — "lo que se interpondrá"; 7 Resultado final.
- **Variante EN (TeachMeTarot):** 1 Pasado (2 semanas a 2 años atrás, causa raíz); 2 Presente (±3-4
  semanas; las cortesanas aquí son personas involucradas); 3 Futuro cercano (3-4 meses; mayores = más
  difícil de cambiar); 4 La respuesta / consejo (la posición "más confusa": puede ser deseo, consejo o
  postura propia; leerla al final); 5 Energía circundante (cómo lo ven otros, agendas ocultas);
  6 Esperanzas y miedos (carta negativa = miedo, positiva = esperanza); 7 Resultado probable.
  Variante "estándar" EN: pasado / presente / influencias ocultas / obstáculos / actitud de otros /
  qué hacer / resultado.
- **Guía de lectura en conjunto (TeachMeTarot):** leer primero la "carta base" (última del mazo); mirar
  cartas opuestas y diagonales; notar hacia dónde miran las cortesanas y qué tienen enfrente; Respuesta
  y Resultado ambas derechas = "sí" más claro; no abrir con una Respuesta negativa.
- Fuentes: https://laopinion.com/2020/07/05/como-es-la-tirada-de-la-herradura-en-el-tarot/ ·
  https://teachmetarot.com/spreads/the-horse-shoe-spread ·
  https://www.univision.com/horoscopos/las-distintas-formas-de-leer-las-cartas-tarot-fotos

### A.10 Cruz celta — versión original de Waite (1911)
Fuente primaria: *The Pictorial Key to the Tarot*, Parte III §7 "An Ancient Celtic Method of
Divination". sacred-texts.com devolvió 403; se leyó el espejo
https://neonvagabond.xyz/mirrors/sacred-texts/tarot/pkt/pkt0307.htm (texto íntegro). Resumen fiel:

- **Significador:** se elige antes y queda boca arriba. Para personas: Caballero = hombre de 40 o más,
  Rey = hombre más joven, Reina = mujer de 40 o más, Paje = mujer joven; palo por colorido (Bastos claros,
  Copas castaño claro, Espadas ojos avellana/grises y pelo castaño oscuro, Oros muy morenos), ajustable por
  temperamento. Para un asunto, un Triunfo o carta menor afín (ej. la Justicia para un pleito).
- **Procedimiento:** se mezcla y se corta tres veces; se dan vuelta diez cartas, las seis primeras en cruz
  alrededor del Significador y las cuatro restantes en línea a la derecha. Si el Significador no tiene
  dirección propia, se decide antes hacia dónde "mira".
- **Las diez frases de Waite:**
  1. *"This covers him"* — la influencia general que afecta el asunto, "la atmósfera en que operan las
     otras corrientes".
  2. *"This crosses him"* — la naturaleza de los obstáculos; si la carta es favorable, los obstáculos
     pueden ser menores.
  3. *"This crowns him"* — el objetivo o ideal del consultante; lo mejor alcanzable en las circunstancias.
  4. *"This is beneath him"* — el fundamento del asunto; lo que ya pasó y el consultante hizo suyo.
  5. *"This is behind him"* — la influencia que acaba de pasar o está pasando.
  6. *"This is before him"* — la influencia que entrará en acción en el futuro cercano.
  7. *"Himself"* — la posición o actitud del propio consultante en las circunstancias.
  8. *"His house"* — su entorno y tendencias que afectan el asunto (posición en la vida, amigos cercanos).
  9. *"His hopes or fears"* — esperanzas y temores en el asunto.
  10. *"What will come"* — el resultado final, culminación de las influencias de las otras cartas.
- **Reglas de continuación:** si la 10 es una **cortesana**, el asunto queda en manos de esa persona; se
  recomienda una nueva tirada usando esa carta como Significador. Si la 10 es ambigua, se repite todo
  usando la carta 10 como nuevo Significador para detallar "lo que vendrá".
- **Dirección del pasado/futuro:** en el original, 5 ("behind") y 6 ("before") dependen de hacia dónde
  mira el Significador: "estas dos se invierten si el Significador mira a la izquierda" (TeachMeTarot
  conserva esa regla). Es la mayor diferencia mecánica con la versión moderna, donde pasado siempre va a
  la izquierda.
- **Layout (grilla):** Sig (1,1, debajo de la 1), 1 (1,1), 2 (1,1 rotada), 3 (1,0), 4 (1,2), 5 (0,1),
  6 (2,1), 7 (3,3), 8 (3,2), 9 (3,1), 10 (3,0). El bastón se lee de abajo hacia arriba.
- Fuentes: espejo citado · https://teachmetarot.com/celtic-cross-spread/how-to-read-the-celtic-cross-spread
  (tabla "Waite 1911 vs moderna").

### A.11 Cruz celta — versión moderna (Biddy / Labyrinthos / TarotElements / Univision)
Mismo layout, significados reasignados. Hay **dos familias** de numeración: (a) "Waite-moderna"
(TeachMeTarot, TarotElements) mantiene 3 arriba / 4 abajo / 5 izquierda / 6 derecha; (b) "Labyrinthos /
Univision" mueve pasado-futuro al eje horizontal como 3 y 4 y consciente/inconsciente al vertical como
5 y 6. El motor debería elegir una y documentarla; abajo la (a), con la (b) como variante.

- **Posiciones (familia a, TarotElements + TeachMeTarot):**
  1. Corazón del asunto / Presente — cómo lo ve el consultante y qué pasa ahora.
  2. Lo que cruza / Desafío — se lee siempre derecha; confirma o contradice a la 1; ayuda o estorba.
  3. Lo que corona / Objetivo o mejor resultado posible — metas, ideal, "Yo superior"; también
     "resultado posible si no se hace nada" (TarotElements la llama "Possible Outcome"; TeachMeTarot "Crown").
  4. Lo que está debajo / Raíz — causa profunda, condicionamiento subconsciente; invertida = el consultante
     no la ve.
  5. Lo que queda atrás / Pasado reciente — lo que originó la situación y se está yendo.
  6. Lo que viene / Futuro cercano — semanas o meses; "responder, no reaccionar".
  7. El consultante — su actitud; en lectura moderna, **la carta de acción/consejo** ("the breakthrough card").
  8. Su casa / Entorno — opiniones ajenas, familia, tendencias; ¿apoya o estorba?
  9. Esperanzas y temores — chequear si son realistas contra el resto; conecta intención con resultado.
  10. Resultado probable — si se sigue el curso actual; idealmente armoniza con la 3.
- **Familia (b), Labyrinthos:** 1 Presente/Yo; 2 Problema; 3 Pasado; 4 Futuro (desarrollo probable, no
  resolución final); 5 Consciente (metas, supuestos); 6 Inconsciente (creencias ocultas); 7 Tu influencia;
  8 Influencia externa; 9 Esperanzas y temores ("pueden ser lo mismo"); 10 Resultado (resumen de las
  anteriores; si es desfavorable, el resto sugiere otro curso). Univision (ES) usa una numeración mixta
  (3 "meta o destino" arriba, 4 "pasado" abajo, 5 "influencia futura" izquierda, 6 "deseos conscientes"
  derecha) que no conviene copiar: su 5 contradice el eje temporal de todas las demás.
- **Estructura interna que todas comparten (clave para el hilo narrativo):**
  - *Cruz pequeña* (1+2) = la escena. *Cruz grande* (1-6) = situación interna/externa. *Bastón* (7-10) =
    "el mundo exterior / la vida fuera del asunto y cómo cambiarlo" (Labyrinthos, TarotElements).
  - *Eje temporal horizontal:* 5 → 2 → 6 (pasado, cruce, futuro). *Eje de conciencia vertical:* 4 → 1 → 3
    (raíz, presente, aspiración). Labyrinthos: "la horizontal es tiempo, la vertical es conciencia".
- **Pares que se leen juntos (TeachMeTarot + Labyrinthos + TarotElements):**
  1-2 (¿el cruce apoya o socava?), 3-4 (¿objetivo consciente vs motor inconsciente alineados?),
  3-10 (¿el resultado cumple el objetivo?), 2-8 (¿el desafío viene de afuera?), 2-10 (¿el resultado
  supera el desafío?), 6-7 (¿el futuro cercano lleva a la acción aconsejada?), 4-9 (¿los miedos nacen
  del subconsciente?), 5-6 (pasado→futuro como movimiento), 7-9-10 (intención → resultado).
- **Escaneo previo recomendado (TeachMeTarot):** ¿3 y 10 concuerdan?; mayores (peso extra; mayor
  invertido en 10 = difícil de mover); palo dominante y palo ausente; cortesanas (¿persona o energía?);
  invertidas (en 4 = patrón inconsciente).
- Fuentes: https://tarotelements.com/?p=1288 ·
  https://teachmetarot.com/celtic-cross-spread/how-to-read-the-celtic-cross-spread ·
  https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/the-celtic-cross-tarot-spread-exploring-the-classic-10-card-tarot-spread ·
  https://www.univision.com/horoscopos/las-distintas-formas-de-leer-las-cartas-tarot-fotos
  (Biddy: la página de la cruz celta es un podcast sin transcripción:
  http://www.biddytarot.com/podcast/celtic-cross-tarot-spread/)

### A.12 Árbol de la Vida, 10 cartas (EN: "Tree of Life spread")
- **Cartas:** 10, una por sefirá. **Layout (tres pilares):** pilar derecho/Misericordia: 2 Jojmá (2,1),
  4 Jésed (2,2), 7 Nétsaj (2,3); pilar izquierdo/Severidad: 3 Biná (0,1), 5 Guevurá (0,2), 8 Hod (0,3);
  pilar medio: 1 Kéter (1,0), 6 Tiféret (1,2.5→usar 1,2), 9 Yesod (1,4), 10 Maljut (1,5).
  (Convención: en el diagrama "mirado de frente", Jojmá queda a la derecha del lector; muchas imágenes lo
  espejan. Corax advierte que muchos diagramas publicados tienen errores de atribución.)
- **Posiciones (Mysticryst, con la esencia cabalística de Corax):**
  1 Kéter — propósito espiritual / lo más alto del asunto; 2 Jojmá — fuerza creativa, impulso, iniciativa;
  3 Biná — comprensión, forma, límites; 4 Jésed — expansión, recursos, generosidad; 5 Guevurá — disciplina,
  conflicto, lo que hay que cortar; 6 Tiféret — el centro, el yo verdadero, equilibrio; 7 Nétsaj —
  emociones, deseo, instinto; 8 Hod — intelecto, comunicación, estructura; 9 Yesod — inconsciente,
  fundamentos, imaginación; 10 Maljut — manifestación material, resultado concreto.
- **Para qué sirve:** panorama de vida o tema profundo; Rachel Pollack dedica a esta tirada (con todo el
  mazo) una sección de *Seventy-Eight Degrees of Wisdom* (según reseñas; no se pudo leer el texto).
- **Variantes:** Pollack usa el mazo completo repartido en los diez montones; otras versiones leen por
  pilares (derecho = fuerza/activo, izquierdo = forma/receptivo, medio = integración) y por triángulos
  (1-2-3 espiritual, 4-5-6 moral/emocional, 7-8-9 psicológico/instintivo, 10 físico).
- Fuentes: https://mysticryst.com/blogs/the-mystic-journal/tree-of-life-spread-10-card-kabbalah-layout ·
  https://corax.com/tarot/tree-of-life.html · https://www.aeclectic.net/tarot/books/78-degrees-of-wisdom/

### A.13 Año / 12 meses (ES: "tirada anual / rueda del año", EN: "year ahead / wheel of the year")
- **Cartas:** 12 + 1 tema = 13.
- **Layout:** círculo tipo reloj, enero a las 12 y sentido horario (booktarot); tema en el centro.
  Grilla 5×5: centro (2,2); meses en las posiciones de reloj: 1 (2,0), 2 (3,0), 3 (4,1), 4 (4,2), 5 (4,3),
  6 (3,4), 7 (2,4), 8 (1,4), 9 (0,3), 10 (0,2), 11 (0,1), 12 (1,0).
- **Posiciones:** 1-12 "la pregunta que ese mes te va a hacer" (booktarot insiste: marco, no pronóstico);
  13 Tema del año — "el registro del año"; se lee antes y después de los meses y colorea cada uno.
- **Variantes:** 12 casas astrológicas en lugar de meses (Univision "zodíaco": Aries situación, Tauro
  dinero, Géminis comunicación, Cáncer hogar, Leo placer/romance/creatividad, Virgo trabajo/salud, Libra
  relaciones, Escorpio cambios, Sagitario conocimiento, Capricornio ambiciones, Acuario comunidad, Piscis
  retos; empieza a las 9 y va antihorario); 14 cartas con "lección" abajo; versión de 6 meses; tarot.nl
  empieza a las 9 antihorario.
- **Hilo narrativo:** leer el tema, después los meses en secuencia "dentro de ese registro", buscar el arco
  (ej. una Torre temprana como "el despeje que hizo posible el resto").
- Fuentes: https://booktarot.com/blog/year-ahead-tarot-reading-a-13-card-spread-that-actually-holds-up ·
  https://www.univision.com/horoscopos/las-distintas-formas-de-leer-las-cartas-tarot-fotos

### A.14 Relación / dos personas, 7 cartas (ES: "tirada de pareja", EN: "relationship spread")
- **Cartas:** 7. No hay un layout canónico; tres familias documentadas:
  - **Dos columnas + centro (jobcannon / Univision "pareja"):** 1 Tú (0,0); 2 La otra persona (2,0);
    3 La conexión / lo que hay entre ambos (1,1); 4 Fortaleza / lo que funciona (0,2); 5 Fricción /
    debilidad (2,2); 6 Consejo (1,3); 7 Resultado probable (1,4). Univision: 1 tú, 2 pareja, 3 conexión,
    4-5 fuerzas y debilidades, 6 consejo o resultado, 7 "amor verdadero" (opcional).
  - **Significadores + arco (The Uncrossed Path):** dos significadores (uno por persona), seis cartas en arco
    antihorario entre ellos — 1-3 "cómo ve el consultante al otro", 4-6 "cómo el otro ve al consultante" — y
    la 7 en el medio, "factor de unión / contexto mutuo".
  - **Compatibilidad (Labyrinthos):** 1 lo que querés, 2 lo que quiere, 3 diferencias, 4 similitudes,
    5 compatibilidad emocional, 6 física, 7 mental.
  - Extensión a 10 (Autostraddle "You, Me and Us"): columna por persona (cómo se ve / cómo ve al otro /
    cómo ve la relación) + columna central (fortaleza, punto débil, hacia dónde va, consejo).
- **Lectura en espejo:** comparar 1 con 2 y 3 con 4 (dirección de las figuras: ¿se miran, se dan la
  espalda? — ver B.2). Benebell Wen: cruzar un par en el centro "donde los dos caminos se intersectan".
- Fuentes: https://jobcannon.io/tarot/spreads/relationship ·
  https://theuncrossedpath.squarespace.com/blog/love-amp-connection-a-relationship-spread ·
  https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/examining-relationships-with-tarot-3-love-tarot-spreads-to-understand-you-your-partner ·
  https://www.univision.com/horoscopos/las-distintas-formas-de-leer-las-cartas-tarot-fotos ·
  https://www.autostraddle.com/3-tarot-spreads-for-checking-in-with-your-relationships-288866/

### A.15 Decisión / dos caminos (ES: "tirada de decisión / encrucijada", EN: "two paths / decision spread")
- **Cartas:** 7 (booktarot) — 1 Dónde estás (1,0); Camino A: 2 Don / lo que ofrece (0,1), 3 Costo (0,2),
  4 Adónde lleva (0,3); Camino B: 5 Don (2,1), 6 Costo (2,2), 7 Adónde lleva (2,3).
- **Guía:** nombrar las dos opciones antes de mezclar; leer cada columna de arriba abajo; comparar; "si las
  cartas apuntan más allá de A y B, la pregunta no es binaria" (buscar un tercer camino).
- **Variantes:** Labyrinthos 5 cartas: 1 Motivación, 2 Resultado ideal, 3 Valores (centro, "cartas del yo")
  + 4 Resultado probable opción 1, 5 Resultado probable opción 2. Kerykeion 6: por camino Naturaleza /
  Exigencia de crecimiento / Potencial. "Crossroads" 5: tú al centro, resultado y desafío de cada lado.
  Variante "mejor camino": una carta extra abajo como recomendación (no veredicto). Tres caminos: tercera
  columna. Benebell Wen "forked layout": dos ramas desde el significador.
- Fuentes: https://booktarot.com/spreads/decision-spread ·
  https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/making-tough-choices-a-5-card-tarot-spread-for-decision-making ·
  https://www.kerykeion.net/content/learn-tarots/readings/Two_Paths

---

## PARTE B — Lectura combinada

### B.1 Narrativa por posiciones (la carta anterior "alimenta" a la siguiente)
Qué dicen las fuentes:
- **Tiempo de izquierda a derecha.** Angelorum: "la mayoría lee de izquierda a derecha, así que la
  izquierda suele ser pasado y la derecha futuro". Llewellyn (extracto vía búsqueda): decir una o dos
  palabras clave al bajar cada carta para armar un "esbozo", después expandir, y **leer hacia adelante
  en el tiempo sin volver sobre cartas anteriores**.
- **Causa → efecto.** TarotElements sobre la cruz celta: la vertical se lee "de causa a efecto: la raíz (3)
  forma el presente (1) y puede llevar al futuro (5)"; la horizontal "como movimiento en el tiempo: pasado
  reciente (4), a través del cruce (2), hacia el futuro inmediato (6)". Benebell Wen sobre 3 cartas: la
  izquierda son "influencias pasadas que informan hacia dónde va".
- **El resultado resume.** Labyrinthos: la posición 10 es "un resumen de las cartas previas"; Waite: "la
  culminación de las influencias mostradas por las otras cartas". Es decir, la carta final no se lee sola:
  se lee como consecuencia del camino.
- **La posición cambia el significado.** Guía de principiantes (vía búsqueda): "una carta significa algo
  ligeramente distinto en 'acción' que en 'resultado'". Lamantica (ES): el mismo arcano cambia según el
  marco de la pregunta (predictivo = acciones externas hacia adelante; evolutivo = hacia adentro).
- **Mecánica útil para el motor** (síntesis de lo anterior, no una cita):
  1. Ordenar las posiciones en el eje temporal de la tirada (pasado→presente→futuro; raíz→presente→meta).
  2. Para cada transición (i → i+1) generar un conector causal: "porque X (pasado), hoy Y (presente)";
     "si Y sigue así, Z (futuro)".
  3. Marcar continuidad o quiebre: mismo palo / número ascendente = continuidad; cambio de palo,
     mayor tras menores, invertida tras derecha = quiebre ("pero").
  4. La última posición se redacta como consecuencia del hilo, nunca como definición aislada.
- Fuentes: https://angelorum.co/topics/divination/how-to-use-directions-in-tarot-readings/ ·
  https://tarotelements.com/?p=1288 · https://benebellwen.com/2014/04/01/your-tarot-spreads-repertoire/ ·
  https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/the-celtic-cross-tarot-spread-exploring-the-classic-10-card-tarot-spread ·
  https://lamantica.substack.com/p/ejercicio-de-interpretacion

### B.2 Dirección de la mirada y del movimiento de las figuras
Origen: escuela marsellesa (Jodorowsky/Costa, *La vía del Tarot*; Marteau) — "la lectura se apoya en
numerología, palos, colores, **dirección de las figuras** y detalles simbólicos" (Bindi, ficha del Tarot
Jodorowsky-Camoin). No se pudo acceder al texto de *La vía del Tarot*; un fragmento citado por búsqueda
(arcano VII): "el caballo de la derecha debe llevarlo al futuro; el de la izquierda, al pasado". La
regla aplicada a RWS está documentada por Biddy Tarot y Angelorum.

**Reglas documentadas:**
1. **Orientación temporal de una figura (Biddy):** mira a la izquierda = enfocada en el pasado (Caballero
   de Espadas); de frente = presente (Rey de Espadas); a la derecha = futuro (Caballero de Oros).
   Caveat de la propia Biddy: "no funciona en todos los casos" (el Rey de Bastos mira a la izquierda pero
   es futuro); decide el contexto. Angelorum: en TdM "figuras que miran a la izquierda sugieren energía
   enfocada en el pasado; a la derecha, en el futuro".
2. **Tres cartas, figura central (Biddy):** si la del medio mira hacia un lado, "a qué le presta atención
   y qué ignora"; si mira de frente, "elección entre lo que hay a cada lado"; si las laterales miran hacia
   el centro, "esa es la que creen que tiene las respuestas".
3. **Relaciones (una carta por persona) (Biddy/Angelorum):** ¿se miran, miran hacia otro lado, se
   gesticulan, reaccionan una a la otra? Angelorum: "si se dan la espalda, típicamente no es probable que
   se reconcilien"; direcciones opuestas (Reina al futuro, Rey al pasado) = "energías conectadas de forma
   disfuncional / cíclica".
4. **Decisiones (Biddy):** ¿la figura enfrenta el asunto o le da la espalda? Ej.: Paje de Oros a la
   izquierda del 5 de Oros lo mira de frente = "listo para encarar el problema económico".
5. **Cortesanas en la herradura (TeachMeTarot):** notar hacia dónde mira una cortesana y qué carta tiene
   enfrente: "puede señalar quién causa el problema".
6. **Aplica a cualquier carta con figura, no solo cortesanas** (Biddy), y **cambia por mazo**: hay que
   codificar la dirección por carta y por baraja.
7. **Cuándo usarla:** Angelorum: "las cartas me avisan cuando la dirección entra fuerte en la lectura";
   no define la personalidad de una cortesana. Lamantica (ES) la incluye en su checklist de interpretación
   ("¿hacia dónde miran los personajes?").

**Para el motor:** tabla por carta con `mira: izq|der|frente|ninguna` y `movimiento: izq|der|ninguno`
(ej. Caballeros, Carro, 8 de Copas, Loco). Reglas: (a) en tiradas lineales, una figura que mira hacia la
carta siguiente "la busca / avanza hacia ella"; hacia la anterior "no suelta el pasado"; (b) dos figuras
enfrentadas = encuentro/tensión directa; espalda con espalda = desconexión; (c) figura central mirando
a un lado = foco. Marcar estas inferencias como "secundarias" y usarlas solo cuando hay figura clara.

- Fuentes: https://biddytarot.com/blog/directions-of-court-cards/ ·
  https://angelorum.co/topics/divination/how-to-use-directions-in-tarot-readings/ ·
  https://bindi-online.com/?p=4158 · https://teachmetarot.com/spreads/the-horse-shoe-spread ·
  https://lamantica.substack.com/p/ejercicio-de-interpretacion ·
  (Jodorowsky VII, vía búsqueda: https://www.revistadelauniversidad.mx/downloads/09ebc780-487b-4191-b8f2-b276c1310ab8/rum-MAR.2022-dossier-conversacion-psicopoetica.pdf)

### B.3 Dignidades elementales (Golden Dawn, Book T)
**Texto original (Book T, transcripto por Tarot Association):**
> "A CARD is strong or weak, well dignified or ill dignified, according to the cards next to it on
> either side." · "Cards of the same suit on either side strengthen it greatly, for good or evil
> according to their nature." · "Cards of opposite natures on either side weaken it greatly, for either
> good or evil." · "Swords are inimical to Pentacles." · "Wands are inimical to Cups." · "Swords are
> friendly with Cups and Wands." · "Wands are friendly with Swords and Pentacles." · "If a card fall
> between two other which are mutually contrary, it is not much affected by either."

**Tabla de relaciones (Bastos=Fuego, Copas=Agua, Espadas=Aire, Oros=Tierra):**

| | Fuego | Agua | Aire | Tierra |
|---|---|---|---|---|
| **Fuego** | fortalece mucho (mismo) | **enemigos** (se debilitan) | amigos (activos) | amigos |
| **Agua** | enemigos | fortalece mucho | amigos | amigos (pasivos) |
| **Aire** | amigos | amigos | fortalece mucho | **enemigos** |
| **Tierra** | amigos | amigos | enemigos | fortalece mucho |

Nota: el enunciado pedido en el ticket ("fuego/aire amigos, agua/tierra amigos, fuego/agua se debilitan,
aire/tierra se debilitan") es exactamente el de Book T. Angelorum lo resume igual: "complementarios
Fuego-Aire y Agua-Tierra fortalecen; opuestos Fuego-Agua y Aire-Tierra debilitan". Fuego-Tierra y
Agua-Aire son "neutrales/amistosos" (Book T las llama *friendly*, no las distingue de las activas).

**Elemento de los mayores (Angelorum, atribución GD por signo/planeta):** Fuego: Emperador, Fuerza,
Templanza, Sol, Torre. Tierra: Hierofante, Ermitaño, Diablo, Emperatriz, Mundo. Aire: Enamorados,
Justicia, Estrella, Mago, Loco. Agua: Carro, Muerte, Luna, Sacerdotisa, Colgado. Rueda = Fuego (Júpiter);
Juicio = Fuego (GD) / algunos Agua. Las cortesanas toman el elemento de su palo (Angelorum, por ejemplos;
en GD estricta también tienen sub-elemento por rango, omitido aquí).

**Método de tríadas (Corax + Angelorum):**
- La carta **central** es la más importante; las dos laterales la modifican.
- Corax: primero enfrentar carta 1 contra 3; "lo que queda" de esa contienda cae sobre la 2. Una influencia
  debilitada "sigue contando" (intenta influir sin mucho éxito), a diferencia de la lectura estricta de
  Mathers.
- Angelorum: laterales del mismo elemento → influyen fuertemente sobre el centro; laterales opuestas → se
  anulan y el centro "queda especialmente significativo" (regla de Book T: "not much affected by either").
- Ejemplos de Corax: Agua-Aire-Fuego → los extremos se debilitan entre sí, el Aire central queda solo;
  Tierra-Agua-Fuego → Fuego y Tierra se refuerzan en los extremos, el Agua central gana estabilidad de la
  Tierra pero choca con el Fuego; Agua-Fuego-Agua → "el Fuego se ahoga"; Agua-Tierra-Agua → "demasiada
  agua, un charco de barro". Advertencia: "no siempre es tan obvio; mirá las cartas concretas, no solo el
  elemento".
- Ejemplos de Angelorum para pares: 3 de Bastos + Caballero de Bastos = Fuego+Fuego, "muy fuerte, pasión y
  acción"; Reina de Copas + Rey de Oros = Agua+Tierra, "emoción equilibrada con practicidad" (Biddy lee el
  mismo par: "pueden prosperar, pero cada uno tan metido en lo suyo que no conectan"); As de Espadas + 5 de
  Copas = Aire+Agua "choque lógica/emoción"; 2 de Espadas + 3 de Oros = Aire+Tierra "tensión ideas/materia,
  vínculo debilitado".

**Para qué sirve en software:** da un **peso** por carta (fuerte / normal / débil / aislada) que modula el
tono del texto ("esta Torre llega amortiguada por dos cartas de Agua" vs "esta Torre viene reforzada por el
Sol y el Emperador"). Aplicar a vecinos **adyacentes en el layout**, no en el orden de tirada: en la cruz
celta, vecinos de la 1 son 2, 3, 4, 5, 6; en una línea, i-1 e i+1.

- Fuentes: https://www.tarotassociation.net/?p=1840 (transcripción de Book T) ·
  https://angelorum.co/learn-tarot/how-to-use-elemental-dignities-in-tarot/ ·
  https://corax.com/tarot/elemental-dignities-triad.html ·
  (Book T completo, PDF no leído: https://archive.org/download/andrew.chumbleyazoetia/Book%20T%20-%20The%20Tarot.pdf)

### B.4 Proporciones de la tirada (lectura de conjunto antes de las cartas)
Lo que recomiendan las fuentes como **primer paso** (Llewellyn: "un escaneo rápido de todo el layout
antes de las cartas, como el boceto antes de la pintura"; TeachMeTarot: "initial scan"; Mysticryst:
"overview antes de interpretar"):

| Patrón | Lectura documentada | Fuente |
|---|---|---|
| Muchos **mayores** (≥ 40-50 % de la tirada) | "Fuerzas grandes / lecciones de vida, situación significativa", "temas psicológicos o espirituales más que mundanos", "eventos con efecto a largo plazo"; en la cruz celta "la lectura se vuelve más pesada o más espiritual"; mayor invertido en la 10 "difícil de mover". Biddy matiza: no son "más importantes", sirven para "ver las grandes influencias y lecciones". | TeachMeTarot; Astrostyle ES ("los Mayores muestran un panorama general y lecciones de vida; los Menores, acontecimientos cotidianos"); kerykeion; Biddy "Ask Brigit" |
| **Ningún mayor** | Asunto cotidiano, manejable, en manos del consultante. | Inferencia inversa de lo anterior (no cita directa) |
| **Palo dominante** | "El elemento que impulsa el asunto": Copas = emociones/relaciones; Oros = dinero/trabajo/cuerpo; Espadas = mente/conflicto/comunicación; Bastos = acción/creatividad/energía. | TeachMeTarot; guía genérica |
| **Palo ausente** | "Energía elemental faltante y posible desequilibrio" (ej. sin Copas en pregunta de amor = falta de emoción/ conexión). | TeachMeTarot |
| Muchas **cortesanas** | "Gente involucrada / factores externos / personalidades", o aspectos del propio consultante; preguntar siempre "¿persona o energía?"; en la posición de resultado, "otra persona decide" (Waite). | TeachMeTarot; Waite; kerykeion |
| Muchas **invertidas** | "Bloqueos, energía internalizada, retrasos"; mayores invertidos = "donde hace falta trabajo consciente". Si TODAS están invertidas, revisar el mazo (vekkesind). | TeachMeTarot; kerykeion; Labyrinthos |
| **Números repetidos** | Refuerzan el significado del número; "la importancia aumenta cuanto menos cartas haya". Ej. varios 3 = creatividad/expansión; varios 5 = conflicto/pérdida; varios 10 = cierres de ciclo. Book T (tradición GD) también lee "cuatro Ases, tres Reyes…" como señales específicas (texto no verificado). | kerykeion; Pollack (reseña: "revisar cartas del mismo valor en distintos palos"); Llewellyn |
| **Ases** | Comienzos/raíces de cada elemento; varios Ases = impulso nuevo múltiple. | Tradición general |
| **Secuencias** (ej. 5, 6, 7 de un palo) | Proceso en curso, continuidad narrativa (Lamantica ES: "¿los números crecen, decrecen o se repiten?"). | Lamantica |

**Para el motor:** calcular `ratio_mayores`, `palo_dominante`, `palo_ausente`, `n_cortesanas`,
`ratio_invertidas`, `numeros_repetidos`, `tendencia_numerica` y generar **una frase de apertura** con el
patrón más saliente (solo uno o dos; más es ruido).

- Fuentes: https://teachmetarot.com/celtic-cross-spread/how-to-read-the-celtic-cross-spread ·
  https://astrostyle.com/es/tarot/tiradas-de-tarot/ · https://biddytarot.com/blog/ask-brigit-are-major-arcana-more-important/ ·
  https://kerykeion.net/content/learn-tarots/guides/reversed-cards · https://lamantica.substack.com/p/ejercicio-de-interpretacion ·
  https://www.aeclectic.net/tarot/books/78-degrees-of-wisdom/

### B.5 Carta de síntesis: quintaesencia y carta sombra
- **Quintaesencia (EN "quint", ES "cuarta carta por suma"):** sumar los valores de las cartas de la tirada
  y reducir a un arcano mayor. Reglas de Angelorum: Ases = 1; numerales = su valor; Paje 11, Caballero 12,
  Reina 13, Rey 14; mayores = su número; el Loco = 0 o 22 (elegir y ser consistente). Si la suma supera 22,
  sumar dígitos hasta caer entre 1 y 22. Ej.: 14+6+2 = 22 → Loco; 12+9+8 = 29 → 11 = Justicia/Fuerza según
  sistema. El Diario NY (ES) describe lo mismo como la "cuarta carta" de la tirada de tres: "si supera 22 se
  reduce a una cifra: 24 → 2+4 = 6".
- **Variantes:** algunos suman solo los mayores presentes; otros excluyen cortesanas; otros dan ambas
  reducciones (67 → 13 Muerte y 4 Emperador) y eligen por contexto (foro). Es una práctica sin estándar;
  Angelorum la coloca **encima** de la tirada como "ancla visual del tema".
- **Carta sombra / base ("shadow card", "base card", "carta de fondo"):** la última carta del mazo tras
  mezclar; se coloca **debajo** de la tirada y **no entra en la suma**. Representa "influencias
  inconscientes, aspectos apartados del yo, patrones profundos" (Angelorum) o "el tono / foco de la lectura"
  (Autostraddle); TeachMeTarot la lee primero en la herradura. Benebell Wen y Labyrinthos no la usan.
- **Variante "carta de consejo":** sacar una carta adicional al final como consejo (muchos sitios ES;
  booktarot "best path").
- **Orden de uso (Angelorum):** quint → cartas en orden → sombra (aclara el desafío) → patrones (números,
  elementos, flujo visual) → "dejar que el patrón emerja antes de interpretar".
- Fuentes: https://angelorum.co/tarot-spreads/the-only-tarot-spread-youll-ever-need/ ·
  https://eldiariony.com/?p=2474150 · https://www.thetarotforum.com/forums/topic/11853-quintessence-yay-or-nay ·
  https://www.autostraddle.com/fools-journey-reading-the-bottom-card-of-a-deck-370285/

### B.6 Pares y combinaciones clásicas (41 documentadas)
Método general (Biddy, "Tarot Card Combinations"): preguntarse "¿qué significan juntas? ¿se refuerzan o se
oponen?"; comparar palos, mayor vs menor, números, símbolos compartidos, **cómo se relacionan las figuras y
hacia dónde miran**, contexto de la pregunta; "usar las combinaciones para armar una historia". Ejemplos de
método de Biddy: 7 de Copas + Loco ("muchas opciones + ganas de arrancar; el 7 frena al Loco hasta que es
el momento, el Loco impide que el 7 se estanque"); Juicio + Enamorados (ángeles en ambas → "guía divina con
mensaje"); 2 + 9 por número ("encrucijada seguida de casi-completitud: una decisión final antes de la meta").

| # | Combinación | Lectura breve | Fuente |
|---|---|---|---|
| 1 | Torre + Sol | Cambio brusco que termina en resultado positivo; "renacimiento"; la luz después de la tormenta. | astrology.com; PDF ES vía búsqueda |
| 2 | Torre + Estrella | Derrumbe seguido de esperanza y sanación; "lo viejo cae para que crezca lo nuevo". | astrology.com; ai-tarot vía búsqueda |
| 3 | Torre + Diablo | Crisis que rompe patrones dañinos; obliga a mirar miedos ocultos; tiempos inestables, oportunidad de transformación. | astrology.com |
| 4 | Torre + Rueda | Giro del destino abrupto, fuera de control; "necesario para crecer"; cierre que abre oportunidades. | astrology.com |
| 5 | Torre + Enamorados | Relación o elección bajo sacudida: ruptura, infidelidad o "limpieza de pretensiones" para que quede lo genuino. | astrology.com; kerykeion |
| 6 | Torre + Justicia | "Deudas kármicas que se pagan"; consecuencias. | eclecticwitchcraft vía búsqueda |
| 7 | Torre + Emperador | "Algo grande está por pasar" a una estructura/autoridad. | PDF vía búsqueda |
| 8 | Enamorados + Diablo | Amor vs lujuria, libertad vs control; vínculo intenso que puede ser leal o tóxico (dependencia, manipulación); "las pasiones sirven al bien si las guían valores". | Biddy; astrology.com |
| 9 | Enamorados + 3 de Espadas | Elección o vínculo atravesado por dolor/traición; triángulo. | astrology.com (índice) / tradición |
| 10 | Muerte + 10 de Espadas | Fin de un ciclo doloroso; el golpe final que cierra algo. | orianatarot |
| 11 | Muerte + Torre | Cambio súbito que destruye estructuras viejas y permite reconstruir. | orianatarot; blog vía búsqueda |
| 12 | Muerte + Estrella | Tras el final, esperanza renovada; "carta difícil seguida de una sanadora". | orianatarot; búsqueda |
| 13 | Muerte + Sol | Transformación que trae alegría y éxito. | orianatarot |
| 14 | Muerte + Loco | Final abrupto que abre un comienzo libre y sin plan. | orianatarot |
| 15 | Muerte + Diablo | Cambio que libera de vicios o situaciones tóxicas. | orianatarot |
| 16 | Muerte + Enamorados | Cambio importante en una relación; decisión romántica. | orianatarot |
| 17 | Muerte + 10 de Copas | Transformación familiar/emocional que termina en armonía. | orianatarot; búsqueda |
| 18 | Muerte + 3 de Espadas | Cambio que sana heridas; perdón posible. | orianatarot |
| 19 | Muerte + 8 de Copas | Dejar atrás lo que ya no llena. | orianatarot |
| 20 | Muerte + 6 de Espadas | Cambio que implica viaje o mudanza. | orianatarot |
| 21 | Muerte + As de Oros | Cierre que abre oportunidad económica. | orianatarot |
| 22 | Muerte + Mundo | Cierre completo de un ciclo de vida; plenitud. | orianatarot |
| 23 | Sol + Luna | Fase de cambio que pide equilibrio entre intuición y acción; el Sol disipa la incertidumbre de la Luna. | astrology.com |
| 24 | Estrella + Luna | Sanación emocional que exige enfrentar primero lo que se teme; camino duro pero necesario. | astrology.com |
| 25 | Emperatriz + Emperador | Equilibrio nutrir/estructurar; algo nuevo, estable y abundante; pareja sólida, prosperidad. | astrology.com; PDF |
| 26 | Mago + Sacerdotisa | Acción consciente + intuición oculta; "prestá atención a sueños y señales". | astrology.com |
| 27 | Sacerdotisa + Hierofante | Buscar guía adentro y afuera (maestros, tradición). | Biddy |
| 28 | Fuerza + Carro | Poder interior sereno vs control exterior enérgico; "equilibrar fuerza interna con acción directa". | Biddy |
| 29 | Ermitaño + Colgado | Introspección y rendición; soltar el control, confiar en el proceso. | astrology.com |
| 30 | Loco + Mundo | Un capítulo se cierra y otro empieza; individuo y totalidad en equilibrio. | astrology.com |
| 31 | Juicio + Enamorados | Guía divina sobre una elección; llamado con mensaje. | Biddy |
| 32 | 7 de Copas + Loco | Muchas opciones + impulso de partir; esperar el momento, no estancarse. | Biddy |
| 33 | Reina de Copas + Rey de Oros | Agua+Tierra: emoción con practicidad; riesgo de que cada uno viva en lo suyo. | Biddy; angelorum |
| 34 | As de Espadas + 5 de Copas | Lógica contra duelo; claridad que no consuela. | angelorum |
| 35 | 2 de Espadas + 3 de Oros | Indecisión que traba el trabajo en equipo; ideas vs materia. | angelorum |
| 36 | 3 de Bastos + Caballero de Bastos | Fuego doble: expansión y acción veloz. | angelorum |
| 37 | Emperador + 8 de Bastos | Liderazgo con velocidad; decisiones rápidas. | angelorum |
| 38 | Sol + 6 de Bastos | Éxito reconocido, celebración pública. | ai-tarot vía búsqueda |
| 39 | 2 de Copas invertido + Diablo | Pareja bloqueada por adicción o atadura. | Labyrinthos (reversals) |
| 40 | Sol + 3 de Copas + 8 de Copas (tríada ES) | Lejos de "fiesta": aislamiento y encierro; la copa sola del 3, el muro del Sol, la partida del 8. Ejemplo de lectura por imagen. | honuinika (ES) |
| 41 | Carro + Torre | Avance que choca contra un derrumbe; frenar antes del impacto. | tradición (no verificado en fuente única) |

Sobre la fuente: astrology.com tiene una página por par (índice: https://www.astrology.com/tarot/card-combinations/index.aspx)
y es la base más sistemática en inglés; orianatarot tiene listas por carta (la de la Muerte cubre las 77
restantes). En español no apareció un sitio serio con tabla de combinaciones: los resultados fueron PDFs
de origen dudoso y notas de La Opinión. **Recomendación:** no cargar 3.000 pares a mano; cargar 40-80
"clásicos" curados y, para el resto, generar la combinación por reglas (B.1-B.4) + significados base.

- Fuentes: http://www.biddytarot.com/blog/tarot-card-combinations/ · https://biddytarot.com/?p=13938 ·
  https://www.astrology.com/tarot/card-combinations/the-lovers-and-the-devil (y páginas hermanas:
  the-tower-and-the-sun, the-tower-and-the-star, the-devil-and-the-tower, the-wheel-of-fortune-and-the-tower,
  the-sun-and-the-moon, the-star-and-the-moon, the-empress-and-the-emperor, the-magician-and-the-high-priestess,
  the-hermit-and-the-hanged-man, the-fool-and-the-world, the-lovers-and-the-tower) ·
  https://orianatarotworld.blogspot.com/2025/04/death-tarot-card-combinations.html ·
  https://angelorum.co/learn-tarot/how-to-use-elemental-dignities-in-tarot/ ·
  https://honuinika.substack.com/p/no-el-3-de-copas-no-significa-celebracion

### B.7 Invertidas: las escuelas y qué conviene online
**Las cuatro escuelas (nombres que usan Biddy, Labyrinthos, tarot.com):**
1. **Opuesto** — la invertida es lo contrario de la derecha (3 de Oros inv. = falta de equipo).
   Tarot.com: "el método más fácil pero no necesariamente el mejor". Labyrinthos: "el que menos uso,
   simplifica demasiado".
2. **Bloqueada / retrasada** — la energía está pero no fluye (Biddy: "¿qué se interpone? ¿cómo liberarla?";
   Labyrinthos: 2 de Copas inv. junto al Diablo = pareja trabada por adicción).
3. **Exceso / defecto (desequilibrio)** — demasiado o muy poco de la energía (Biddy: Reina de Bastos inv.
   = exceso de confianza o timidez; Labyrinthos "going to extremes" y "decrease in intensity" como dos
   lados: 6 de Copas inv. = atrapado en el pasado; 9 de Espadas inv. = recuperándose, **puede ser más
   positiva que la derecha**).
4. **Interna / privada** — la misma energía vivida hacia adentro, inconsciente o no expresada (Biddy:
   "agregar 'yo mismo' o 'privado' al significado derecho").
Más: **imagen invertida** (Biddy: leer literalmente la figura dada vuelta: "las espadas caen de la
espalda = dolor que se suelta"); Mary K. Greer, *The Complete Book of Tarot Reversals*, lista 12 + 1:
bloqueada/resistida; retrasada/difícil; interna/inconsciente; no/falta; excesiva; "rompiendo" (breaking
through); proyectada en otros; luna oscura (sombra); mal usada/desviada; prefijos re-/mis- (re-intentar,
re-considerar, mal-entender); rectificación; el Trickster (lectura humorística/no convencional); bonus
"carta previa": la invertida remite a lo que falta completar antes (la carta anterior en secuencia).

**Qué recomiendan para uso consistente/online:**
- **Elegir una escuela antes de tirar y sostenerla** en toda la lectura (Biddy: "decidí de antemano, p.ej.
  todas las invertidas como bloqueos, para que la lectura sea consistente").
- **Son opcionales.** Biddy: "no necesitás invertidas para ser buena lectora". Labyrinthos: aprender primero
  las derechas; su app las tiene como switch (encendido por defecto). Muchos lectores no las usan "porque
  muchas cartas ya son poderosas solas".
- **No son automáticamente malas** (Labyrinthos, Biddy "sin el drama").
- **Buscar temas entre derechas e invertidas juntas**, no leer la invertida aislada (Biddy).
- booktarot (vía búsqueda) sobre estructura: "estás leyendo la sombra de la carta, un modo psicológico
  específico, no su inversión".
- **Para el motor:** (a) switch global `invertidas: on|off`; (b) parámetro `escuela: bloqueada | interna |
  exceso_defecto | opuesta`, con **bloqueada** como default (es la más citada y la menos arriesgada en
  texto automático: no contradice la carta, la matiza); (c) nunca generar la invertida como "lo contrario"
  sin contexto; (d) en sí/no usar la regla derecha/invertida solo si el mazo está balanceado (ver B.8).

- Fuentes: https://biddytarot.com/blog/how-to-interpret-reversed-tarot-cards/ ·
  https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/how-to-interpret-reversed-tarot-cards ·
  https://www.tarot.com/tarot/interpretation-reversals · https://globalspiritualstudies.com/sp/tarot-reversals/ ·
  https://www.goodreads.com/book/show/8162178 (índice de Greer) ·
  https://eldiariony.com/2020/08/06/las-cartas-invertidas-en-el-tarot-que-significan/

### B.8 Pregunta sí / no: reglas y listas
**Reglas documentadas (Biddy, 5 técnicas):**
1. **Derecha = sí, invertida = no**, con mazo balanceado (cortar y girar 180° una parte).
2. **Pilas sí / no / quizás:** clasificar las 78 de antemano, anotarlo y **no cambiar la lista para que
   diga lo que uno quiere**. Biddy ofrece su PDF (biddytarot.com/34); ejemplos: Sol = sí, Torre = no,
   7 de Copas = quizás.
3. **Favorable / desfavorable** (o probable / improbable) en lugar de sí/no.
4. **"Sí, si… / No, si…":** una carta de condición (7 de Oros = "sí, si te comprometés a largo plazo";
   Torre = "no, si algo inesperado lo altera").
5. **Leer la carta en contexto:** una carta "no" puede ser "sí" según la pregunta (6 de Espadas, listada
   como no, es sí para "¿me mudo?").
- **Mayoría en 3 cartas** (selfgazer): 2 o 3 "sí" → sí; 2 o 3 "no" → no; la fuente no resuelve empates
  (sí/no/quizás = 1-1-1). Variante ES (que.es/Ibiza vía búsqueda): 5 cartas, mayoría derecha = sí, centro
  vale doble.
- **Postura crítica (booktarot, Labyrinthos):** sí/no reduce la carta a un bit; una carta ambigua o
  cortesana "es señal de que la pregunta no es binaria"; no re-mezclar para obtener una respuesta más
  limpia; preferir reformular ("¿qué necesita de mí esta situación?"). Labyrinthos convierte el sí/no en
  tiradas de contexto (a favor / en contra / lo que hay que saber).

**Listas (consenso de selfgazer, booktarot, Biddy, PDF ES; marcadas las discrepancias):**
- **SÍ fuerte:** Sol ("el sí más fuerte"), Estrella, Mundo, Rueda de la Fortuna, Emperatriz, Enamorados
  (der.), Mago, Carro, Fuerza, Templanza, Juicio; Ases (los cuatro); 6 de Bastos; 9 y 10 de Copas; 10 de
  Oros; 2, 3 de Copas; 3, 6, 8, 9 de Oros; Caballero de Bastos; casi todos los Bastos (5 "sí difícil", 7
  "sí si te plantás", 10 "sí con costo").
- **NO:** Torre, Diablo; 10 de Espadas, 3 de Espadas, 8 de Espadas, 9 de Espadas; 5 de Oros, 4 de Oros;
  5 de Copas, 4 de Copas, 8 de Copas (booktarot "no"; selfgazer "sí a irse, no a quedarse"); los cuatro
  5 (booktarot); Luna (booktarot "no suave"; selfgazer "quizás"); Hierofante en ES aparece como "no"
  (PDF) y "sí" (selfgazer).
- **QUIZÁS / "todavía no" / depende de la pregunta:** Colgado ("esperá"), Luna, Sacerdotisa ("aún no"),
  Ermitaño ("aún no"), Justicia ("si actuás con justicia"), Loco (condicional), Emperador ("con plan
  sólido"), Muerte (selfgazer "sí" como transformación; muchos lectores "no"), 7 de Copas, 2 de Espadas,
  5 y 7 de Espadas, 4 de Espadas ("todavía no"), 2 de Oros ("con flexibilidad"), **todas las cortesanas**
  (booktarot: "la pregunta no es binaria"; selfgazer da sí a la mayoría salvo Reina/Rey de Espadas).
- **Regla para invertidas en sí/no (selfgazer):** positiva invertida → "todavía no / sí con complicaciones";
  negativa invertida → "los obstáculos se despejan / no, pero mejorando". No es "lo opuesto" automático.

**Para el motor:** tabla `si_no: si|no|depende` por carta con `nota_condicional`; modo 1 carta (respuesta +
condición) y modo 3 (voto con centro ×2 para romper empates 1-1-1 → el centro decide; si centro es
"depende", responder "depende" y explicar con las laterales). Siempre acompañar el veredicto con "por
qué" (técnicas 4 y 5 de Biddy) para no sonar a moneda.

- Fuentes: https://biddytarot.com/?p=21707 · https://www.selfgazer.com/blog/tarot-yes-or-no-cards-list ·
  https://booktarot.com/blog/yes-or-no-tarot-how-to-actually-do-it ·
  https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/how-to-answer-yes-no-questions-with-tarot-4-yes-or-no-tarot-spreads ·
  https://www.que.es/2021/03/11/tarot-si-o-no-lectura-te-ayudara-tomar-decisiones/

### B.9 Cómo se redacta una lectura (y cómo no sonar a plantilla)
**Estructura típica que describen los sitios y tarotistas:**
1. **Apertura / encuadre** — reformular la pregunta (Mysticryst: "refinar si es vaga o de sí/no y
   confirmarla"); Llewellyn: la lectura es "síntesis de lector, consultante, pregunta, tirada, mazo y
   cartas", y empezar por las cartas individuales es "poner el carro delante del caballo".
2. **Panorama** — escaneo de conjunto (B.4): mayores, palo dominante/ausente, invertidas, repeticiones,
   "el arco de izquierda a derecha" (Llewellyn); en la cruz celta, ¿3 y 10 concuerdan? (TeachMeTarot);
   quintaesencia si se usa (Angelorum).
3. **Carta por carta con su posición** — "explicar la posición antes de revelar la carta" (Mysticryst);
   una o dos palabras clave por carta como esbozo y después expandir (Llewellyn); orden: imagen y clima →
   palabras clave → conexión con la posición → conexión con las otras cartas (guía de principiantes).
4. **Hilo entre cartas** — "conectar las cartas, no leerlas aisladas"; pares de la tirada (A.11); dirección
   de las figuras (B.2); dignidades (B.3); "leer hacia adelante en el tiempo" (B.1). Pollack (según reseña):
   "relaciones y rasgos comunes entre cartas, no cada una en el vacío".
5. **Síntesis** — "identificar el mensaje general y los temas principales"; "destilar en dos o tres
   insights o pasos de acción" (Mysticryst).
6. **Consejo / cierre** — "enmarcar la guía en las elecciones del consultante: las cartas muestran
   resultados probables, no fijos"; "nunca prometer un resultado"; "no abrir con una carta negativa de
   resultado; guiar el razonamiento" (TeachMeTarot). Sitios ES: carta de consejo final.
Mary K. Greer (*21 Ways*) aporta la caja de herramientas por carta que un generador puede muestrear para
variar: descripción literal de la escena (paso 2), emoción/clima (3), micro-relato (4), palabras clave de
número y palo combinadas en frases (5-7), refranes y clichés (8), metáfora → mensaje (9), rango de
significado de lo mejor a lo peor (11), factores modificadores: pregunta, posición, invertida, vecinas (12),
diálogo con la figura (15), afirmación final (21).

**Recomendaciones para texto automático que no suene a plantilla (síntesis de las fuentes + práctica):**
- **Pasar todo el contexto al generador:** pregunta literal, tipo de pregunta (amor/trabajo/decisión/
  espiritual), tirada, posición de cada carta, orientación, vecinas (búsqueda AI-tarot: "muchos sistemas
  describen cada carta en su párrafo y nunca las conectan entre sí, con la pregunta ni con la posición").
- **Un solo tema de apertura**, derivado del patrón más saliente de B.4 o de la quintaesencia; no listar
  todos los patrones.
- **Conectores causales explícitos** entre posiciones ("porque… / por eso… / pero… / si…") generados desde
  la estructura de la tirada (B.1), con elección aleatoria entre varias plantillas sintácticas.
- **Dar peso variable:** las cartas "fuertes" (mayores, bien dignificadas, en posición de resultado) reciben
  2-3 frases; las débiles o aisladas, una. Una lectura con todas las cartas al mismo largo es la firma de la
  plantilla.
- **Anclar en la imagen** (Greer pasos 2-3, honuinika ES: "la copa sola arriba de las otras dos", "el muro
  del Sol"): un detalle visual por carta, elegido al azar de una lista por carta, evita el "esta carta
  representa…".
- **Rango de significado, no significado único** (Greer 11): guardar por carta 3-5 matices de más luminoso
  a más sombrío y elegir según dignidad/posición/pregunta.
- **Invertidas con una sola escuela por lectura** (B.7) y verbalizadas como matiz, no como negación.
- **Sí/no siempre con "por qué" y condición** (B.8).
- **Cierre accionable y condicional:** "si… entonces…", dos o tres pasos concretos, nunca promesa.
- **Variar el registro según la pregunta** (Lamantica: predictivo = acciones externas; evolutivo =
  emociones/formas de actuar). Tono rioplatense si el producto lo pide: voseo, sin arcaísmos.
- **Validar nombres y orientación contra la tabla del mazo** (riesgo de "cartas inventadas" señalado en
  las guías de AI-tarot).
- **Memoria entre lecturas** (opcional): señalar cartas recurrentes del mismo usuario.

- Fuentes: https://mysticryst.com/blogs/the-mystic-journal/tarot-reading-structure-opening-to-closing ·
  Llewellyn (vía búsqueda; dominio feedback.llewellyn.com no resolvió): https://www.llewellyn.com/blog/page/454 ·
  https://teachmetarot.com/celtic-cross-spread/how-to-read-the-celtic-cross-spread ·
  https://www.aeclectic.net/tarot/books/21-ways-to-read/ · https://lamantica.substack.com/p/ejercicio-de-interpretacion ·
  https://honuinika.substack.com/p/no-el-3-de-copas-no-significa-celebracion ·
  https://dev.to/samchenreviews/building-an-ai-that-reads-tarot-cards-and-actually-remembers-your-last-reading-4og3

---

## Apéndice — fuentes que no pudieron leerse y cómo se cubrieron
- sacred-texts.com (Pictorial Key): 403 → espejo neonvagabond.xyz (texto íntegro).
- hermetic.com Book T: 403; benebellwen PDF: binario; anna.lysator "interpretations": solo mayores →
  transcripción de la sección de dignidades en tarotassociation.net; el resto del Book T (mayorías de
  palos, "cuatro Ases") queda sin verificar.
- biddytarot.com: varias URLs 404/redirigidas; se usaron las páginas vivas de reversals, direcciones,
  combinaciones, "Ask Brigit" y el podcast 34 (sí/no). La cruz celta de Biddy es solo audio.
- labyrinthos.co: "3 card spreads" devolvió 429; se cubrió con las variantes de Univision/Astrostyle/Wen.
- *La vía del Tarot* (Jodorowsky/Costa) y *78 Degrees* (Pollack): no accesibles; citados por reseñas y
  fragmentos, marcados como tales.
