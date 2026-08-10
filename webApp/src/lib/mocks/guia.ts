export type Discipline = "tarot" | "astrologia" | "herbalismo" | "reiki";

export interface GuiaFormacion {
  year: string;
  title: string;
  place: string;
}

export interface GuiaCurso {
  num: string;
  tag: string;
  title: string;
  students: string;
  moon: string;
  status: string;
  slug: string;
}

export interface GuiaTestimonio {
  text: string;
  who: string;
  course: string;
}

export interface GuiaPlaneta {
  sym: string;
  angle: number;
  r: number;
}

export interface Guia {
  slug: string;
  name: string;
  glyph: string;
  role: string;
  location: string;
  discipline: Discipline;
  years: string;
  students: string;
  coursesCount: string;
  rating: string;
  sun: string;
  moon: string;
  asc: string;
  quote: string;
  bio: string[];
  formations: GuiaFormacion[];
  courses: GuiaCurso[];
  testimonios: GuiaTestimonio[];
  birthChart: {
    date: string;
    planets: GuiaPlaneta[];
  };
}

export const GUIAS: Guia[] = [
  {
    slug: "sol-mayor",
    name: "Sol Mayor",
    glyph: "☉",
    role: "Tarotista · Astróloga",
    location: "Buenos Aires · Argentina",
    discipline: "tarot",
    years: "XVIII",
    students: "1.240",
    coursesCount: "IV",
    rating: "4.9",
    sun: "♏ Escorpio", moon: "♓ Piscis", asc: "♋ Cáncer",
    quote: "No leemos el futuro. Leemos el alma del momento presente.",
    bio: [
      "Sol llegó al tarot a los diecinueve años, cuando una abuela vasca le puso un mazo en las manos y le dijo: “no leas las cartas, dejá que ellas te lean a vos”.",
      "Estudió astrología tropical con Eugenio Carutti en Buenos Aires y se formó en el tarot de Marsella con la escuela de Alejandro Jodorowsky en Francia. Dieciocho años después, sigue creyendo que el oficio es escuchar.",
    ],
    formations: [
      { year: "MMVIII", title: "Tarot de Marsella · Jodorowsky", place: "París" },
      { year: "MMXII", title: "Astrología tropical · Casa XI", place: "Buenos Aires" },
      { year: "MMXVI", title: "Cábala y simbolismo", place: "Jerusalén" },
      { year: "MMXX", title: "Trauma-informed counseling", place: "Online" },
    ],
    courses: [
      { num: "I", tag: "Tarot · Iniciación", title: "El loco emprende camino", students: "XLII", moon: "◐", status: "Abierto", slug: "el-loco" },
      { num: "II", tag: "Tarot · Maestría", title: "Tarot iniciático", students: "XII", moon: "○", status: "Abierto", slug: "tarot-iniciatico" },
      { num: "III", tag: "Astrología · Maestría", title: "Cartografía del alma", students: "XXIV", moon: "●", status: "Cerrado", slug: "cartografia" },
      { num: "IV", tag: "Taller · 1 día", title: "Plenilunio en Escorpio", students: "C", moon: "●", status: "Abierto", slug: "plenilunio" },
    ],
    testimonios: [
      { text: "Hizo de un mazo de cartas un espejo del que no quiero alejarme.", who: "Lía M.", course: "Tarot iniciático MMXXV" },
      { text: "Sostiene como pocas. Te empuja al borde con una ternura que da miedo y abraza.", who: "Joaquín R.", course: "Cartografía del alma MMXXIV" },
      { text: "Sol no enseña. Te recuerda algo que ya sabías.", who: "Camila V.", course: "El loco emprende camino MMXXVI" },
    ],
    birthChart: {
      date: "11 jul MCMLXXXII",
      planets: [
        { sym: "☉", angle: 215, r: 70 }, { sym: "☽", angle: 145, r: 70 },
        { sym: "☿", angle: 230, r: 70 }, { sym: "♀", angle: 195, r: 70 },
        { sym: "♂", angle: 100, r: 70 }, { sym: "♃", angle: 30, r: 70 },
        { sym: "♄", angle: 285, r: 70 },
      ],
    },
  },
  {
    slug: "luna-arce",
    name: "Luna Arce",
    glyph: "☾",
    role: "Astróloga · Tarotista",
    location: "Ciudad de México · México",
    discipline: "astrologia",
    years: "XIV",
    students: "890",
    coursesCount: "III",
    rating: "4.9",
    sun: "♓ Piscis", moon: "♑ Capricornio", asc: "♏ Escorpio",
    quote: "No enseño técnicas, enseño a escuchar lo que ya sabe el cuerpo.",
    bio: [
      "Luna aprendió a mirar el cielo antes que a leer. En el patio de su abuela, en Coyoacán, las noches se contaban por constelaciones y las tardes por las cartas que tendía para las vecinas del barrio. A los nueve años ya sabía señalar dónde caía la Casa X sin saber todavía qué significaba.",
      "Se formó en astrología tropical durante tres años y completó el recorrido con un estudio autodidacta del tarot de Marsella, contrastando cada arcano contra tránsitos reales hasta encontrar dónde se tocan las dos lenguas. Catorce años después enseña con una sola certeza: ninguna técnica reemplaza la escucha atenta de lo que el cuerpo ya sabía antes que la carta lo dijera.",
    ],
    formations: [
      { year: "MMXII", title: "Astrología tropical · casas y aspectos", place: "Ciudad de México" },
      { year: "MMXV", title: "Tarot de Marsella · estudio de arcanos", place: "Ciudad de México" },
      { year: "MMXVIII", title: "Astrología predictiva · tránsitos y progresiones", place: "Online" },
      { year: "MMXXII", title: "Ética de la consulta astrológica", place: "Bogotá" },
    ],
    courses: [
      { num: "I", tag: "Astrología · Inicial", title: "Carta natal esencial", students: "XXXVIII", moon: "○", status: "Abierto", slug: "carta-natal-esencial" },
      { num: "II", tag: "Astrología · Intermedio", title: "Tránsitos y retornos", students: "XVI", moon: "◐", status: "Abierto", slug: "transitos-retornos" },
      { num: "III", tag: "Astrología · Inicial", title: "Las doce casas", students: "LII", moon: "◑", status: "Cerrado", slug: "doce-casas" },
    ],
    testimonios: [
      { text: "Me enseñó a leer mi carta natal sin buscar excusas en ella — a usarla como espejo, no como sentencia.", who: "Renata G.", course: "Carta natal esencial MMXXV" },
      { text: "Explica el cielo con una claridad que no había encontrado en años de leer sola.", who: "Emiliano D.", course: "Las doce casas MMXXIV" },
      { text: "Cada tránsito que temía se volvió, con ella, una pregunta y no una condena.", who: "Paula S.", course: "Tránsitos y retornos MMXXVI" },
    ],
    birthChart: {
      date: "3 mar MCMLXXXVI",
      planets: [
        { sym: "☉", angle: 345, r: 70 }, { sym: "☽", angle: 285, r: 70 },
        { sym: "☿", angle: 330, r: 70 }, { sym: "♀", angle: 300, r: 70 },
        { sym: "♂", angle: 70, r: 70 }, { sym: "♃", angle: 160, r: 70 },
        { sym: "♄", angle: 220, r: 70 },
      ],
    },
  },
  {
    slug: "luz-marini",
    name: "Luz Marini",
    glyph: "♀",
    role: "Astróloga",
    location: "Montevideo · Uruguay",
    discipline: "astrologia",
    years: "XI",
    students: "610",
    coursesCount: "III",
    rating: "4.8",
    sun: "♎ Libra", moon: "♊ Géminis", asc: "♒ Acuario",
    quote: "La carta natal no te define — te recuerda de dónde venís.",
    bio: [
      "Luz llegó a la astrología por descarte: estudió arquitectura, se recibió, y a los pocos años dejó los planos por las cartas natales. Decía que ambas eran la misma disciplina — leer una estructura que ya está ahí y encontrarle el sentido — pero que solo una la dejaba dormir tranquila.",
      "Se formó en astrología tropical en Montevideo y profundizó en sinastría y astrología relacional en Buenos Aires. Once años después enseña con una convicción sencilla: la carta no es un destino escrito, es una brújula que hay que aprender a leer con paciencia.",
    ],
    formations: [
      { year: "MMXV", title: "Astrología tropical · fundamentos", place: "Montevideo" },
      { year: "MMXVIII", title: "Sinastría y astrología del vínculo", place: "Buenos Aires" },
      { year: "MMXXII", title: "Astrología horaria", place: "Online" },
    ],
    courses: [
      { num: "I", tag: "Astrología · Vínculos", title: "Sinastría: el mapa del vínculo", students: "XX", moon: "◑", status: "Abierto", slug: "sinastria-vinculo" },
      { num: "II", tag: "Astrología · Anual", title: "Retorno solar: leer el año que empieza", students: "XXX", moon: "○", status: "Abierto", slug: "retorno-solar" },
      { num: "III", tag: "Astrología · Consulta", title: "Astrología horaria: preguntas al cielo", students: "XIV", moon: "●", status: "Cerrado", slug: "astrologia-horaria" },
    ],
    testimonios: [
      { text: "Vi mi carta de vínculo sin el filtro romántico con el que la había leído siempre. Cambió cómo elijo con quién quedarme.", who: "Nicolás F.", course: "Sinastría: el mapa del vínculo MMXXV" },
      { text: "Cada retorno solar con ella es un corte de caja honesto del año, sin promesas vacías.", who: "Agustina P.", course: "Retorno solar MMXXIV" },
      { text: "La astrología horaria parecía un truco de salón hasta que la vi trabajar una pregunta real.", who: "Tomás B.", course: "Astrología horaria MMXXVI" },
    ],
    birthChart: {
      date: "22 sep MCMLXXXVIII",
      planets: [
        { sym: "☉", angle: 195, r: 70 }, { sym: "☽", angle: 75, r: 70 },
        { sym: "☿", angle: 210, r: 70 }, { sym: "♀", angle: 160, r: 70 },
        { sym: "♂", angle: 280, r: 70 }, { sym: "♃", angle: 20, r: 70 },
        { sym: "♄", angle: 320, r: 70 },
      ],
    },
  },
  {
    slug: "mara-iturri",
    name: "Mara Iturri",
    glyph: "☘",
    role: "Herbolaria · Curandera",
    location: "Oaxaca · México",
    discipline: "herbalismo",
    years: "IX",
    students: "410",
    coursesCount: "II",
    rating: "4.7",
    sun: "♉ Tauro", moon: "♍ Virgo", asc: "♑ Capricornio",
    quote: "Las plantas no curan. Acompañan al cuerpo a recordar cómo curarse.",
    bio: [
      "Mara creció entre el monte y el mercado de su abuela materna, que vendía manojos de plantas y sabía, sin preguntarlo, para qué venía cada quien. De ella heredó no las recetas — esas se aprenden — sino el criterio: mirar primero a la persona, después a la planta.",
      "Se formó en herbolaria tradicional en Oaxaca y complementó su práctica con fitoterapia y fermentos. Nueve años después sostiene un principio que no negocia: la planta acompaña, no reemplaza el criterio médico ni la escucha del cuerpo.",
    ],
    formations: [
      { year: "MMXVII", title: "Herbolaria tradicional", place: "Oaxaca" },
      { year: "MMXX", title: "Fitoterapia y fermentos", place: "Oaxaca" },
      { year: "MMXXIII", title: "Etnobotánica del sur de México", place: "Online" },
    ],
    courses: [
      { num: "I", tag: "Herbal · Iniciación", title: "Botica de monte: plantas del patio", students: "XXVIII", moon: "○", status: "Abierto", slug: "botica-de-monte" },
      { num: "II", tag: "Herbal · Intermedio", title: "Fermentos de plantas: vinagres y jarabes", students: "XVIII", moon: "◐", status: "Abierto", slug: "fermentos-de-plantas" },
    ],
    testimonios: [
      { text: "Me enseñó a reconocer lo que ya crecía en mi propio patio. Dejé de buscar tan lejos.", who: "Valeria N.", course: "Botica de monte MMXXV" },
      { text: "Ninguna promesa milagrosa, todo el tiempo criterio. Se nota que respeta el cuerpo de cada quien.", who: "Rodrigo A.", course: "Fermentos de plantas MMXXIV" },
      { text: "Aprendí más sobre observación paciente que sobre recetas. Era justo lo que necesitaba.", who: "Ximena L.", course: "Botica de monte MMXXVI" },
    ],
    birthChart: {
      date: "14 may MCMXC",
      planets: [
        { sym: "☉", angle: 45, r: 70 }, { sym: "☽", angle: 165, r: 70 },
        { sym: "☿", angle: 60, r: 70 }, { sym: "♀", angle: 20, r: 70 },
        { sym: "♂", angle: 250, r: 70 }, { sym: "♃", angle: 300, r: 70 },
        { sym: "♄", angle: 130, r: 70 },
      ],
    },
  },
  {
    slug: "ines-volpe",
    name: "Inés Volpe",
    glyph: "☽",
    role: "Maestra de Reiki",
    location: "Rosario · Argentina",
    discipline: "reiki",
    years: "X",
    students: "530",
    coursesCount: "II",
    rating: "4.8",
    sun: "♋ Cáncer", moon: "♓ Piscis", asc: "♍ Virgo",
    quote: "El silencio durante una sesión es el lugar donde sucede todo.",
    bio: [
      "Inés llegó al Reiki en un momento que prefiere no detallar en las presentaciones — solo dice que fue una época de mucho ruido, y que la primera sesión fue la primera vez en años que sintió silencio. Volvió por más, después se formó, y con el tiempo entendió que quería sostener ese silencio para otros.",
      "Recibió la maestría en la línea Usui en Rosario y completó su formación con estudios en Buenos Aires. Diez años después enseña con una premisa que repite en cada nivel: las manos no hacen nada especial — lo especial es lo que la persona se permite soltar mientras están puestas.",
    ],
    formations: [
      { year: "MMXVI", title: "Reiki nivel I · línea Usui", place: "Rosario" },
      { year: "MMXIX", title: "Reiki nivel II · símbolos", place: "Rosario" },
      { year: "MMXXIII", title: "Reiki nivel III · maestría", place: "Buenos Aires" },
    ],
    courses: [
      { num: "I", tag: "Reiki · Nivel II", title: "Reiki nivel II: símbolos y práctica a distancia", students: "XVI", moon: "◐", status: "Abierto", slug: "reiki-nivel-2" },
      { num: "II", tag: "Reiki · Práctica", title: "Círculo de práctica: imposición de manos", students: "XXII", moon: "●", status: "Abierto", slug: "circulo-imposicion-manos" },
    ],
    testimonios: [
      { text: "No promete nada que no pueda sostener. Solo silencio, presencia y manos quietas — y con eso alcanza.", who: "Marcos T.", course: "Reiki nivel II MMXXV" },
      { text: "El círculo de práctica me devolvió las ganas de sentarme con otros sin llenar el silencio de palabras.", who: "Florencia H.", course: "Círculo de práctica MMXXIV" },
      { text: "Enseña con una calma que se contagia antes de que abra la boca.", who: "Diego C.", course: "Reiki nivel II MMXXVI" },
    ],
    birthChart: {
      date: "30 jun MCMLXXXIX",
      planets: [
        { sym: "☉", angle: 105, r: 70 }, { sym: "☽", angle: 345, r: 70 },
        { sym: "☿", angle: 90, r: 70 }, { sym: "♀", angle: 130, r: 70 },
        { sym: "♂", angle: 200, r: 70 }, { sym: "♃", angle: 30, r: 70 },
        { sym: "♄", angle: 260, r: 70 },
      ],
    },
  },
];
