import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "md" | "sm";

interface Look {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Chevron que se desplaza 4px al hover: para la acción que lleva a otro lugar. */
  arrow?: boolean;
  full?: boolean;
  className?: string;
}

/** Las variantes viven en `globals.css` (`.btn-*`), una sola vez; esto sólo elige. */
export function buttonClass({ variant = "primary", size = "md", full, className }: Look): string {
  return cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", full && "btn-full", className);
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="btn-arrow" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

type ButtonProps = Look & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { children: ReactNode };

export default function Button({ variant, size, arrow, full, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, full, className })} {...rest}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}

type LinkProps = Look & { href: string; children: ReactNode; onClick?: () => void };

export function ButtonLink({ href, variant, size, arrow, full, className, children, onClick }: LinkProps) {
  return (
    <Link href={href} onClick={onClick} className={buttonClass({ variant, size, full, className })}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}
