import { cn } from "@/lib/utils/cn";

// El botón de texto del player (el "Guardar" de notas) repetido en voto, resolver, destacar, borrar
// y enviar. Las variantes viven acá y en ningún otro lado (ley React 2 y 6).
type Variant = "default" | "active" | "danger";

const VARIANT: Record<Variant, string> = {
  default: "text-lila-300 hover:text-gold-400 disabled:hover:text-lila-300",
  active: "text-gold-400 hover:text-lila-300",
  danger: "text-ink-faint hover:text-red-400",
};

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: Variant;
}

export default function QaTextButton({ variant = "default", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      {...rest}
      className={cn("font-display text-eyebrow tracking-cosmic transition-colors disabled:opacity-40", VARIANT[variant])}
    />
  );
}
