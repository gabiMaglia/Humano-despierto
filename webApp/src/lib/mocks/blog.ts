// T-017 · MOCK DECLARADO A PROPOSITO, fuera de alcance del ticket. El PO acotó el pedido a
// "cursos, alumnos y docentes"; `blog.ts` (Diario) no tiene tabla en el esquema de 9 tablas
// ratificado (T-001) -- no hay `posts` ni `authors`. Desmockearlo no es conectar un dato
// existente: es diseñar una feature nueva (blog/CMS con autoría, publicación, etc.), con su
// propio ADR y ticket. Ver `engram/03_backlog.md` T-017.
export const BLOG = {
  featured: {
    cat:"ASTROLOGÍA · ENSAYO", glyph:"☉",
    title:"Sobre los eclipses que no se pueden esquivar",
    sub:"Notas de campo después del eclipse en Tauro",
    excerpt:"Hay tránsitos que pasan rozando y hay otros que parten la corteza. Los eclipses pertenecen al segundo grupo: no se interpretan, se atraviesan.",
    author:"Luz Marini", date:"24 ABR MMXXVI", read:"XII MIN", moon:"●",
  },
  posts: [
    { num:"I",   cat:"TAROT",           glyph:"✦", title:"Las cartas que se niegan a hablar",         author:"Sol Mayor",  date:"21 ABR", read:"VII MIN", moon:"◐" },
    { num:"II",  cat:"HERBALISMO",      glyph:"☘", title:"Tres simples para el pasaje del frío",      author:"Mara Iturri",date:"18 ABR", read:"IX MIN",  moon:"○" },
    { num:"III", cat:"REIKI · OFICIO",  glyph:"☉", title:"Sostener el silencio durante una sesión",  author:"Inés Volpe", date:"14 ABR", read:"V MIN",   moon:"●" },
    { num:"IV",  cat:"ASTROLOGÍA",      glyph:"♀", title:"Venus retrógrado y la justicia íntima",     author:"Luz Marini", date:"09 ABR", read:"X MIN",   moon:"◑" },
    { num:"V",   cat:"PRÁCTICA",        glyph:"☽", title:"Cuaderno de bitácora · primer círculo",    author:"Lía M.",     date:"06 ABR", read:"IV MIN",  moon:"◐" },
    { num:"VI",  cat:"ENSAYO",          glyph:"⚯", title:"Lo que el linaje no se anima a decirnos",  author:"Sol Mayor",  date:"02 ABR", read:"XV MIN",  moon:"○" },
  ],
  cats: [
    { name:"Todos",      n:84, active:true  },
    { name:"Tarot",      n:21, active:false },
    { name:"Astrología", n:28, active:false },
    { name:"Herbalismo", n:14, active:false },
    { name:"Reiki",      n:9,  active:false },
    { name:"Oficio",     n:12, active:false },
  ],
  authors: [
    { name:"Sol Mayor",  glyph:"☉", posts:"XIV" },
    { name:"Luz Marini", glyph:"♀", posts:"XI"  },
    { name:"Mara Iturri",glyph:"☘", posts:"VIII"},
    { name:"Inés Volpe", glyph:"☽", posts:"VI"  },
  ],
  serie: { title:"Cuaderno de Lía", sub:"Una estudiante anota su primer círculo, semana a semana.", count:"IX entregas", glyph:"☾" },
} as const;
