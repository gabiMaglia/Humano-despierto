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
    <div className="min-h-screen bg-fondo px-6 py-16 text-tinta print:min-h-0 print:bg-white print:px-0 print:py-0">
      {/* Criterio 5: que se vea bien impresa. Apaisado — un certificado se lee ancho, no alto — */}
      {/* y sin la barra lateral de fecha/hora que Chrome agrega por defecto en la impresión. */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 14mm; }
        }
      `}</style>

      <PrintButton />

      <main className="relative mx-auto max-w-2xl overflow-hidden rounded-lg border border-linea bg-papel px-8 py-14 shadow-card print:max-w-none print:rounded-none print:border-2 print:border-miel print:bg-white print:px-16 print:py-14 print:shadow-none">

        <div className="relative flex flex-col items-center gap-7 text-center">
          <p className="font-display text-eyebrow uppercase tracking-[0.3em] text-miel-800">
            Humano Despierto
          </p>

          <div className="flex items-center gap-3 text-miel-800">
            <p className="font-display text-eyebrow uppercase tracking-[0.25em]">
              Certificado de finalización
            </p>
          </div>

          <p className="font-quote text-lg italic text-suave">
            Se certifica que
          </p>

          <h1 className="font-quote text-4xl italic text-tinta md:text-5xl">
            {certificate.studentName}
          </h1>

          <p className="max-w-md font-body text-sm text-suave">
            completó el recorrido completo del curso
          </p>

          <h2 className="font-display text-2xl tracking-wide text-miel-800">
            {certificate.courseTitle}
          </h2>

          <p className="max-w-md font-body text-xs text-suave">
            Este certificado acredita el recorrido completo del curso, no una evaluación.
          </p>

          <div className="flex flex-col items-center gap-1 font-body text-sm text-suave">
            <p>
              Guiado por{" "}
              <span className="font-quote text-base text-tinta">
                {certificate.teacherName}
              </span>
            </p>
            <p>{formatCertificateDate(certificate.completedAt)}</p>
          </div>

          <div className="mt-3 h-px w-24 bg-salvia print:bg-miel" />

          <p className="max-w-sm font-body text-xs text-suave">
            Verificable abriendo esta misma dirección · código{" "}
            <span className="font-mono">{code}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
