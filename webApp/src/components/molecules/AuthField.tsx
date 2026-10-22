import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  aside?: ReactNode;
}

// `htmlFor` + `id`: sin la asociación el lector de pantalla no anuncia el campo y Playwright no
// lo encuentra por su label.
export default function AuthField({ id, label, aside, className, ...input }: Props) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="font-display text-eyebrow tracking-wide text-suave">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        {...input}
        className={cn(
          "w-full rounded-md border border-linea bg-papel px-4 py-3 font-body text-sm text-tinta placeholder:text-suave outline-none transition-colors focus:border-linea focus:bg-fondo",
          className,
        )}
      />
    </div>
  );
}
