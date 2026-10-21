import type { NextConfig } from "next";

/** S-04 · Sin CSP todavía: el player embebe YouTube y una CSP correcta necesita `frame-src`
 * afinado más una pasada de verificación real, que es un ticket propio. Estas cuatro no tienen
 * ese riesgo y hoy no hay ninguna. `X-Frame-Options` está por `/certificado/<código>`, que es
 * público y hoy embebible por cualquiera. */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // T-042 · el avatar viaja en el FormData de un Server Action y el tope por defecto es 1 MB. 3 MB
    // cubre los 2 MB del avatar mas el overhead multipart; el tope real lo impone el servidor
    // (`checkAvatarBytes`), asi que 2 MB + 1 byte llega a la action y recibe un mensaje propio.
    serverActions: { bodySizeLimit: "3mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
