import { z } from "zod";

export const checkoutSchema = z.object({
  planId: z.literal("pro"),
  // Monthly only — yearly billing was removed 2026-06-10.
  interval: z.literal("monthly"),
  // Relative path Stripe redirects to after checkout. Onboarding passes
  // "/onboarding?stripe_success=1" so it can poll for the subscription before
  // forwarding to /d (avoids the webhook→gate race). Defaults to /d.
  // MUST be a same-origin relative path: starts with a single "/" (not "//"
  // or a "/\" protocol-relative bypass) — prevents an open redirect when this
  // is interpolated into Stripe's success_url.
  successUrl: z
    .string()
    .regex(/^\/(?![/\\])[\w\-./?=&%#]*$/, "successUrl must be a relative path")
    .optional(),
});
