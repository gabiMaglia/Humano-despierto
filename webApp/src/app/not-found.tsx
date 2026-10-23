import NotFoundContent from "@/components/layout/NotFoundContent";

// Sin metadata propia (not-found.tsx no la acepta): el noindex lo inyecta Next en todo 404.
// 404 real sólo mientras ningún loading.tsx arriba empiece a streamear antes (C-01).
// Sin header ni footer: este 404 también se dibuja dentro de layouts que ya los tienen.
export default function NotFound() {
  return <NotFoundContent withBrand />;
}
