import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCertificate } from "@/lib/server/certificates";
import { formatCertificateDate } from "@/lib/utils/format";
import PrintButton from "@/components/certificate/PrintButton";
import BrandMark from "@/components/atoms/BrandMark";
import LeafIllustration from "@/components/atoms/LeafIllustration";

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
    <div className="min-h-screen bg-fondo px-6 py-10 text-tinta print:min-h-0 print:bg-white print:p-0">
      {/* Criterio 5: que se vea bien impresa. Apaisado, sin la barra de fecha que Chrome agrega. */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 14mm; }
        }
      `}</style>

      <div className="mx-auto mb-8 flex max-w-3xl items-center justify-between gap-4 text-bosque print:hidden">
        <BrandMark className="text-base" />
        <PrintButton />
      </div>

      <main className="relative mx-auto max-w-3xl overflow-hidden rounded-lg border-[1.5px] border-salvia bg-papel px-6 py-14 shadow-card sm:px-12 print:max-w-none print:rounded-none print:border-2 print:shadow-none">
        <LeafIllustration className="absolute -bottom-8 -right-6 w-[160px] opacity-30" />
        <div className="relative flex flex-col items-center gap-5 text-center">
          <p className="text-sm font-semibold text-miel-800">Humano Despierto · Certificado de finalización</p>

          <p className="mt-4 text-suave">Se certifica que</p>
          <h1 className="text-[clamp(32px,5vw,52px)] leading-[1.1] [overflow-wrap:anywhere]">{certificate.studentName}</h1>
          <p className="text-suave">recorrió completo el curso</p>
          <h2 className="max-w-[24ch] text-2xl leading-snug [overflow-wrap:anywhere] md:text-3xl">{certificate.courseTitle}</h2>

          <p className="text-[15px] text-tinta">
            con la guía <b className="font-semibold text-bosque">{certificate.teacherName}</b>, terminado el{" "}
            {formatCertificateDate(certificate.completedAt)}.
          </p>

          {/* S-01 (PO): el certificado acredita el recorrido, no una evaluación. Se dice sin letra chica. */}
          <p className="mt-4 max-w-[46ch] rounded-md bg-salvia-100 px-5 py-4 text-[15px] leading-normal text-bosque">
            Este certificado acredita que se recorrió el curso completo. No es una evaluación ni un título oficial.
          </p>

          <p className="mt-4 max-w-md text-sm text-suave">
            Se verifica abriendo esta misma dirección. Código{" "}
            <span className="font-mono [overflow-wrap:anywhere]">{code}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
