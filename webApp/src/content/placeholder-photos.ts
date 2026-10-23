/**
 * PLACEHOLDER (ADR-015) · Fotos de Unsplash verificadas a mano, una por una, en
 * `design_handoff_humano_humano/reference/brote/README.md`. Lista cerrada: una foto nueva se mira
 * antes de entrar y su `alt` dice lo que se ve. Prohibida la 1469474968028-56623f02e42e (es la de
 * somosbuenavida.com). Sin retratos: una foto de stock de una persona junto
 * al nombre de una guía real le atribuiría una cara ajena (decisión 3 del PO, QA T-060 D1). Un curso o una guía con portada/avatar propio usa el suyo, nunca estas.
 */

export type PhotoUse = "hero" | "oficio";

export interface PlaceholderPhoto {
  id: string;
  alt: string;
  use: PhotoUse;
}

export const PLACEHOLDER_PHOTOS = [
  { id: "1441974231531-c6227db76b6e", alt: "Sendero en un bosque con luz de sol entre los árboles", use: "hero" },
  { id: "1470252649378-9c29740c9fa8", alt: "Sol saliendo sobre un prado con niebla", use: "hero" },
  { id: "1760445529648-9c8af38a0bb3", alt: "Una mano corta ramitas de romero de una planta, al aire libre", use: "oficio" },
  { id: "1600429991827-5224817554f8", alt: "Cartas de tarot desplegadas, con el As de Oros en el centro", use: "oficio" },
  { id: "1694144167581-8bc49479f6b7", alt: "Cartas de tarot sobre una mesa de madera, junto a una vela", use: "oficio" },
  { id: "1772710333229-97bb734d5d5e", alt: "Cartas de tarot, piedras y un atado de salvia sobre fondo blanco", use: "oficio" },
  { id: "1519681393784-d120267933ba", alt: "Vía Láctea sobre montañas nevadas de noche", use: "oficio" },
  { id: "1545840716-c82e9eec6930", alt: "Frascos de vidrio con hierbas secas y etiquetas en un estante", use: "oficio" },
  { id: "1492552181161-62217fc3076d", alt: "Una mano vierte aceite en un mortero de piedra", use: "oficio" },
  { id: "1567922045116-2a00fae2ed03", alt: "Cuenco de té entre hojas verdes, visto desde arriba", use: "oficio" },
  { id: "1447619297994-b829cc1ab44a", alt: "Dos manos abiertas con las palmas hacia arriba sobre fondo oscuro", use: "oficio" },
  { id: "1762162623066-89e462b3d8f0", alt: "Tres velas encendidas en la oscuridad", use: "oficio" },
] as const satisfies readonly PlaceholderPhoto[];

const byId = new Map<string, PlaceholderPhoto>(PLACEHOLDER_PHOTOS.map((p) => [p.id, p]));

function photo(id: string): PlaceholderPhoto {
  const p = byId.get(id);
  if (!p) throw new Error(`placeholder-photos: id desconocido ${id}`);
  return p;
}

/** Sin query: el ancho y la calidad los pone `next/image` al pasar por el optimizador. */
export function unsplashUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}`;
}

export const HERO_PHOTO = photo("1441974231531-c6227db76b6e");

// `discipline` es texto libre del docente ("Tarot", "Herbal", "Astrología"): se compara por raíz,
// sin tildes ni mayúsculas, para que "tarot iniciático" y "TAROT" caigan en la misma foto.
const BY_DISCIPLINE: ReadonlyArray<[root: string, id: string]> = [
  ["tarot", "1600429991827-5224817554f8"],
  ["astrolog", "1519681393784-d120267933ba"],
  ["herb", "1545840716-c82e9eec6930"],
  ["reiki", "1447619297994-b829cc1ab44a"],
  ["magia", "1762162623066-89e462b3d8f0"],
];
const NEUTRAL = "1567922045116-2a00fae2ed03";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function placeholderForDiscipline(discipline: string | null | undefined): PlaceholderPhoto {
  const d = normalize(discipline ?? "");
  const hit = d ? BY_DISCIPLINE.find(([root]) => d.includes(root)) : undefined;
  return photo(hit ? hit[1] : NEUTRAL);
}
