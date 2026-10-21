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
        <label htmlFor={id} className="font-display text-eyebrow tracking-cosmic text-ink-soft">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        {...input}
        className={cn(
          "w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-4 py-3 font-body text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0",
          className,
        )}
      />
    </div>
  );
}
