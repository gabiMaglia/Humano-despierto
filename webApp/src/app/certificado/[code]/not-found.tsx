import Link from "next/link";

export default function CertificadoNoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center text-tinta">
      <p className="font-display text-eyebrow tracking-[0.25em] text-suave">— Nada por acá —</p>
      <h1 className="max-w-md font-display text-display-md text-tinta">
        No encontramos ningún <em className="font-quote italic text-miel-800">certificado</em> con ese código
      </h1>
      <p className="max-w-md font-body text-sm text-suave">
        Revisá el link: un carácter de más o de menos alcanza para que no coincida con ninguno.
      </p>
      <Link href="/" className="btn btn-primary mt-2">
        Ir al inicio ↦
      </Link>
    </div>
  );
}
