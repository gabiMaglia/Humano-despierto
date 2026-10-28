export default function LeccionLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-fondo text-tinta" aria-busy="true">
      <div className="flex min-h-16 items-center border-b border-linea bg-papel px-4 md:px-6">
        <div className="h-4 w-40 animate-pulse rounded-sm bg-salvia-100 motion-reduce:animate-none" />
      </div>
      <div className="bg-bosque md:px-6 md:pt-6">
        <div className="mx-auto aspect-video w-full max-w-[calc(70vh*16/9)] animate-pulse bg-bosque-700 motion-reduce:animate-none md:rounded-md" />
        <div className="h-16" />
      </div>
      <div className="flex-1 px-5 py-6 md:px-8">
        <div className="mb-3 h-3 w-32 animate-pulse rounded-sm bg-salvia-100 motion-reduce:animate-none" />
        <div className="h-7 w-2/3 animate-pulse rounded-sm bg-salvia-100 motion-reduce:animate-none" />
      </div>
      <p className="sr-only" role="status">Cargando la lección…</p>
    </div>
  );
}
