/** Código que soporte puede buscar en el log del servidor. */
export function ErrorReference({ digest }: { digest?: string }) {
  if (!digest) return null;
  return (
    <p className="text-sm text-suave">
      Código de referencia: <span className="font-mono">{digest}</span>
    </p>
  );
}
