import { cn } from "@/lib/utils/cn";

// El botón de texto del Q&A (voto, resolver, destacar, borrar, enviar). Las variantes viven acá y
// en ningún otro lado (ley React 2 y 6). 40px de alto: es un objetivo táctil, no un adorno.
type Variant = "default" | "active" | "danger";

const VARIANT: Record<Variant, string> = {
  default: "text-bosque hover:bg-salvia-100",
  active: "bg-miel-100 text-miel-800",
  danger: "text-error hover:bg-salvia-100",
};

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: Variant;
}

export default function QaTextButton({ variant = "default", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        VARIANT[variant]
      )}
    />
  );
}
