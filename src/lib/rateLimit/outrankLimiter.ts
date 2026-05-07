import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limits the public Outrank webhook. Bearer token is the only authn
// signal — if it ever leaks, an attacker could flood Sanity writes and
// outbound image fetches. Cap at 30 requests/minute (Outrank publishes
// articles in small bursts; legitimate traffic stays well under this).
//
// Behaviour when Upstash env vars are missing:
//   - production: fail OPEN (allow + warn). The bearer check is still in
//     place, and we don't want a misconfigured Redis to block real Outrank
//     deliveries. Operators should monitor and provision Upstash.
//   - non-production: fail open silently for local dev.

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
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "postclaw:outrank",
    analytics: false,
  });
}

export interface OutrankLimitResult {
  success: boolean;
  reset?: number;
}

export async function limitOutrank(key: string): Promise<OutrankLimitResult> {
  if (!limiter) {
    if (isProduction && !warned) {
      warned = true;
      console.warn(
        "[outrankLimiter] Upstash env vars missing in production — failing OPEN (bearer token is sole authn)"
      );
    }
    return { success: true };
  }
  const r = await limiter.limit(key);
  return { success: r.success, reset: r.reset };
}
