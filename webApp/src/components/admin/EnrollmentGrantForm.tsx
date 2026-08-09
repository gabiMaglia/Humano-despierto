"use client";

import { useActionState } from "react";
import { setEnrollmentAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import type { AdminCourseRow, AdminUserRow } from "@/lib/server/admin";

interface Props {
  users: AdminUserRow[];
  courses: AdminCourseRow[];
}

export default function EnrollmentGrantForm({ users, courses }: Props) {
  const [state, formAction, isPending] = useActionState(
    setEnrollmentAction,
    ADMIN_ACTION_INITIAL_STATE
  );

  return (
    <form action={formAction} className="cosmos-card flex flex-wrap items-end gap-3 p-4">
      <input type="hidden" name="status" value="active" />

      <div className="min-w-[180px] flex-1">
        <label className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">
          Alumna/o
        </label>
        <select
          name="userId"
          required
          className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-xs text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
        >
          <option value="">Elegir…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({u.email ?? "sin email"})
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">
          Curso
        </label>
        <select
          name="courseId"
          required
          className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-xs text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
        >
          <option value="">Elegir…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-ritual btn-ritual-primary flex-none rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "…" : "Inscribir"}
      </button>

      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="w-full font-body text-xs text-lila-300">{state.success}</p>
      )}
    </form>
  );
}
