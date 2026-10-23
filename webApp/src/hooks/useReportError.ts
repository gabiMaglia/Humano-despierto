"use client";

import { useEffect, useRef } from "react";
import { reportClientErrorAction } from "@/app/actions/report-error";
import { toClientErrorReport } from "@/lib/errors/client-error-report";

/** Avisa al servidor de un error de render, una vez por error (no por render). */
export function useReportError(error: unknown) {
  const reported = useRef<unknown>(null);
  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    reportClientErrorAction({ ...toClientErrorReport(error), path: window.location.pathname }).catch(() => {});
  }, [error]);
}
