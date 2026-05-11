export const MAESTRA_DATA = {
  name: "Sol Mayor", glyph: "☉",
  role: "Tarotista · Astróloga",
  location: "Buenos Aires · Argentina",
  years: "XVIII", students: "1.240", coursesCount: "IV", rating: "4.9",
  bio: [
    "Sol llegó al tarot a los diecinueve años, cuando una abuela vasca le puso un mazo en las manos y le dijo: "no leas las cartas, dejá que ellas te lean a vos".",
    "Estudió astrología tropical con Eugenio Carutti en Buenos Aires y se formó en el tarot de Marsella con la escuela de Alejandro Jodorowsky en Francia. Dieciocho años después, sigue creyendo que el oficio es escuchar.",
  ],
  quote: "No leemos el futuro. Leemos el alma del momento presente.",
  formations: [
    { year:"MMVIII", title:"Tarot de Marsella · Jodorowsky", place:"París"       },
    { year:"MMXII",  title:"Astrología tropical · Casa XI",   place:"Buenos Aires"},
    { year:"MMXVI",  title:"Cábala y simbolismo",             place:"Jerusalén"  },
    { year:"MMXX",   title:"Trauma-informed counseling",      place:"Online"     },
  ],
  courses: [
    { num:"I",   tag:"Tarot · Iniciación", title:"El loco emprende camino",  students:"XLII", moon:"◐", status:"En curso",        slug:"el-loco" },
    { num:"II",  tag:"Tarot · Maestría",   title:"Tarot iniciático",          students:"XII",  moon:"○", status:"Próximo · 6 may", slug:"tarot-iniciatico" },
    { num:"III", tag:"Astrología · Maestría",title:"Cartografía del alma",  students:"XXIV", moon:"●", status:"Cerrado",          slug:"cartografia" },
    { num:"IV",  tag:"Encuentro · 1 día",  title:"Plenilunio en Escorpio",    students:"C",    moon:"●", status:"Próximo · 23 may",slug:"plenilunio" },
  ],
  testimonios: [
    { text:"Hizo de un mazo de cartas un espejo del que no quiero alejarme.", who:"Lía M.", course:"Tarot iniciático MMXXV" },
    { text:"Sostiene como pocas. Te empuja al borde con una ternura que da miedo y abraza.", who:"Joaquín R.", course:"Cartografía del alma MMXXIV" },
    { text:"Sol no enseña. Te recuerda algo que ya sabías.", who:"Camila V.", course:"El loco emprende camino MMXXVI" },
  ],
  birthChart: {
    date: "11 jul MCMLXXXII",
    planets: [
      { sym:"☉", angle:215, r:70 }, { sym:"☽", angle:145, r:70 },
      { sym:"☿", angle:230, r:70 }, { sym:"♀", angle:195, r:70 },
      { sym:"♂", angle:100, r:70 }, { sym:"♃", angle:30,  r:70 },
      { sym:"♄", angle:285, r:70 },
    ],
  },
} as const;
