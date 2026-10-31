import type { Metadata } from "next";
import { connection } from "next/server";
import AuthProvider from "@/components/providers/AuthProvider";
import { getSiteUrl } from "@/lib/server/site-url";
import { jakarta } from "@/styles/fonts";
import "@/styles/globals.css";

// T-091 · el connection() de abajo no alcanza: Next renderiza las páginas en paralelo al layout
// y sus consultas salían igual en el build. Esto saca del prerender a todo el árbol, incluidas
// las páginas futuras (guard en layout.test.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Humano Despierto — Escuela Holística",
    template: "%s — Humano Despierto",
  },
  description: "Escuela online de tarot, astrología, herbolaria, reiki y magia, con guías que practican lo que enseñan.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Con CSP por nonce ninguna pagina puede prerenderizarse: el HTML estatico no tiene el nonce
  // del request y en enforce sus scripts no corren. Aca, una vez, en vez de pagina por pagina.
  await connection();
  return (
    <html
      lang="es"
      className={jakarta.variable}
      // Next desactiva el scroll suave de globals.css durante las transiciones de ruta solo si lo declaramos.
      data-scroll-behavior="smooth"
    >
      {/* Las extensiones del navegador inyectan atributos en <body> antes de que React
          hidrate (ColorZilla pone cz-shortcut-listen, Grammarly pone data-gr-*), y eso
          dispara un error de hidratacion que no es de la app. Silenciarlo acá evita que
          ese ruido tape los mismatches reales, que sí importan. */}
      <body className="bg-fondo font-body text-tinta antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
