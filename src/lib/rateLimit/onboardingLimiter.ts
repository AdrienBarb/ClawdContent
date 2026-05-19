import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-user sliding-window cap on /api/onboarding/analyze. Each call hits two
// paid APIs (Firecrawl scrape + Anthropic generateObject) and is otherwise
// unmetered. Real onboarding triggers this 1–3 times, so 5/h is generous for
// honest users and tight enough to block burn loops.
//
// Behaviour when Upstash env vars are missing: fail-CLOSED in production,
// fail-open in dev.

const url =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const hasUpstash = !!url && !!token;
const isProduction = process.env.NODE_ENV === "production";

let analyzeLimiter: Ratelimit | null = null;
let brandIdentityLimiter: Ratelimit | null = null;
let warned = false;

if (hasUpstash) {
  const redis = new Redis({ url: url!, token: token! });
  analyzeLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "postclaw:onboarding-analyze",
    analytics: false,
  });
  brandIdentityLimiter = new Ratelimit({
    redis,
    // brand-identity is cheaper than analyze (no external API call) but still
    // writes user.brandIdentity JSON. 20/h is generous for honest users
    // (extracted preview + a handful of manual tweaks) and blocks burn loops.
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "postclaw:onboarding-brand-identity",
    analytics: false,
  });
}

export interface OnboardingLimitResult {
  success: boolean;
  /** Epoch ms when the current window resets. Undefined when fail-open. */
  reset?: number;
}

async function applyLimit(
  limiter: Ratelimit | null,
  key: string,
  name: string
): Promise<OnboardingLimitResult> {
  if (!limiter) {
    if (isProduction) {
      if (!warned) {
        warned = true;
        console.error(
          `[onboardingLimiter] Upstash env vars missing in production — failing CLOSED (${name})`
        );
      }
      return { success: false };
    }
    if (!warned) {
      warned = true;
      console.warn(
        `[onboardingLimiter] Upstash env vars missing — failing open in non-production (${name})`
      );
    }
    return { success: true };
  }
  const r = await limiter.limit(key);
  return { success: r.success, reset: r.reset };
}

export async function limitOnboardingAnalyze(
  userId: string
): Promise<OnboardingLimitResult> {
  return applyLimit(analyzeLimiter, `onboarding-analyze:${userId}`, "analyze");
}

export async function limitOnboardingBrandIdentity(
  userId: string
): Promise<OnboardingLimitResult> {
  return applyLimit(
    brandIdentityLimiter,
    `onboarding-brand-identity:${userId}`,
    "brand-identity"
  );
}
