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
    // T-042/T-047 · avatar y portada viajan en el FormData de un Server Action y el tope por
    // defecto es 1 MB. 4 MB cubre los 3 MB de la portada mas el overhead multipart: 3,1 MB tiene
    // que LLEGAR a la action para recibir su mensaje (criterio 2 de T-047). El tope real lo
    // imponen `checkAvatarBytes`/`checkCoverBytes`.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // T-043 · el checkout maqueta se fue (D2). Los links viejos caen en la ficha, donde se pide.
  async redirects() {
    return [{ source: "/inscribirme/:curso", destination: "/cursos/:curso", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
