"use client";

import { useActionState } from "react";
import { updateUserRoleAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import type { AdminUserRow } from "@/lib/server/admin";
import type { AppRole } from "@/lib/stores/useAuthStore";

const ROLE_LABEL: Record<AppRole, string> = {
  student: "Alumna/o",
  teacher: "Docente",
  admin: "Admin",
};

export default function UserRoleRow({ user }: { user: AdminUserRow }) {
  const [state, formAction, isPending] = useActionState(
    updateUserRoleAction,
    ADMIN_ACTION_INITIAL_STATE
  );

  return (
    <li className="cosmos-card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm tracking-wide text-ink">{user.fullName}</p>
        <p className="font-body text-xs text-ink-faint">{user.email ?? "sin email"}</p>
      </div>

      <form action={formAction} className="flex flex-none items-center gap-2">
        <input type="hidden" name="userId" value={user.id} />
        <select
          name="role"
          defaultValue={user.role}
          className="rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2 font-body text-xs text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
        >
          {(Object.keys(ROLE_LABEL) as AppRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "…" : "Guardar"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="w-full font-body text-xs text-lila-300">{state.success}</p>
      )}
    </li>
  );
}
