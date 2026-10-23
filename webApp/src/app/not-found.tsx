import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";

// Sin metadata propia (not-found.tsx no la acepta): el noindex lo inyecta Next en todo 404.
// 404 real sólo mientras ningún loading.tsx arriba empiece a streamear antes (C-01).
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-4 bg-fondo px-6 pb-20 pt-32 text-center">
        <LeafIllustration className="w-[110px]" />
        <h1 className="max-w-[16ch] text-display-md leading-[1.12]">Esta página no existe</h1>
        <p className="max-w-md text-suave">
          Puede que el enlace haya cambiado o que el curso ya no esté publicado.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/cursos" arrow>
            Ver los cursos
          </ButtonLink>
          <ButtonLink href="/" variant="outline">
            Ir al inicio
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
