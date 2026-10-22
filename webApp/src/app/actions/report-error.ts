"use server";

import { reportClientError } from "@/lib/server/client-error";

export async function reportClientErrorAction(input: {
  digest?: string;
  message?: string;
  path?: string;
}): Promise<void> {
  await reportClientError(input);
}
