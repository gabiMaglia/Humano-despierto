// Extracted from design_handoff_humano_humano/reference/hifi/desktop.jsx

export const HERO = {
  badge: "Inscripción abierta · Todo el año",
  h1: {
    pre:  "Una escuela para",
    em:   "oficios sutiles",
    post: "del alma humana",
  },
  sub: "Astrología, tarot, herbalismo y reiki enseñados por guías con linaje. Formación profesional para terapeutas que buscan profundidad, no atajos.",
  ctas: [
    { label: "Cruzar el umbral ↦", href: "/cursos", primary: true  },
    { label: "Ver el catálogo",    href: "/cursos", primary: false },
  ],
  stats: [
    { num: "12", label: "Guías"        },
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

// T-017 · `COURSES` y `MAESTRA` se eliminaron de este archivo: `FeaturedCourses.tsx` lee
// `courses.featured` y `MaestraFeature.tsx` lee `profiles` (ver `src/lib/server/courses.ts` y
// `src/lib/server/guias.ts`). Ningún componente de curso/docente importa ya de `@/lib/mocks/`.

export const LUNAR_DAYS = [
  { phase: "new",      date: "6 MAY",  label: "sembrar"  },
  { phase: "crescent", date: "10",     label: "iniciar"  },
  { phase: "half",     date: "14",     label: "crecer"   },
  { phase: "gibbous",  date: "18",     label: "culminar" },
  { phase: "full",     date: "22 MAY", label: "liberar",   today: true },
  { phase: "gibbous",  date: "26",     label: "integrar" },
  { phase: "half",     date: "30",     label: "soltar"   },
  { phase: "crescent", date: "3 JUN",  label: "descansar"},
] as const;

// T-017 · MOCK DECLARADO A PROPOSITO, fuera de alcance del ticket (criterio 3: "salen de la
// base o se marcan como placeholder visible"). Son citas de ALUMNAS sin curso ni docente
// asociado -- prueba social generica de la landing, no la ficha de una docente (eso SI se
// desmockeo, ver `profiles.testimonials` en `src/lib/server/guias.ts`). No hay tabla de
// reviews en el esquema de 9 tablas ratificado (T-001): crear una -- con alta real de alumnas,
// moderacion, vinculo a inscripcion verificada -- es una feature nueva (reviews), no conectar
// un mock existente. `TestimonialsSection.tsx` lo marca visiblemente como ilustrativo en
// pantalla para que no parezca un dato real.
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
