/** Código que soporte puede buscar en el log del servidor. */
export function ErrorReference({ digest }: { digest?: string }) {
  if (!digest) return null;
  return <p className="font-body text-xs text-ink-faint">Código de referencia: {digest}</p>;
}
