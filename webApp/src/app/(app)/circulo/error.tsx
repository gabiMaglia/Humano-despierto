"use client";

import { useReportError } from "@/hooks/useReportError";
import CampusError from "@/components/campus/CampusError";

export default function CampusGeneralError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);
  return <CampusError message={error.message} digest={error.digest} onRetry={reset} />;
}
