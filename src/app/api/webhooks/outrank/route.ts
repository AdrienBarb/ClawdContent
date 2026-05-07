import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { OutrankWebhookSchema } from "@/lib/schemas/outrank";
import { processOutrankArticles } from "@/lib/services/outrankIntake";
import { limitOutrank } from "@/lib/rateLimit/outrankLimiter";
import { errorHandler } from "@/lib/errors/errorHandler";

export const runtime = "nodejs";
export const maxDuration = 60;

let missingTokenWarned = false;

function isValidBearer(authHeader: string | null): boolean {
  const token = process.env.OUTRANK_WEBHOOK_TOKEN;
  if (!token) {
    if (!missingTokenWarned) {
      missingTokenWarned = true;
      console.error(
        "[outrank-webhook] OUTRANK_WEBHOOK_TOKEN not configured — every request will 401"
      );
    }
    return false;
  }
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const provided = authHeader.slice("Bearer ".length);
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(token);
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function clientKey(req: NextRequest): string {
  // x-forwarded-for is platform-set on Vercel; fall back to a constant key
  // (single bucket) if absent so misconfigured edges still get rate-limited.
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "outrank:unknown";
}

export async function POST(req: NextRequest) {
  try {
    if (!isValidBearer(req.headers.get("authorization"))) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      );
    }

    const limit = await limitOutrank(clientKey(req));
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const payload = OutrankWebhookSchema.parse(await req.json());

    if (payload.event_type !== "publish_articles") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await processOutrankArticles(payload.data.articles);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorHandler(error);
  }
}
