"use client";

import { useState, useTransition } from "react";
import type { QaActionState } from "@/lib/lesson-qa/action-state";

// Para las acciones de un clic (votar, resolver, destacar): sin formulario no hay useActionState,
// pero sí hace falta pending y el error traducido. El refresco lo trae `revalidatePath`.
export function useQaMutation() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<QaActionState>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return { run, pending, error };
}
