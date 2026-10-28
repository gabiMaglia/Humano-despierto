/** Cabecera del hilo abierto, dentro de la tarjeta del Círculo. */
export default function ThreadHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-linea px-5 py-5 md:px-6">
      <h2 className="text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-suave">{subtitle}</p>}
    </div>
  );
}
