import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-user sliding-window cap on /api/onboarding/analyze. Each call hits two
// paid APIs (Firecrawl scrape + Anthropic generateObject) and is unmetered
// against the usage ledger. Real onboarding triggers this 1–3 times, so 5/h
// is generous for honest users and tight enough to block credit-burn loops.
//
// Behaviour when Upstash env vars are missing: fail-CLOSED in production,
// fail-open in dev — same policy as chatLimiter.

const url =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const hasUpstash = !!url && !!token;
const isProduction = process.env.NODE_ENV === "production";

let limiter: Ratelimit | null = null;
let warned = false;

if (hasUpstash) {
  limiter = new Ratelimit({
    redis: new Redis({ url: url!, token: token! }),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "postclaw:onboarding-analyze",
    analytics: false,
  });
}

export interface OnboardingLimitResult {
  success: boolean;
  /** Epoch ms when the current window resets. Undefined when fail-open. */
  reset?: number;
}

export async function limitOnboardingAnalyze(
  userId: string
): Promise<OnboardingLimitResult> {
  if (!limiter) {
    if (isProduction) {
      if (!warned) {
        warned = true;
        console.error(
          "[onboardingLimiter] Upstash env vars missing in production — failing CLOSED"
        );
      }
      return { success: false };
    }
    if (!warned) {
      warned = true;
      console.warn(
        "[onboardingLimiter] Upstash env vars missing — failing open in non-production"
      );
    }
    return { success: true };
  }
  const r = await limiter.limit(`onboarding-analyze:${userId}`);
  return { success: r.success, reset: r.reset };
}
