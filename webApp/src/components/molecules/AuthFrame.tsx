import Image from "next/image";
import type { ReactNode } from "react";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import { AUTH_ASIDE, type AuthAsideKey } from "@/content/auth-aside";
import { PLACEHOLDER_PHOTOS, unsplashUrl } from "@/content/placeholder-photos";

/** Tarjeta de acceso sobre `fondo`; en escritorio, una foto verificada con una frase al costado.
 *  En celular queda una sola columna: la foto no aporta a quien está por entrar. */
export default function AuthFrame({ aside, children }: { aside: AuthAsideKey; children: ReactNode }) {
  const { photoId, phrase } = AUTH_ASIDE[aside];
  const photo = PLACEHOLDER_PHOTOS.find((p) => p.id === photoId)!;
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-stretch lg:py-16">
      <div className="tarjeta mx-auto w-full max-w-[520px] self-center p-6 shadow-card sm:p-10 lg:mx-0 lg:justify-self-end">
        {children}
      </div>
      <aside className="relative hidden min-h-[560px] overflow-hidden rounded-lg bg-salvia lg:block">
        {/* Sin `loading="eager"`: en celular el aside es display:none y un eager igual se bajaría.
            Lazy no descarga lo oculto; `fetchPriority` sube la prioridad cuando sí se ve (lg). */}
        <Image
          src={unsplashUrl(photo.id)}
          alt={photo.alt}
          fill
          fetchPriority="high"
          sizes="(min-width: 1152px) 560px, 50vw"
          className="object-cover"
        />
        <figure className="absolute inset-x-6 bottom-6 flex items-center gap-4 rounded-md bg-papel p-5 shadow-lift">
          <LeafIllustration className="w-10 flex-none" />
          <blockquote className="text-lg font-semibold leading-snug text-bosque">{phrase}</blockquote>
        </figure>
      </aside>
    </div>
  );
}
