export const COM = {
  stats: [
    { n:"CDXVIII", label:"Estudiantes en órbita" },
    { n:"XXIV",    label:"Círculos activos"       },
    { n:"IX",      label:"Maestras de planta"     },
  ],
  channels: [
    { glyph:"✦", name:"Plaza mayor",   sub:"Bienvenidas y presentaciones", n:"128 hilos", active:true  },
    { glyph:"☉", name:"Astrología",    sub:"Tránsitos en curso",           n:"64 hilos",  active:false },
    { glyph:"◐", name:"Tarot",         sub:"Tiradas y dudas",              n:"92 hilos",  active:false },
    { glyph:"☘", name:"Herbalismo",    sub:"Recetas, identificación",      n:"37 hilos",  active:false },
    { glyph:"☽", name:"Reiki & energía",sub:"Sesiones y técnica",          n:"28 hilos",  active:false },
    { glyph:"⚯", name:"Oficio",        sub:"Cómo cobrar, cómo cuidar",     n:"54 hilos",  active:false },
    { glyph:"✧", name:"Encuentros",    sub:"Quedadas IRL",                 n:"15 hilos",  active:false },
  ],
  threads: [
    { pin:true,  cat:"PLAZA MAYOR",  moon:"●", time:"hace II horas",  replies:47, title:"¿Cómo se presentaron en su primer círculo?",                    excerpt:"Las que ya pasaron por el ritual de inicio: ¿con qué llegaron, qué dejaron, qué se llevaron de vuelta?",       author:"Sol Mayor",  role:"MAESTRA"                  },
    { pin:false, cat:"ASTROLOGÍA",   moon:"◐", time:"hace V horas",   replies:23, title:"Plutón ingresando en Acuario — ¿lo están sintiendo?",            excerpt:"En lo personal noto que se removió todo lo vinculado a comunidad y al rol que juego dentro de los grupos.",    author:"Mariana T.", role:"ESTUDIANTE · COHORTE XII" },
    { pin:false, cat:"TAROT",        moon:"○", time:"hace VIII horas", replies:19, title:"Cuando salen tres espadas seguidas en una tirada propia",        excerpt:"Necesito hablarlo. Tres tiradas, tres veces el VIII de Espadas en posición central. ¿Pausa?",                  author:"Cami R.",    role:"ESTUDIANTE · COHORTE XV"  },
    { pin:false, cat:"OFICIO",       moon:"◑", time:"ayer",           replies:86, title:"Honorarios para una primera lectura — ¿cuánto se cobra?",        excerpt:"Tema espinoso pero necesario. Quería abrirlo con cuidado: ¿cómo lo trabajan ustedes con sus consultantes?",   author:"Inés Volpe", role:"MAESTRA"                  },
    { pin:false, cat:"HERBALISMO",   moon:"○", time:"hace II días",   replies:12, title:"Tintura madre de pasiflora — preparación paso a paso",           excerpt:"Subo el procedimiento que les compartí en el último círculo, con foto y proporciones.",                        author:"Mara Iturri",role:"MAESTRA"                  },
  ],
  events: [
    { day:"XII", month:"MAY", title:"Círculo de luna llena",              sub:"Encuentro abierto · Online", active:true  },
    { day:"XX",  month:"MAY", title:"Conversatorio sobre tarot terapéutico",sub:"Con Sol Mayor · Online",  active:false },
    { day:"III", month:"JUN", title:"Quedada IRL — Buenos Aires",         sub:"Café Voltaire · 19h",       active:false },
  ],
  members: [
    { glyph:"☉", name:"Sol Mayor",  role:"MAESTRA · TAROT",  online:true  },
    { glyph:"♀", name:"Luz Marini", role:"MAESTRA · ASTRO",  online:true  },
    { glyph:"☽", name:"Mariana T.", role:"ESTUDIANTE · XII",  online:true  },
    { glyph:"✦", name:"Cami R.",    role:"ESTUDIANTE · XV",  online:false },
    { glyph:"◐", name:"Lía M.",     role:"ESTUDIANTE · XV",  online:true  },
    { glyph:"☘", name:"Mara Iturri",role:"MAESTRA · HERBAL", online:false },
  ],
  pact: [
    "Hablamos desde la experiencia, no desde la verdad.",
    "No diagnosticamos. Sugerimos, acompañamos.",
    "Lo que se comparte aquí, queda aquí.",
    "Cuidamos el silencio de quien todavía no se anima.",
  ],
} as const;
