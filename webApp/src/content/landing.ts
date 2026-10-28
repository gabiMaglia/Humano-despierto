/**
 * Texto editorial de la portada y de la ficha (spec Brote, «Reglas de contenido»). Lo edita la
 * escuela; las cifras, cursos, guías y testimonios NO viven acá: salen de la base.
 *
 * La cita del hero es la de la guía destacada (`profiles.quote`, dato real con su nombre). La de
 * acá es el respaldo cuando ninguna guía tiene cita, y por eso no lleva firma: atribuirle a una
 * guía real una frase escrita en el repo sería inventar.
 */

export interface LandingContent {
  hero: {
    fallbackQuote: string;
    fallbackByline: string;
    ctaCursos: string;
    ctaGuias: string;
  };
  manifiesto: { title: string; paragraphs: readonly string[]; cta: string };
  cursos: { title: string; lead: string; verTodos: (n: number) => string };
  cifra: { verbo: string; nota: string };
  guias: { title: string; lead: string; verPerfil: string; verTodas: string };
  testimonios: { title: string };
  empezar: {
    title: string;
    /** Por FreeClassClaim: sólo «todos» afirma que cada curso tiene una. */
    lead: { todos: string; prudente: string; ninguno: string };
    titleSinClase: string;
    pasos: readonly { title: string; detail: string }[];
    pasosSinClase: readonly { title: string; detail: string }[];
    cta: string;
  };
}

export const LANDING: LandingContent = {
  hero: {
    fallbackQuote: "Se aprende de alguien que practica lo que enseña.",
    fallbackByline: "Escuela online de tarot, astrología, herbolaria, reiki y magia.",
    ctaCursos: "Ver los cursos",
    ctaGuias: "Conocé a las guías",
  },
  manifiesto: {
    title: "Se aprende de alguien, no de un video.",
    paragraphs: [
      "Las guías de esta escuela no son presentadoras. Son tarotistas, astrólogas, herboristas y reikistas que atienden, leen y preparan todos los días, y que grabaron sus cursos como si te los dieran en la mesa de la cocina.",
      "Vos elegís el curso, lo ves a tu ritmo, bajás el material y practicás. Si te trabás, le preguntás a la guía dentro de la misma clase. Cuando terminás, queda un certificado con tu nombre.",
    ],
    cta: "Cómo empezar",
  },
  cursos: {
    title: "Cursos",
    lead: "Completos desde el primer día. Sin fechas, sin cupos, sin vencimiento.",
    verTodos: (n) => (n === 1 ? "Ver el curso" : `Ver los ${n} cursos`),
  },
  cifra: {
    verbo: "para aprender",
    nota: "Todo lo que ves en esta página sale de los cursos publicados hoy.",
  },
  guias: {
    title: "Las guías",
    lead: "Cada una practica lo que enseña. En su perfil están sus cursos y lo que dicen sus alumnas.",
    verPerfil: "Ver su perfil",
    verTodas: "Ver todas las guías",
  },
  testimonios: { title: "Lo que dicen las alumnas" },
  empezar: {
    title: "Empezá por la clase gratuita.",
    lead: {
      todos: "Cada curso tiene una para ver sin inscribirte. Mirala, y si te gusta cómo enseña la guía, pedí el curso entero.",
      prudente: "Muchos cursos tienen una clase gratuita. Mirala, y si te gusta cómo enseña la guía, pedí el curso entero.",
      ninguno: "En la página de cada curso está el programa completo: cada clase, cuánto dura y qué material trae.",
    },
    titleSinClase: "Empezá por el programa.",
    pasos: [
      { title: "Mirás la clase gratuita", detail: "En la página del curso, cuando el curso la tiene." },
      { title: "Pedís la inscripción", detail: "La escuela la revisa y te avisa por mail." },
      { title: "Lo ves a tu ritmo", detail: "Completo desde el primer día y sin vencimiento. Al terminar queda tu certificado." },
    ],
    pasosSinClase: [
      { title: "Mirás el programa", detail: "Cada clase, su duración y su material." },
      { title: "Pedís la inscripción", detail: "La escuela la revisa y te avisa por mail." },
      { title: "Lo ves a tu ritmo", detail: "Completo desde el primer día y sin vencimiento. Al terminar queda tu certificado." },
    ],
    cta: "Elegir un curso",
  },
};

/** Preguntas frecuentes de la ficha (B1). Cada respuesta describe lo que el producto hace hoy. */
export const COURSE_FAQ = [
  {
    q: "¿Cuánto tiempo tengo para ver el curso?",
    a: "Todo el que quieras. Cuando la escuela habilita tu inscripción, el curso queda completo en tu panel y no vence. Tu avance se guarda solo.",
  },
  {
    q: "¿Cómo me inscribo?",
    a: "Desde esta página pedís la inscripción. La escuela revisa el pedido y te avisa por mail cuando el curso está habilitado.",
  },
  {
    q: "¿El certificado tiene validez oficial?",
    a: "No. Acredita que recorriste el curso completo, no que rendiste una evaluación. Lleva tu nombre, la fecha y un código que cualquiera puede verificar.",
  },
  {
    q: "¿Le puedo hacer preguntas a la guía?",
    a: "Sí. Cada clase tiene una pestaña de preguntas. La guía responde ahí y la respuesta queda visible para las alumnas del curso.",
  },
] as const;
