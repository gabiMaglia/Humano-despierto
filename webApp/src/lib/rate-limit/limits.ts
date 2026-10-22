import type { RateLimitRule } from "@/lib/rate-limit/core";

export const RATE_LIMITS = {
  saveReviewAction: { max: 5, windowSeconds: 600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;
