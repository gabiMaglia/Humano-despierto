"use client";

import { useActionState, useState } from "react";
import Avatar from "@/components/atoms/Avatar";
import Button from "@/components/atoms/Button";
import { FieldError } from "@/components/molecules/FormField";
import FormStatus from "@/components/molecules/FormStatus";
import { removeAvatarAction, uploadAvatarAction } from "@/app/(app)/panel/perfil/actions";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { fieldA11y } from "@/lib/ui/field";
import { AVATAR_ACCEPT, exceedsAvatarLimit } from "@/lib/validation/image";

interface Props {
  avatarUrl: string | null;
  fullName: string;
}

const TOO_BIG = "La imagen pesa más de 2 MB.";

export default function AvatarForm({ avatarUrl, fullName }: Props) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadAvatarAction, ACTION_INITIAL_STATE);
  const [removeState, removeAction, removing] = useActionState(removeAvatarAction, ACTION_INITIAL_STATE);
  // Aviso temprano: por encima de 3 MB Next corta el body antes de la action con un error generico.
  const [tooBig, setTooBig] = useState(false);
  const a11y = fieldA11y("avatar", tooBig ? TOO_BIG : null, "avatar-hint");

  return (
    <section aria-labelledby="avatar-title" className="tarjeta flex flex-col items-center gap-5 p-6 text-center">
      <h2 id="avatar-title" className="text-xl">Imagen</h2>
      <Avatar size="xl" name={fullName} src={avatarUrl} alt={`Imagen de ${fullName}`} />
      <form action={uploadAction} className="flex w-full flex-col items-stretch gap-3 text-left">
        <label htmlFor="avatar" className="text-sm font-semibold text-tinta">
          Elegir imagen (JPG, PNG o WEBP, hasta 2 MB)
        </label>
        <p id="avatar-hint" className="sr-only">Formatos JPG, PNG o WEBP, hasta 2 MB.</p>
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept={AVATAR_ACCEPT}
          required
          aria-invalid={a11y["aria-invalid"]}
          aria-describedby={a11y["aria-describedby"]}
          onChange={(e) => setTooBig(exceedsAvatarLimit(e.currentTarget.files?.[0]?.size ?? 0))}
          className="w-full max-w-full rounded-md border border-dashed border-suave bg-fondo p-3 text-sm text-tinta file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-pill file:border-0 file:bg-salvia-100 file:px-4 file:font-semibold file:text-bosque"
        />
        <FieldError id={a11y.errorId} error={tooBig ? TOO_BIG : null} />
        <Button type="submit" full disabled={uploading || tooBig} aria-busy={uploading}>
          {uploading ? "Subiendo…" : "Subir imagen"}
        </Button>
        <FormStatus state={uploadState} />
      </form>
      {avatarUrl && (
        <form action={removeAction} className="w-full">
          <Button type="submit" variant="outline" full disabled={removing}>
            Quitar imagen
          </Button>
        </form>
      )}
      {/* Fuera del bloque condicional: al quitar, `avatarUrl` pasa a null y el aviso se iria con el form. */}
      <FormStatus state={removeState} />
    </section>
  );
}
