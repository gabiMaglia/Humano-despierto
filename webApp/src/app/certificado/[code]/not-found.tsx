import Link from "next/link";

export default function CertificadoNoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cosmos-0 px-6 text-center text-ink">
      <span className="text-4xl text-lila-300">✦</span>
      <p className="font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Nada por acá —</p>
      <h1 className="max-w-md font-display text-display-md text-ink">
        No encontramos ningún <em className="font-quote italic text-lila-300">certificado</em> con ese código
      </h1>
      <p className="max-w-md font-body text-sm text-ink-soft">
        Revisá el link: un carácter de más o de menos alcanza para que no coincida con ninguno.
      </p>
      <Link href="/" className="btn-ritual btn-ritual-primary rounded-pill mt-2">
        Ir al inicio ↦
      </Link>
    </div>
  );
}
