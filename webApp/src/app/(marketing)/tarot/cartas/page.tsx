import type { Metadata } from "next";
import Link from "next/link";
import TarotCard from "@/components/tarot/TarotCard";
import { CARDS, type Suit } from "@/lib/tarot/cards";

export const metadata: Metadata = {
  title: "Las 78 cartas del tarot Rider-Waite y su significado",
  description: "Arcanos mayores y menores del tarot Rider-Waite: significado al derecho e invertida, amor, trabajo, dinero y salud, y sus correspondencias.",
  alternates: { canonical: "/tarot/cartas" },
};

const GROUPS: { id: string; titulo: string; filtro: (c: (typeof CARDS)[number]) => boolean }[] = [
  { id: "grupo-mayores", titulo: "Arcanos mayores", filtro: (c) => c.arcano === "mayor" },
  ...(["bastos", "copas", "espadas", "oros"] as Suit[]).map((palo) => ({ id: `grupo-${palo}`, titulo: `Palo de ${palo}`, filtro: (c: (typeof CARDS)[number]) => c.palo === palo })),
];

export default function CartasPage() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        <p className="text-sm font-semibold text-miel-800">Tarot</p>
        <h1 className="mt-3 text-display-lg leading-[1.08] tracking-[-0.025em]">Las 78 cartas</h1>
        {GROUPS.map((g) => (
          <section key={g.titulo} className="mt-12" aria-labelledby={g.id}>
            <h2 id={g.id} className="text-2xl font-bold text-bosque">{g.titulo}</h2>
            <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {CARDS.filter(g.filtro).map((c) => (
                <li key={c.id}>
                  <Link href={`/tarot/cartas/${c.id}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-miel">
                    <TarotCard card={c} size="sm" className="w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
