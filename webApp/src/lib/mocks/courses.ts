import type { CourseCardData } from "@/components/molecules/CourseCard";

export const CATALOG_COURSES: CourseCardData[] = [
  { num:"I",   tag:"Astrología", level:"Inicial",    title:"Carta natal",   titleEm:"esencial",   desc:"El mapa del alma encarnada en doce casas.",             teacher:"Luna Arce",     price:"$ 240", weeks:"8 sem",  format:"live + grabado", moon:"○",  featured:false, slug:"carta-natal-esencial" },
  { num:"II",  tag:"Tarot",      level:"Maestría",   title:"Tarot",         titleEm:"iniciático", desc:"Los 22 arcanos como espejo del proceso.",              teacher:"Sol Mayor",     price:"$ 280", weeks:"10 sem", format:"live",            moon:"◑",  featured:true,  slug:"tarot-iniciatico" },
  { num:"III", tag:"Reiki",      level:"Inicial",    title:"Reiki",         titleEm:"nivel I",    desc:"Iniciación en la imposición de manos.",                teacher:"Aurora Violeta",price:"$ 180", weeks:"6 sem",  format:"presencial",     moon:"●",  featured:false, slug:"reiki-nivel-1" },
  { num:"IV",  tag:"Astrología", level:"Intermedio", title:"Tránsitos y",   titleEm:"retornos",   desc:"Leer el cielo del ahora sobre la carta.",              teacher:"Luna Arce",     price:"$ 320", weeks:"12 sem", format:"live + grabado", moon:"◐",  featured:false, slug:"transitos-retornos" },
  { num:"V",   tag:"Herbal",     level:"Intermedio", title:"Herbario",      titleEm:"lunar",      desc:"Plantas aliadas según la fase de la luna.",            teacher:"Aurora Violeta",price:"$ 220", weeks:"8 sem",  format:"grabado",         moon:"◑",  featured:false, slug:"herbario-lunar" },
  { num:"VI",  tag:"Tarot",      level:"Intermedio", title:"Arcanos",       titleEm:"menores",    desc:"Los cuatro elementos como caminos de práctica.",       teacher:"Sol Mayor",     price:"$ 200", weeks:"6 sem",  format:"grabado",         moon:"○",  featured:false, slug:"arcanos-menores" },
  { num:"VII", tag:"Reiki",      level:"Maestría",   title:"Reiki",         titleEm:"nivel III",  desc:"Maestría y transmisión de la línea Usui.",            teacher:"Aurora Violeta",price:"$ 480", weeks:"16 sem", format:"presencial",     moon:"●",  featured:false, slug:"reiki-nivel-3" },
  { num:"VIII",tag:"Astrología", level:"Inicial",    title:"Las",           titleEm:"doce casas", desc:"Una a una, el escenario donde el cielo actúa.",       teacher:"Luna Arce",     price:"$ 160", weeks:"5 sem",  format:"grabado",         moon:"◑",  featured:false, slug:"doce-casas" },
  { num:"IX",  tag:"Herbal",     level:"Inicial",    title:"Tinturas",      titleEm:"iniciales",  desc:"Preparación de tinturas madre con intención.",        teacher:"Aurora Violeta",price:"$ 140", weeks:"4 sem",  format:"grabado",         moon:"◐",  featured:false, slug:"tinturas-iniciales" },
];

export const COURSE_DETAIL = {
  num: "II", tag: "Tarot", level: "Maestría",
  title: "Tarot iniciático",
  subtitle: "los 22 arcanos como espejo del alma",
  intro: "Diez semanas para aprender a sostener una consulta de tarot con ética, profundidad simbólica y presencia. No memorizar significados — leer el espejo que la carta tiende.",
  weeks: "10 semanas", format: "Live + grabado",
  cohort: "Luna nueva · 6 mayo", price: "$ 280",
  teacher: { name: "Sol Mayor", role: "Tarotista · Astróloga · 18 años de práctica", quote: "El tarot no predice; refleja. En este recorrido aprenderás a ser un espejo claro para quien busca verse." },
  stats: [{ num: "10", label: "Semanas" }, { num: "21", label: "Sesiones" }, { num: "XII", label: "En cohorte" }],
  modules: [
    { num:"I",   title:"El loco emprende camino",    desc:"Arquetipos, viaje del héroe, los tres arcanos del comienzo.",                  sessions:"4 sesiones · 2 sem"   },
    { num:"II",  title:"Los planetas y las cartas",   desc:"Correspondencias planetarias en el tarot de Marsella y Rider-Waite.",         sessions:"3 sesiones · 1.5 sem" },
    { num:"III", title:"Las tiradas",                 desc:"Tres cartas, cruz celta, árbol de la vida. Estructura ritual de la consulta.", sessions:"5 sesiones · 2 sem"   },
    { num:"IV",  title:"Sostener al consultante",     desc:"Ética, encuadre, qué decir y qué callar. La presencia como herramienta.",    sessions:"4 sesiones · 2 sem"   },
    { num:"V",   title:"Síntesis y práctica final",   desc:"Consultas reales sostenidas en grupo. Devolución de la maestra.",            sessions:"5 sesiones · 2.5 sem" },
  ],
  includes: [
    "Acceso de por vida a las grabaciones",
    "10 sesiones live por Zoom con Sol Mayor",
    "Mazo de tarot de Marsella enviado a domicilio",
    "Cuaderno de bitácora encuadernado",
    "Círculo cerrado de práctica entre cohorte",
    "Certificado al cierre del recorrido",
  ],
} as const;
