"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { setWishlistAction } from "@/app/(marketing)/cursos/actions";

interface Props {
  courseId: string;
  saved: boolean;
  /** Sin sesión: a dónde lleva el botón (login con `next`). Con sesión va `null`. */
  loginHref: string | null;
  className?: string;
}

const BASE =
  "flex h-9 w-9 items-center justify-center rounded-pill border border-lila-300/30 bg-cosmos-0/70 font-display text-base transition-colors hover:border-gold-400/60";

/** T-033 · guardar un curso. Hermano de la card, no hijo: un botón dentro de un <a> es HTML inválido. */
export default function WishlistButton({ courseId, saved: initial, loginHref, className }: Props) {
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (loginHref) {
    return (
      <Link href={loginHref} aria-label="Guardar curso" className={cn(BASE, "text-lila-300", className)}>
        <span aria-hidden>✧</span>
      </Link>
    );
  }

  function toggle() {
    const want = !saved;
    setSaved(want);
    startTransition(async () => {
      const result = await setWishlistAction(courseId, want);
      setSaved(result.saved);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Quitar de guardados" : "Guardar curso"}
      className={cn(BASE, saved ? "text-gold-400" : "text-lila-300", className)}
    >
      <span aria-hidden>{saved ? "✦" : "✧"}</span>
    </button>
  );
}
