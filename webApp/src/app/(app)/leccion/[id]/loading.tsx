export default function LeccionLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-cosmos-0 text-ink">
      <div className="border-b border-lila-300/18 bg-cosmos-surface px-5 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-lila-300/15" />
      </div>
      <div className="aspect-video max-h-[55vh] animate-pulse bg-cosmos-1" />
      <div className="flex-1 p-5">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-lila-300/15" />
        <div className="h-2 w-full animate-pulse rounded-full bg-lila-300/10" />
      </div>
    </div>
  );
}
