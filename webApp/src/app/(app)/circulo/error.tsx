"use client";

import CampusError from "@/components/campus/CampusError";

export default function CampusGeneralError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <CampusError message={error.message} onRetry={reset} />;
}
