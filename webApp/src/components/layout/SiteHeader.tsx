"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import BrandMark from "@/components/atoms/BrandMark";
import Button, { ButtonLink } from "@/components/atoms/Button";
import Icon from "@/components/atoms/Icon";
import { isHeaderSolid } from "@/lib/ui/header";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import MobileMenu from "./MobileMenu";
import { headerLinks } from "@/lib/ui/nav-links";

interface Props {
  /** La página arranca con un hero fotográfico: transparente y blanco hasta pasarlo. */
  overHero?: boolean;
}

export default function SiteHeader({ overHero = false }: Props) {
  const { isSignedIn, user } = useAuthStore();
  const router = useRouter();
  const menuId = useId();
  const burger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(!overHero);

  useEffect(() => {
    if (!overHero) return;
    const onScroll = () =>
      setSolid(isHeaderSolid({ scrollY: window.scrollY, viewportHeight: window.innerHeight, overHero }));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    // El foco vuelve a donde estaba: sin esto, quien navega con teclado cae al principio del documento.
    requestAnimationFrame(() => burger.current?.focus());
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const session = isSignedIn && user ? { role: user.role } : null;
  const links = headerLinks(session);
  const linkCls = "rounded-md px-1 py-1 transition-opacity hover:opacity-70";

  const account = session ? (
    <>
      <Link href="/panel" className={cn(linkCls, "max-w-[16ch] truncate")}>
        {user?.fullName || "Mi panel"}
      </Link>
      <Link href="/panel/perfil" className={linkCls}>
        Mi perfil
      </Link>
      <button type="button" onClick={handleSignOut} className={cn(linkCls, "cursor-pointer")}>
        Salir
      </button>
    </>
  ) : (
    <>
      <Link href="/entrar" className={linkCls}>
        Entrar
      </Link>
      <ButtonLink href="/cursos" size="sm">
        Ver cursos
      </ButtonLink>
    </>
  );

  return (
    <>
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-400",
        solid
          ? "bg-fondo/95 text-bosque shadow-[0_10px_30px_-18px_rgb(31_46_36/0.35)] backdrop-blur-md"
          : "sobre-oscuro bg-transparent text-white",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-6">
        <BrandMark />

        <nav aria-label="Principal" className="hidden items-center gap-6 text-[15px] font-medium lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
          <span aria-hidden="true" className="h-5 w-px bg-current opacity-25" />
          {account}
        </nav>

        <button
          ref={burger}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls={menuId}
          className="grid h-11 w-11 place-items-center rounded-full lg:hidden"
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </div>

    </header>
    {/* Fuera del <header>: su backdrop-filter crea un bloque contenedor y un `fixed` adentro
        quedaría recortado a la altura del header. */}
      {open && (
        <MobileMenu
          id={menuId}
          links={links}
          onClose={closeMenu}
          footer={
            session ? (
              <>
                <ButtonLink href="/panel" full onClick={() => setOpen(false)}>
                  Mi panel
                </ButtonLink>
                <ButtonLink href="/panel/perfil" variant="ghost" full className="text-white hover:bg-white/10" onClick={() => setOpen(false)}>
                  Mi perfil
                </ButtonLink>
                <Button variant="ghost" full className="text-white hover:bg-white/10" onClick={handleSignOut}>
                  Salir
                </Button>
              </>
            ) : (
              <>
                <ButtonLink href="/cursos" full arrow onClick={() => setOpen(false)}>
                  Ver cursos
                </ButtonLink>
                <ButtonLink href="/entrar" variant="ghost" full className="text-white hover:bg-white/10" onClick={() => setOpen(false)}>
                  Entrar
                </ButtonLink>
              </>
            )
          }
        />
      )}
    </>
  );
}
