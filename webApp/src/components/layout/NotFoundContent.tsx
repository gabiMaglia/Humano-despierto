import { ButtonLink } from "@/components/atoms/Button";
import BrandMark from "@/components/atoms/BrandMark";
import LeafIllustration from "@/components/atoms/LeafIllustration";

/** Cuerpo del 404. `withBrand` sólo en el 404 raíz: debajo de un layout que ya trae header
 *  (marketing, paneles) el 404 se dibuja adentro y no puede traer el suyo. */
export default function NotFoundContent({ withBrand = false }: { withBrand?: boolean }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-fondo px-6 py-20 text-center">
      {withBrand && <BrandMark className="mb-10 text-bosque" />}
      <LeafIllustration className="w-[110px]" />
      <h1 className="max-w-[16ch] text-display-md leading-[1.12]">Esta página no existe</h1>
      <p className="max-w-md text-suave">Puede que el enlace haya cambiado o que el curso ya no esté publicado.</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/cursos" arrow>
          Ver los cursos
        </ButtonLink>
        <ButtonLink href="/" variant="outline">
          Ir al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
