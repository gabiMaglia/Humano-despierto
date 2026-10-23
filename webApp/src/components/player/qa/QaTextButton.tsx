import { cn } from "@/lib/utils/cn";

// El botón de texto del player (el "Guardar" de notas) repetido en voto, resolver, destacar, borrar
// y enviar. Las variantes viven acá y en ningún otro lado (ley React 2 y 6).
type Variant = "default" | "active" | "danger";

const VARIANT: Record<Variant, string> = {
  default: "text-miel-800 hover:text-miel-800 disabled:hover:text-miel-800",
  active: "text-miel-800 hover:text-miel-800",
  danger: "text-suave hover:text-error",
};

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: Variant;
}

export default function QaTextButton({ variant = "default", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      {...rest}
      className={cn("font-display text-eyebrow tracking-wide transition-colors disabled:opacity-40", VARIANT[variant])}
    />
  );
}
