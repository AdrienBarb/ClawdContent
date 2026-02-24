import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { errorMessages } from "@/lib/constants/errorMessage";

export async function checkRateLimit(
  req: NextRequest,
  limiter: Ratelimit
): Promise<{ success: boolean; response?: NextResponse }> {
  // Get IP from headers (works with Vercel, Cloudflare, etc.)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: errorMessages.RATE_LIMIT_EXCEEDED },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      ),
    };
  }

  return { success: true };
}
