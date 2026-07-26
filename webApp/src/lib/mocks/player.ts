export const LESSON = {
  course: "Tarot iniciático", courseNum: "II",
  module: "III · Las tiradas",
  lessonNum: "VII",
  title: "La cruz celta como mapa del alma",
  maestra: "Sol Mayor",
  duration: "52:18", current: "24:36", progress: 0.47,
  date: "24 abr MMXXVI",
  modules: [
    { num:"I",   title:"El loco emprende camino",    lessons:4, current:false, done:true,  locked:false },
    { num:"II",  title:"Los planetas y las cartas",   lessons:3, current:false, done:true,  locked:false },
    {
      num:"III", title:"Las tiradas",                lessons:5, current:true,  done:false, locked:false,
      lessonList: [
        { num:"I",   title:"Tirada de tres cartas",                dur:"38:12", state:"done"    },
        { num:"II",  title:"El presente, lo oculto, el consejo",   dur:"42:08", state:"done"    },
        { num:"III", title:"Apertura del hexagrama",               dur:"46:54", state:"done"    },
        { num:"IV",  title:"La cruz celta como mapa del alma",     dur:"52:18", state:"current" },
        { num:"V",   title:"El árbol de la vida",                  dur:"64:00", state:"locked"  },
      ],
    },
    { num:"IV",  title:"Sostener al consultante",    lessons:4, current:false, done:false, locked:true  },
    { num:"V",   title:"Síntesis y práctica final",  lessons:5, current:false, done:false, locked:true  },
  ],
  chapters: [
    { time:"00:00", label:"Apertura · ritual de entrada",          t:0    },
    { time:"04:30", label:"Las diez posiciones, una por una",      t:0.085},
    { time:"18:20", label:"Cómo leer las relaciones entre cartas", t:0.35 },
    { time:"32:00", label:"Dos consultas reales en grupo",         t:0.61 },
    { time:"46:10", label:"Cierre · qué llevarse a la práctica",   t:0.88 },
  ],
  notes: [
    { time:"04:12", text:"La cruz celta no se lee — se camina. Diez estaciones, no diez respuestas." },
    { time:"17:48", text:"Pos. 5 (lo que está sobre): conciencia. Pos. 6 (lo que viene): no es predicción, es brotación." },
    { time:"23:02", text:"Sol dijo: 'no preguntes qué significa la carta, preguntá qué pregunta te hace la carta a vos'." },
  ],
  resources: [
    { type:"PDF",   name:"Mapa de la cruz celta · 10 posiciones", size:"1.2 MB" },
    { type:"AUDIO", name:"Meditación previa a la consulta",        size:"14:08"  },
    { type:"TEXTO", name:"Bibliografía · Jodorowsky cap. IV",      size:"8 págs" },
  ],
} as const;
