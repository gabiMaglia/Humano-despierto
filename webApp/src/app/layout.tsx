import type { Metadata } from "next";
import { Cinzel, Quicksand, Cormorant_Garamond, Cardo } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
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
  description: "Una escuela para oficios sutiles del alma. Astrología, tarot, herbalismo y reiki por guías con linaje.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${cinzel.variable} ${quicksand.variable} ${cormorantGaramond.variable} ${cardo.variable}`}
    >
      {/* Las extensiones del navegador inyectan atributos en <body> antes de que React
          hidrate (ColorZilla pone cz-shortcut-listen, Grammarly pone data-gr-*), y eso
          dispara un error de hidratacion que no es de la app. Silenciarlo acá evita que
          ese ruido tape los mismatches reales, que sí importan. */}
      <body className="bg-cosmos-0 text-ink antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
