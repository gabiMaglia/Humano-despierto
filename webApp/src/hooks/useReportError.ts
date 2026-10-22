"use client";

import { useEffect, useRef } from "react";
import { reportClientErrorAction } from "@/app/actions/report-error";

/** Avisa al servidor de un error de render, una vez por error (no por render). */
export function useReportError(error: Error & { digest?: string }) {
  const reported = useRef<unknown>(null);
  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    reportClientErrorAction({ digest: error.digest, message: error.message, path: window.location.pathname }).catch(
      () => {},
    );
  }, [error]);
}
