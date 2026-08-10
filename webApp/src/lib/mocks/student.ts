export const STUDENT = {
  name: "Lía", glyph: "☽", sign: "Luna en Piscis",
  lunarPhase: { name:"Cuarto creciente", icon:"◐", date:"4 mayo", desc:"Tiempo de afirmar lo iniciado. Día propicio para sostener intenciones." },
  enrolled: [
    { num:"I",   tag:"Tarot · Iniciación",    title:"El loco emprende camino", maestra:"Sol Mayor",    progress:78,  lastSeen:"hace 2 días",   moon:"◐", module:"IV · El sostén ético",      sessionsDone:14, sessionsTotal:18 },
    { num:"II",  tag:"Astrología · Maestría", title:"Cartografía del alma",    maestra:"Luz Marini",   progress:32,  lastSeen:"hace 1 semana", moon:"○", module:"II · Casas y planetas",     sessionsDone:6,  sessionsTotal:18 },
    { num:"III", tag:"Herbalismo · 1 día",    title:"Simples para el invierno",maestra:"Mara Iturri",  progress:100, lastSeen:"completado",    moon:"●", module:"Cerrado · MMXXV",           sessionsDone:4,  sessionsTotal:4  },
  ],
  bitacora: [
    { date:"28 ABR", glyph:"✦", title:"Sobre las cartas que no hablan",    preview:"Hoy salió la luna del revés y me quedé mirando el espejo..." },
    { date:"24 ABR", glyph:"☾", title:"Primer círculo de práctica",        preview:"Sostener una consulta es como sostener una respiración compartida." },
    { date:"19 ABR", glyph:"☉", title:"Eclipse en Tauro · notas",          preview:"Lo que toca este eclipse no se va a poder esquivar." },
  ],
  circulo: [
    { name:"Joaquín R.", glyph:"♃", text:"Compartí la tirada que hice ayer. Necesito otros ojos." },
    { name:"Camila V.",  glyph:"♀", text:"¿Alguien usa el Marsella restaurado? Estoy entre dos ediciones." },
    { name:"Tomás A.",   glyph:"♂", text:"Subí mis notas del módulo II por si sirven al círculo." },
  ],
} as const;
