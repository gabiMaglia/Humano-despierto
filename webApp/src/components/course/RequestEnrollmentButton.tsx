"use client";

import { useActionState } from "react";
import { requestEnrollmentAction } from "@/app/(marketing)/cursos/[slug]/actions";
import SubmitButton from "@/components/atoms/SubmitButton";
import ActionFeedback from "@/components/reviews/ActionFeedback";
import { ENROLLMENT_REQUEST_INITIAL } from "@/lib/enrollment/messages";

/** El formulario no lleva campos: el curso sale del slug y la alumna de la sesión (T-043). */
export default function RequestEnrollmentButton({ slug }: { slug: string }) {
  const [state, formAction, isPending] = useActionState(
    requestEnrollmentAction.bind(null, slug),
    ENROLLMENT_REQUEST_INITIAL,
  );

  return (
    <form action={formAction}>
      <SubmitButton loading={isPending} label="Solicitar inscripción" loadingLabel="Enviando…" />
      <ActionFeedback state={state} />
    </form>
  );
}
