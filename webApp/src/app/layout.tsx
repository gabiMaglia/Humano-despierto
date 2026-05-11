import type { Metadata } from "next";
import { Cinzel, Quicksand, Cormorant_Garamond, Cardo } from "next/font/google";
import "@/styles/globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const cardo = Cardo({
  variable: "--font-cardo-var",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Humano Despierto — Escuela Holística",
  description: "Una escuela para oficios sutiles del alma. Astrología, tarot, herbalismo y reiki por maestras con linaje.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${cinzel.variable} ${quicksand.variable} ${cormorantGaramond.variable} ${cardo.variable}`}
    >
      <body className="bg-cosmos-0 text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
