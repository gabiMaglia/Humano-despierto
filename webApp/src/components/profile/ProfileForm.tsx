"use client";

import { useActionState } from "react";
import FormStatus from "@/components/molecules/FormStatus";
import { clearBirthDateAction, updateProfileAction } from "@/app/(app)/panel/perfil/actions";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";

export interface ProfileFormFields {
  fullName: string;
  bio: string | null;
  phone: string | null;
  birthDate: string | null;
}

const inputClass =
  "w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-sm text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0";
const labelClass = "mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft";

export default function ProfileForm({ profile, today }: { profile: ProfileFormFields; today: string }) {
  const [saveState, saveAction, saving] = useActionState(updateProfileAction, ACTION_INITIAL_STATE);
  const [clearState, clearAction, clearing] = useActionState(clearBirthDateAction, ACTION_INITIAL_STATE);

  return (
    <form action={saveAction} className="cosmos-card grid gap-4 p-6">
      <div>
        <label htmlFor="fullName" className={labelClass}>Nombre</label>
        <input id="fullName" name="fullName" defaultValue={profile.fullName} required maxLength={120} autoComplete="name" className={inputClass} />
      </div>
      <div>
        <label htmlFor="bio" className={labelClass}>Bio</label>
        <textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={5} maxLength={4000} className={inputClass} />
      </div>
      <p className="font-body text-xs text-ink-faint">
        El teléfono y la fecha de nacimiento son privados: no aparecen en ninguna página ni los ve nadie más.
      </p>
      <div>
        <label htmlFor="phone" className={labelClass}>Teléfono</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+54 11 4000-0000" defaultValue={profile.phone ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="birthDate" className={labelClass}>Fecha de nacimiento</label>
        <input id="birthDate" name="birthDate" type="date" min="1900-01-02" max={today} autoComplete="bday" defaultValue={profile.birthDate ?? ""} className={inputClass} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="btn-ritual btn-ritual-primary rounded-pill">
          {saving ? "Guardando…" : "Guardar perfil"}
        </button>
        {profile.birthDate && (
          <button type="submit" formAction={clearAction} formNoValidate disabled={clearing} className="btn-ritual btn-ritual-ghost rounded-pill">
            Borrar fecha
          </button>
        )}
      </div>
      <FormStatus state={saveState} />
      <FormStatus state={clearState} />
    </form>
  );
}
