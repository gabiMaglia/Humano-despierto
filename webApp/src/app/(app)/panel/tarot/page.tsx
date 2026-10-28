import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/atoms/Button";
import SiteHeader from "@/components/layout/SiteHeader";
import AppPageHeader from "@/components/layout/AppPageHeader";
import DeleteReadingButton from "@/components/tarot/DeleteReadingButton";
import TarotCard from "@/components/tarot/TarotCard";
import { listSavedReadings } from "@/lib/server/tarot";
import { cardByIndex } from "@/lib/tarot/cards";
import { spreadBySlug } from "@/lib/tarot/spreads";

export const metadata: Metadata = { title: "Mis tiradas", robots: { index: false, follow: false } };

export default async function PanelTarotPage() {
  const readings = await listSavedReadings();
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader eyebrow="Tarot" title="Mis tiradas" subtitle="Las lecturas que guardaste, de la más nueva a la más vieja." />
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        {readings.length === 0 ? (
          <div className="tarjeta flex flex-col items-start gap-4 p-8">
            <p className="max-w-[46ch]">Todavía no guardaste ninguna tirada. Tirá las cartas y, al final de la lectura, tocá «Guardar en mi panel».</p>
            <ButtonLink href="/tarot" arrow>Tirar las cartas</ButtonLink>
          </div>
        ) : (
          <ul className="space-y-4">
            {readings.map((r) => (
              <li key={r.id} className="tarjeta flex flex-wrap items-center gap-4 p-5">
                <div className="flex gap-1">
                  {r.reading.cards.slice(0, 3).map((c) => <TarotCard key={c.indice} card={cardByIndex(c.indice)!} reversed={c.reversed} size="sm" className="w-10" />)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-suave">{spreadBySlug(r.reading.spread)?.nombre} · {new Date(r.createdAt).toLocaleDateString("es-AR")}</p>
                  <Link href={`/tarot/lectura/${r.id}`} className="font-semibold text-bosque hover:underline">{r.question ?? "Sin pregunta"}</Link>
                </div>
                <DeleteReadingButton id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
