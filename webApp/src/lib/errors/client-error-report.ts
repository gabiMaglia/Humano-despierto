// Next 16 pasa a error.js lo que se lanzó tal cual: desde un Client Component puede no ser un Error.
export function errorDigest(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("digest" in error)) return undefined;
  return typeof error.digest === "string" ? error.digest : undefined;
}

export function toClientErrorReport(error: unknown): { digest?: string; message: string } {
  return { digest: errorDigest(error), message: error instanceof Error ? error.message : String(error) };
}
