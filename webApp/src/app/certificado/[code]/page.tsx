import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCertificate } from "@/lib/server/certificates";
import { formatCertificateDate } from "@/lib/utils/format";
import PrintButton from "@/components/certificate/PrintButton";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = {
  title: "Certificado — Humano Despierto",
  // Sin describir a quién pertenece: el <title>/<meta> de la página quedan en el historial y
  // en previews de link (Slack, WhatsApp) — ahí NO va el nombre del alumno (c.4, el mismo
  // criterio de "no expone nada de más" aplicado a lo que sale fuera del HTML visible).
  description: "Certificado de finalización verificable, Humano Despierto.",
  robots: { index: false, follow: false },
};

// Página PÚBLICA, sin sesión (T-018 c.3: "verificable" significa que el LINK alcanza). No hay
// guard de auth acá ni en ningún layout que la envuelva — vive fuera de (app) a propósito. El
// código de la URL es la única barrera (c.2); `getPublicCertificate` no expone más que los
// cuatro campos públicos (c.4) y no le importa si la inscripción sigue activa o el curso sigue
// publicado (c.6): certifica algo que ya pasó.
export default async function CertificadoPage({ params }: PageProps) {
  const { code } = await params;
  const certificate = await getPublicCertificate(code);

  if (!certificate) notFound();

  return (
    <div className="min-h-screen bg-cosmos-0 px-6 py-16 text-ink print:min-h-0 print:bg-white print:px-0 print:py-0">
      {/* Criterio 5: que se vea bien impresa. Apaisado — un certificado se lee ancho, no alto — */}
      {/* y sin la barra lateral de fecha/hora que Chrome agrega por defecto en la impresión. */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 14mm; }
        }
      `}</style>

      <PrintButton />

      <main className="relative mx-auto max-w-2xl overflow-hidden rounded-scroll border border-lila-300/25 bg-cosmos-surface px-8 py-14 shadow-cosmos-card print:max-w-none print:rounded-none print:border-2 print:border-[#c9a44c] print:bg-white print:px-16 print:py-14 print:shadow-none">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center font-display text-[220px] leading-none text-lila-300/[0.05] print:text-[#c9a44c]/10"
        >
          ✦
        </span>

        <div className="relative flex flex-col items-center gap-7 text-center">
          <p className="font-display text-eyebrow uppercase tracking-[0.3em] text-gold-400 print:text-[#8a6520]">
            ☉ Humano Despierto ☽
          </p>

          <div className="flex items-center gap-3 text-lila-300 print:text-[#5b2a86]">
            <span aria-hidden>✧</span>
            <p className="font-display text-eyebrow uppercase tracking-[0.25em]">
              Certificado de finalización
            </p>
            <span aria-hidden>✧</span>
          </div>

          <p className="font-quote text-lg italic text-ink-soft print:text-[#5a4570]">
            Se certifica que
          </p>

          <h1 className="font-quote text-4xl italic text-ink print:text-[#1f1430] md:text-5xl">
            {certificate.studentName}
          </h1>

          <p className="max-w-md font-body text-sm text-ink-soft print:text-[#5a4570]">
            completó el recorrido completo del curso
          </p>

          <h2 className="font-display text-2xl tracking-wide text-gold-400 print:text-[#8a6520]">
            {certificate.courseTitle}
          </h2>

          <div className="flex flex-col items-center gap-1 font-body text-sm text-ink-soft print:text-[#5a4570]">
            <p>
              Guiado por{" "}
              <span className="font-quote text-base text-ink print:text-[#1f1430]">
                {certificate.teacherName}
              </span>
            </p>
            <p>{formatCertificateDate(certificate.completedAt)}</p>
          </div>

          <div className="mt-3 h-px w-24 bg-lila-300/30 print:bg-[#c9a44c]" />

          <p className="max-w-sm font-body text-xs text-ink-faint print:text-[#9888a8]">
            Verificable abriendo esta misma dirección · código{" "}
            <span className="font-mono">{code}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
