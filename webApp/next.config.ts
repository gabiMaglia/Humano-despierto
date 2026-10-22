import type { NextConfig } from "next";

/** S-04 · La CSP no vive aca: necesita un nonce por request y la arma `src/proxy.ts` con
 * `buildCsp` (T-052). Estas cuatro son fijas. `frame-ancestors 'self'` de la CSP es la fuente
 * de verdad contra el embebido (`/certificado/<código>` es público); `X-Frame-Options` queda
 * para navegadores que no la entienden. */
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
