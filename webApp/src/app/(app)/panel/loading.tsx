export default function PanelLoading() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <div className="border-b border-linea bg-papel px-6 py-8 md:px-12">
        <div className="mb-3 h-3 w-40 animate-pulse rounded bg-salvia-100" />
        <div className="h-8 w-72 animate-pulse rounded bg-salvia-100" />
      </div>
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-10 md:px-12">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-papel" />
        ))}
      </div>
    </div>
  );
}
