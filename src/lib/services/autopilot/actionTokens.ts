import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed one-click action links for the weekly digest email. No login: the
 * HMAC token IS the authorization, so it carries the user, the exact post
 * reference, the single action it allows, and an expiry (the post's fire
 * time — a veto link dies the moment the post goes live).
 */

export type AutopilotAction = "veto" | "regenerate";

export interface ActionTokenPayload {
  userId: string;
  /** Zernio post id (committed) or PostSuggestion id (staged). */
  postRef: string;
  refKind: "external" | "local";
  action: AutopilotAction;
  batchId: string;
  /** Unix seconds. */
  exp: number;
}

function getSecret(): string {
  const secret =
    process.env.AUTOPILOT_ACTION_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTOPILOT_ACTION_SECRET (or BETTER_AUTH_SECRET fallback) is required"
    );
  }
  return secret;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", getSecret()).update(data).digest());
}

export function createActionToken(payload: ActionTokenPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body)}`;
}

export type VerifyResult =
  | { ok: true; payload: ActionTokenPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyActionToken(token: string): VerifyResult {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return { ok: false, reason: "malformed" };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: ActionTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof payload.userId !== "string" ||
    typeof payload.postRef !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (payload.exp * 1000 < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}
