"use client";

import { useActionState, useState } from "react";
import Avatar from "@/components/atoms/Avatar";
import FormStatus from "@/components/molecules/FormStatus";
import { removeAvatarAction, uploadAvatarAction } from "@/app/(app)/panel/perfil/actions";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { AVATAR_ACCEPT, exceedsAvatarLimit } from "@/lib/validation/image";

interface Props {
  avatarUrl: string | null;
  glyph: string;
  fullName: string;
}

export default function AvatarForm({ avatarUrl, glyph, fullName }: Props) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadAvatarAction, ACTION_INITIAL_STATE);
  const [removeState, removeAction, removing] = useActionState(removeAvatarAction, ACTION_INITIAL_STATE);
  // Aviso temprano: por encima de 3 MB Next corta el body antes de la action con un error generico.
  const [tooBig, setTooBig] = useState(false);

  return (
    <section aria-labelledby="avatar-title" className="tarjeta flex flex-col items-center gap-4 p-6">
      <h2 id="avatar-title" className="font-display text-eyebrow tracking-wide text-suave">Imagen</h2>
      <Avatar size="xl" glyph={glyph} src={avatarUrl} alt={`Imagen de ${fullName}`} />
      <form action={uploadAction} className="flex flex-col items-center gap-3">
        <label htmlFor="avatar" className="font-body text-xs text-suave">
          Elegir imagen (JPG, PNG o WEBP, hasta 2 MB)
        </label>
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept={AVATAR_ACCEPT}
          required
          onChange={(e) => setTooBig(exceedsAvatarLimit(e.currentTarget.files?.[0]?.size ?? 0))}
          className="max-w-full font-body text-xs text-suave"
        />
        {tooBig && <p role="alert" className="font-body text-xs text-error">La imagen pesa más de 2 MB.</p>}
        <button type="submit" disabled={uploading || tooBig} className="btn btn-primary">
          {uploading ? "Subiendo…" : "Subir imagen"}
        </button>
        <FormStatus state={uploadState} />
      </form>
      {avatarUrl && (
        <form action={removeAction}>
          <button type="submit" disabled={removing} className="btn btn-outline">
            Quitar imagen
          </button>
        </form>
      )}
      {/* Fuera del bloque condicional: al quitar, `avatarUrl` pasa a null y el aviso se iria con el form. */}
      <FormStatus state={removeState} />
    </section>
  );
}
