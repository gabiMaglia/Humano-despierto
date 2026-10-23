export default function PanelLoading() {
  return (
    <div className="min-h-screen bg-fondo text-tinta" aria-busy="true">
      <div className="border-b border-linea bg-salvia-100 pt-16">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
          <div className="mb-3 h-3 w-40 animate-pulse rounded-sm bg-salvia motion-reduce:animate-none" />
          <div className="h-9 w-72 max-w-full animate-pulse rounded-sm bg-salvia motion-reduce:animate-none" />
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-12">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tarjeta h-24 animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
      <p className="sr-only" role="status">Cargando tu panel…</p>
    </div>
  );
}
