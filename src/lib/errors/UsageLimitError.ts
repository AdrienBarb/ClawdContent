import type { UsageType } from "@/lib/constants/usage";

// Payload shape — UI doesn't need to know the cost or the cap because it
// only renders the percentage. We still carry the type that triggered the
// wall (for analytics / nuanced copy) and the resetAt for "back on May 28"
// messaging.
export interface UsageLimitPayload {
  attemptedType: UsageType;
  percentageRemaining: number; // always 0 when this fires, kept for shape parity
  resetAt: Date | null;
  isPaid: boolean;
}

export type UsageLimitPayloadWire = Omit<UsageLimitPayload, "resetAt"> & {
  resetAt: string | null;
};

// Thrown by usage.consume() when the requested debit would push balance
// negative. errorHandler maps it to HTTP 402 with the wire payload — the
// front-end intercepts that status and opens the paywall modal.
export class UsageLimitError extends Error {
  public readonly payload: UsageLimitPayload;

  constructor(payload: UsageLimitPayload) {
    super("USAGE_LIMIT_REACHED");
    this.name = "UsageLimitError";
    this.payload = payload;
  }
}
