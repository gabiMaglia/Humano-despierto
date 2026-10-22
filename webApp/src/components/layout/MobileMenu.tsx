"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import Icon from "@/components/atoms/Icon";
import type { NavLink } from "@/lib/ui/nav-links";

interface Props {
  id: string;
  links: NavLink[];
  /** Acciones de cuenta al pie del panel (Entrar / Mi panel, Salir). */
  footer: React.ReactNode;
  onClose: () => void;
}

/** Panel a pantalla completa. Al abrir, el foco va al botón cerrar; Escape cierra; Tab no sale del
 *  panel. Devolver el foco a la hamburguesa es trabajo de quien lo abre (sabe dónde estaba). */
export default function MobileMenu({ id, links, footer, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      id={id}
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
      className="fixed inset-0 z-[60] flex flex-col gap-1 overflow-y-auto bg-bosque px-6 pb-10 pt-24 text-white"
    >
      <button
        ref={closeBtn}
        type="button"
        onClick={onClose}
        aria-label="Cerrar menú"
        className="absolute right-5 top-4 grid h-12 w-12 place-items-center rounded-full"
      >
        <Icon name="close" className="h-6 w-6" />
      </button>
      <nav aria-label="Principal">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            className="block border-b border-white/15 py-3 text-[28px] font-bold tracking-[-0.02em]"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 flex flex-col gap-3">{footer}</div>
    </div>
  );
}
