import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/atoms/SectionHeading";
import { ButtonLink } from "@/components/atoms/Button";
import EthicsNote from "@/components/tarot/EthicsNote";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { SPREADS } from "@/lib/tarot/spreads";

export const metadata: Metadata = {
  title: "Tarot online gratis: tiradas con el Rider-Waite",
  description: "Tirá las cartas online con las 78 del tarot Rider-Waite: carta del día, sí o no, pasado-presente-futuro y cruz celta, con una lectura que relaciona las cartas entre sí.",
  alternates: { canonical: "/tarot" },
  openGraph: { title: "Tarot online gratis", description: "Tiradas con las 78 cartas del Rider-Waite y una lectura que las relaciona.", url: "/tarot", type: "website", images: [SITE_OG_IMAGE] },
};

export default function TarotPage() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <header className="mx-auto max-w-[1200px] px-6 pb-12 pt-10">
        <p className="text-sm font-semibold text-miel-800">Tarot online</p>
        <h1 className="mt-3 max-w-[20ch] text-display-lg leading-[1.08] tracking-[-0.025em]">Tirá las cartas y leé lo que te devuelven</h1>
        <p className="mt-5 max-w-[56ch] text-lg text-suave">
          Las 78 cartas del Rider-Waite de 1909, cuatro tiradas y una lectura que no pega significados sueltos: relaciona cada carta con la que viene antes y con la que sigue.
        </p>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pb-20">
        <p className="text-sm font-semibold text-miel-800">Elegí una tirada</p>
        <SectionHeading title="Cuatro formas de preguntar" />
        <ul className="-mt-2 grid gap-5 sm:grid-cols-2">
          {SPREADS.map((s) => (
            <li key={s.slug} className="tarjeta flex flex-col gap-3 p-6">
              <h2 className="text-xl font-bold text-bosque">{s.nombre}</h2>
              <p className="text-suave">{s.descripcion}</p>
              <p className="text-sm text-suave">{s.cartas.join(" o ")} {s.cartas[0] === 1 && s.cartas.length === 1 ? "carta" : "cartas"}</p>
              <div className="mt-auto pt-2">
                <ButtonLink href={`/tarot/${s.slug}`} arrow>Tirar</ButtonLink>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-16 grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold text-miel-800">Antes de tirar</p>
            <SectionHeading title="Qué es el tarot y cómo leerlo" />
            <div className="-mt-4 space-y-4 text-tinta">
              <p>El tarot nació como juego de cartas en la Italia del siglo XV y recién en el XVIII empezó a usarse para leer. El mazo que usamos lo dibujó Pamela Colman Smith en 1909 bajo la dirección de Arthur Waite, y es el más leído del mundo.</p>
              <p>Leer no es adivinar: es mirar una imagen y dejar que ordene lo que ya sabías. Cada posición de la tirada hace una pregunta distinta, y las cartas se leen en relación, no una por una.</p>
              <p>Si ya preguntaste esto hoy, dejá reposar la respuesta. Repetir la tirada hasta que diga lo que querés no es leer, es discutir con el espejo.</p>
            </div>
            <Link href="/tarot/cartas" className="mt-6 inline-flex min-h-10 items-center text-sm font-semibold text-miel-800 hover:underline">Ver las 78 cartas y sus significados</Link>
          </div>
          <EthicsNote />
        </section>
      </main>
    </div>
  );
}
