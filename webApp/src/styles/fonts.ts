import { Plus_Jakarta_Sans } from "next/font/google";

// ADR-015 · una sola familia. next/font la sirve desde el propio origen: `font-src 'self'` alcanza.
// Vive aparte del layout porque global-error reemplaza al layout raíz y trae su propio <html>.
export const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
