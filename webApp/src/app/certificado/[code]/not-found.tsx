import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";

export default function CertificadoNoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <LeafIllustration className="w-[100px]" />
      <h1 className="max-w-[20ch] text-display-md leading-[1.12]">No encontramos ningún certificado con ese código</h1>
      <p className="max-w-md text-suave">
        Revisá el link: un carácter de más o de menos alcanza para que no coincida con ninguno.
      </p>
      <ButtonLink href="/" className="mt-2">
        Ir al inicio
      </ButtonLink>
    </main>
  );
}
