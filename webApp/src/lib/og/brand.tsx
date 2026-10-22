// Piezas para satori (next/og), no para el DOM: solo flexbox y el subconjunto de CSS que
// satori entiende. Los `style` son props de satori; la CSP del documento no los ve.
// Todo glifo va como <svg>, nunca como texto (ver text.ts).
import { ogCourseTitle, ogSafeText } from "./text";

export const OG_SIZE = { width: 1200, height: 630 };

// Mismos valores que tokens.css (Brote, ADR-015): fondo bosque, texto blanco, salvia y miel de acento.
// La composición completa se rediseña en T-061; acá sólo cambia la paleta.
export const OG_COLORS = {
  bg: "#1f2e24",
  texto: "#ffffff",
  salvia: "#cfdccb",
  miel: "#c7922e",
} as const;

export function Sparkle({ size = 40, color = OG_COLORS.miel }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={color} />
    </svg>
  );
}

const FRAME = {
  width: "100%",
  height: "100%",
  display: "flex",
  position: "relative",
  backgroundColor: OG_COLORS.bg,
  backgroundImage: "radial-gradient(circle at 75% 30%, rgba(207,220,203,0.18), rgba(31,46,36,0) 60%)",
  fontFamily: "Cinzel",
  color: OG_COLORS.texto,
} as const;

function Watermark({ text, top }: { text: string; top?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 60,
        ...(top === undefined ? { bottom: -40 } : { top }),
        display: "flex",
        fontSize: 360,
        fontWeight: 700,
        color: OG_COLORS.salvia,
        opacity: 0.08,
      }}
    >
      {text}
    </div>
  );
}

export function SiteOgCard() {
  return (
    <div style={{ ...FRAME, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Arriba del titulo: centrado y a lo ancho, cualquier numeral abajo queda detras del texto. */}
      <Watermark text="I" top={-150} />
      <Sparkle size={56} />
      <div style={{ display: "flex", marginTop: 36, fontSize: 92, fontWeight: 700, letterSpacing: 6 }}>
        HUMANO DESPIERTO
      </div>
      <div style={{ display: "flex", marginTop: 20, fontSize: 34, color: OG_COLORS.salvia, letterSpacing: 10 }}>
        Escuela holística
      </div>
    </div>
  );
}

export interface CourseOgInput {
  title: string;
  titleEm: string | null;
  discipline: string | null;
  teacherName: string | null;
  romanNum: string | null;
}

export function CourseOgCard({ course, cover }: { course: CourseOgInput; cover: ArrayBuffer | null }) {
  const title = ogCourseTitle(course.title, course.titleEm);
  const discipline = ogSafeText(course.discipline ?? "", 40);
  const teacher = ogSafeText(course.teacherName ?? "", 50);
  const roman = ogSafeText(course.romanNum ?? "", 8);

  return (
    <div style={{ ...FRAME, flexDirection: "column", justifyContent: "flex-end", padding: 72 }}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img
          // @ts-expect-error satori acepta un ArrayBuffer como src; el tipo del DOM no.
          src={cover}
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
      ) : null}
      {cover ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_SIZE.width,
            height: OG_SIZE.height,
            display: "flex",
            backgroundColor: "rgba(31,46,36,0.7)",
          }}
        />
      ) : (
        roman && <Watermark text={roman} />
      )}
      <div style={{ display: "flex", alignItems: "center" }}>
        <Sparkle size={30} />
        <div style={{ display: "flex", marginLeft: 16, fontSize: 28, color: OG_COLORS.salvia, letterSpacing: 8 }}>
          {discipline || "Humano Despierto"}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 24, fontSize: 72, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
        {title}
      </div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: OG_COLORS.miel }}>
        {teacher ? `con ${teacher}` : "Humano Despierto"}
      </div>
    </div>
  );
}
