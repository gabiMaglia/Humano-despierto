// Extracted from design_handoff_humano_humano/reference/hifi/desktop.jsx

export const HERO = {
  badge: "Cohorte de Luna Nueva · Mayo",
  h1: {
    pre:  "Una escuela para",
    em:   "oficios sutiles",
    post: "del alma humana",
  },
  sub: "Astrología, tarot, herbalismo y reiki enseñados por maestras con linaje. Formación profesional para terapeutas que buscan profundidad, no atajos.",
  ctas: [
    { label: "Cruzar el umbral ↦", href: "/cursos", primary: true  },
    { label: "Ver el catálogo",    href: "/cursos", primary: false },
  ],
  stats: [
    { num: "12", label: "Maestras"     },
    { num: "48", label: "Cursos vivos" },
    { num: "2k", label: "Iniciadas"    },
  ],
} as const;

export const DISCIPLINES = [
  { label: "Astrología",  desc: "Carta natal, tránsitos, retornos",    accent: "lila" },
  { label: "Tarot",       desc: "Arcanos, tiradas, símbolo",            accent: "gold" },
  { label: "Reiki",       desc: "Sanación energética, niveles I–III",   accent: "lila" },
  { label: "Herbalismo",  desc: "Plantas aliadas, tinturas, ritual",    accent: "lila" },
] as const;

export const COURSES = [
  {
    num: "I", tag: "Astrología",
    title: "Carta natal", titleEm: "esencial",
    desc: "El mapa del alma encarnada en doce casas. Ocho semanas para leer cualquier carta con confianza.",
    teacher: "Luna Arce", price: "$ 240", weeks: "8 sem · 24 lecciones",
    featured: false, slug: "carta-natal-esencial",
  },
  {
    num: "II", tag: "Tarot",
    title: "Tarot", titleEm: "iniciático",
    desc: "Los 22 arcanos como espejo. Aprenderás a sostener consultas con ética y profundidad simbólica.",
    teacher: "Sol Mayor", price: "$ 280", weeks: "10 sem · live + grabado",
    featured: true, slug: "tarot-iniciatico",
  },
  {
    num: "III", tag: "Reiki",
    title: "Reiki", titleEm: "nivel I",
    desc: "Iniciación en la imposición de manos. Cuerpo sutil, chakras, ética del canal.",
    teacher: "Aurora Violeta", price: "$ 180", weeks: "6 sem · presencial",
    featured: false, slug: "reiki-nivel-1",
  },
] as const;

export const MAESTRA = {
  name:     "Luna Arce",
  title:    "Astróloga · Tarotista · 22 años de práctica",
  quote:    "No enseño técnicas, enseño a escuchar lo que ya sabe el cuerpo.",
  sign:     "♓ Piscis · Asc. Escorpio",
  courses:  3,
  students: 418,
  href:     "/maestras/luna-arce",
} as const;

export const LUNAR_DAYS = [
  { phase: "new",      date: "6 MAY",  label: "sembrar"  },
  { phase: "crescent", date: "10",     label: "iniciar"  },
  { phase: "half",     date: "14",     label: "crecer",    event: "LIVE NATAL"      },
  { phase: "gibbous",  date: "18",     label: "culminar" },
  { phase: "full",     date: "22 MAY", label: "liberar",   event: "RITUAL ABIERTO", today: true },
  { phase: "gibbous",  date: "26",     label: "integrar" },
  { phase: "half",     date: "30",     label: "soltar"   },
  { phase: "crescent", date: "3 JUN",  label: "descansar"},
] as const;

export const TESTIMONIALS = [
  {
    quote: "Encontré aquí la profundidad que faltaba en mis formaciones previas. Volví a sentirme estudiante.",
    who: "Iris Maldonado", role: "Astróloga · México",
  },
  {
    quote: "La forma en que enseñan tarot acá no es trucos, es alfabeto del alma. Cambió mi práctica.",
    who: "León Petersen", role: "Terapeuta · Argentina",
  },
  {
    quote: "Lo que más agradezco es el círculo. Estudio sola pero nunca me siento sola.",
    who: "Mar Coronado", role: "Curandera · Chile",
  },
] as const;
