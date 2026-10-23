// Piezas para satori (next/og), no para el DOM: solo flexbox y el subconjunto de CSS que
// satori entiende. Los `style` son props de satori; la CSP del documento no los ve.
// Todo glifo va como <svg>, nunca como texto (ver text.ts).
import { ogCourseTitle, ogSafeText } from "./text";

export const OG_SIZE = { width: 1200, height: 630 };

// Mismos valores que tokens.css (Brote, ADR-015). Blanco sobre bosque 13.8:1, salvia 10.9:1,
// miel 5.1:1: todo legible achicado en una vista previa de WhatsApp.
export const OG_COLORS = {
  bg: "#1f2e24",
  texto: "#ffffff",
  salvia: "#cfdccb",
  miel: "#c7922e",
} as const;

/** El brote de la marca (mismo trazo que BrandMark), como SVG: satori no dibuja glifos sin fetch. */
export function Brote({ size = 64, color = OG_COLORS.miel }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 30V16" />
      <path d="M17 20c-6 0-9-4-9-10 6 0 9 4 9 10z" />
      <path d="M17 16c0-6 4-9 10-9 0 6-4 9-10 9z" />
    </svg>
  );
}

/** La hoja grande de B4, decorativa, en una esquina. */
function Hoja() {
  return (
    <svg width={300} height={380} viewBox="0 0 150 190" fill="none" stroke={OG_COLORS.salvia} strokeWidth={1.6}
      strokeLinecap="round" style={{ position: "absolute", right: -30, bottom: -50, opacity: 0.22 }}>
      <path d="M75 185V60" />
      <path d="M75 120c-30 0-48-20-50-52 30 2 48 20 50 52z" />
      <path d="M75 90c0-30 18-48 50-50-2 30-20 48-50 50z" />
      <path d="M75 150c-18 0-30-10-32-30 18 2 30 12 32 30z" />
      <path d="M30 68c10 8 20 12 32 12M126 42c-10 12-24 20-40 22" />
    </svg>
  );
}

const FRAME = {
  width: "100%",
  height: "100%",
  display: "flex",
  position: "relative",
  backgroundColor: OG_COLORS.bg,
  fontFamily: "Plus Jakarta Sans",
  color: OG_COLORS.texto,
} as const;

export function SiteOgCard() {
  return (
    <div style={{ ...FRAME, flexDirection: "column", justifyContent: "center", padding: "0 96px" }}>
      <Hoja />
      <Brote size={84} />
      <div style={{ display: "flex", marginTop: 32, fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
        Humano Despierto
      </div>
      <div style={{ display: "flex", marginTop: 24, fontSize: 36, color: OG_COLORS.salvia, maxWidth: 820, lineHeight: 1.3 }}>
        Escuela online de tarot, astrología, herbolaria, reiki y magia.
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
            backgroundColor: "rgba(31,46,36,0.72)",
          }}
        />
      ) : (
        <Hoja />
      )}
      <div style={{ display: "flex", alignItems: "center" }}>
        <Brote size={40} />
        <div style={{ display: "flex", marginLeft: 16, fontSize: 30, fontWeight: 700, color: OG_COLORS.salvia }}>
          {discipline || "Humano Despierto"}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 24, fontSize: 72, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.08, maxWidth: 1000 }}>
        {title}
      </div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: OG_COLORS.miel }}>
        {teacher ? `con ${teacher}` : "Humano Despierto"}
      </div>
    </div>
  );
}
