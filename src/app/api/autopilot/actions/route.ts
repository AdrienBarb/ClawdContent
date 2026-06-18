import { NextRequest, NextResponse } from "next/server";
import {
  verifyActionToken,
  type ActionTokenPayload,
} from "@/lib/services/autopilot/actionTokens";
import { executeAutopilotAction } from "@/lib/services/autopilot/actions";
import config from "@/lib/config";

export const maxDuration = 120; // regenerate runs a model rewrite + Zernio update

/**
 * One-click digest actions. NOT session-gated — the HMAC token is the
 * authorization (userId + postRef + single action + expiry baked in).
 *
 * GET renders an interstitial confirm page and POSTs back: email scanners
 * prefetch every link in an email, and a GET that vetoes a post would let a
 * corporate link-checker silently cancel the user's week.
 */

const ACTION_LABELS: Record<ActionTokenPayload["action"], { title: string; cta: string; blurb: string }> = {
  veto: {
    title: "Cancel this post?",
    cta: "Yes, don't publish it",
    blurb: "It will be removed from your schedule. This can't be undone.",
  },
  regenerate: {
    title: "Rewrite this post?",
    cta: "Yes, rewrite it",
    blurb: "A fresh version will replace the current caption, same topic.",
  },
};

function page(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} — PostClaw</title><style>
      body{margin:0;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2d2a25;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
      .card{background:#fff;border-radius:16px;padding:32px;max-width:420px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,.06)}
      h1{font-size:20px;margin:0 0 8px;letter-spacing:-.01em}
      p{font-size:14px;line-height:1.6;color:#6b7280;margin:0 0 20px}
      .btn{display:inline-block;background:linear-gradient(180deg,#ec6f5b 0%,#c84a35 100%);color:#fff;border:none;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}
      .brand{font-weight:700;font-size:15px;margin-bottom:24px}
      .muted{font-size:12px;color:#9ca3af;margin-top:16px}
    </style></head><body><div class="card"><div class="brand">PostClaw</div>${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function invalidTokenPage(reason: string): NextResponse {
  const message =
    reason === "expired"
      ? "This link has expired — the post may already be live."
      : "This link is invalid or has already been used.";
  return page(
    "Link unavailable",
    `<h1>Link unavailable</h1><p>${message}</p><a class="btn" href="${config.project.url}/d">Open PostClaw</a>`,
    410
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const verified = verifyActionToken(token);
  if (!verified.ok) return invalidTokenPage(verified.reason);

  const labels = ACTION_LABELS[verified.payload.action];
  return page(
    labels.title,
    `<h1>${labels.title}</h1><p>${labels.blurb}</p>
     <form method="POST" action="${config.project.url}/api/autopilot/actions">
       <input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}" />
       <button class="btn" type="submit">${labels.cta}</button>
     </form>
     <p class="muted">Changed your mind? Just close this page.</p>`
  );
}

export async function POST(req: NextRequest) {
  let token = "";
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    token = String(form.get("token") ?? "");
  } else {
    const body = await req.json().catch(() => ({}));
    token = typeof body.token === "string" ? body.token : "";
  }

  const verified = verifyActionToken(token);
  if (!verified.ok) return invalidTokenPage(verified.reason);

  const result = await executeAutopilotAction(verified.payload);
  return page(
    result.ok ? "Done" : "Something went wrong",
    `<h1>${result.ok ? "Done" : "Something went wrong"}</h1><p>${result.message}</p><a class="btn" href="${config.project.url}/d">See my week</a>`,
    result.ok ? 200 : 409
  );
}
