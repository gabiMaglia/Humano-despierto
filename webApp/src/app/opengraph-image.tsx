import { ImageResponse } from "next/og";
import { OG_SIZE, SiteOgCard } from "@/lib/og/brand";
import { SITE_OG_ALT } from "@/lib/og/site";
import { loadOgFonts } from "@/lib/server/og-fonts";

export const alt = SITE_OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<SiteOgCard />, {
    ...size,
    fonts: await loadOgFonts(),
    // El default de next/og es immutable por un año; /guias y /diario apuntan a esta URL sin hash.
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
