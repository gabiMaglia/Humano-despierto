import { notFound } from "next/navigation";
import { loadCertificate } from "./data";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}

/**
 * El 404 se decide acá, antes del streaming: `loading.tsx` abre la respuesta con 200 y para
 * cuando la página llama a `notFound()` el status ya salió. Mismo patrón que `leccion/[id]`.
 */
export default async function CertificadoLayout({ children, params }: LayoutProps) {
  const { code } = await params;
  if (!(await loadCertificate(code))) notFound();

  return <>{children}</>;
}
