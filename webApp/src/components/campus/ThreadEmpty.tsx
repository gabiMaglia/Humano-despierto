import LeafIllustration from "@/components/atoms/LeafIllustration";

/** Hilo sin mensajes: un espacio nuevo, no uno abandonado. */
export default function ThreadEmpty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden px-6 py-16 text-center">
      <LeafIllustration className="w-[72px] opacity-60" />
      <p className="text-lg font-semibold text-bosque">{title}</p>
      <p className="max-w-sm text-base text-suave">{children}</p>
    </div>
  );
}
