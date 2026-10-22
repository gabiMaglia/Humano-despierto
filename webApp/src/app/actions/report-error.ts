"use server";

import { reportClientError } from "@/lib/server/client-error";
import { withRateLimit } from "@/lib/server/rate-limit";

export const reportClientErrorAction = withRateLimit(
  "reportClientErrorAction",
  async function reportClientErrorAction(input: {
    digest?: string;
    message?: string;
    path?: string;
  }): Promise<void> {
    await reportClientError(input);
  },
  () => undefined,
);
