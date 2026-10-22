export default function LeccionLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-fondo text-tinta">
      <div className="border-b border-linea bg-papel px-5 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-salvia-100" />
      </div>
      <div className="aspect-video max-h-[55vh] animate-pulse bg-papel" />
      <div className="flex-1 p-5">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-salvia-100" />
        <div className="h-2 w-full animate-pulse rounded-full bg-salvia-100" />
      </div>
    </div>
  );
}
