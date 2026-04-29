import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-user sliding-window cap on /api/chat. Pure conversational chat is free
// (no ledger debit), so without this cap a free user could spam-talk the
// model. 20/min is generous enough no real human notices.
//
// Behaviour when Upstash env vars are missing: fail-open (warn once, allow
// the request). This keeps local development running without provisioning
// Redis.

// Read both naming conventions:
//   - UPSTASH_REDIS_REST_URL / TOKEN: Upstash native, used by Redis.fromEnv()
//   - KV_REST_API_URL / KV_REST_API_TOKEN: Vercel Marketplace integration prefix
// Either pair is sufficient.
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
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "postclaw:chat",
    analytics: false,
  });
}

export interface ChatLimitResult {
  success: boolean;
  /** Epoch ms when the current window resets. Undefined when fail-open. */
  reset?: number;
}

export async function limitChat(userId: string): Promise<ChatLimitResult> {
  if (!limiter) {
    // Fail CLOSED in production — the chat surface is unmetered against
    // the usage ledger, so without this limiter the only abuse guard is
    // gone. Better to deny chat than silently let bots burn Anthropic
    // tokens at our expense.
    if (isProduction) {
      if (!warned) {
        warned = true;
        console.error(
          "[chatLimiter] Upstash env vars missing in production — failing CLOSED"
        );
      }
      return { success: false };
    }
    if (!warned) {
      warned = true;
      console.warn(
        "[chatLimiter] Upstash env vars missing — failing open in non-production"
      );
    }
    return { success: true };
  }
  const r = await limiter.limit(`chat:${userId}`);
  return { success: r.success, reset: r.reset };
}
