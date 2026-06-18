import { getFeatureFlag } from "@/lib/tracking/postHogClient";
import type { PaywallVariant } from "@/lib/schemas/onboardingPlan";

/**
 * Onboarding paywall A/B test: the subscribe footer either shows the value
 * anchor at full price ("control") or a "$49 first month, then $99/mo" intro
 * discount ("discount"). PostHog multivariate flag, 50/50, keyed on the
 * anonymous distinct id so assignment is deterministic and consistent between
 * the plan endpoint (which footer to render) and the checkout route (whether to
 * apply the coupon).
 */
export const PAYWALL_INTRO_FLAG = "paywall-intro-discount";

/**
 * Stripe coupon id for the "$49 first month, then $99/mo" intro offer
 * (create as amount_off $50.00, duration: once, scoped to the $99 price).
 *
 * The discount variant is served ONLY when this is configured — so the $49 copy
 * can never appear, and no one is ever charged it, without a real coupon behind
 * it. This makes the whole experiment safe to ship before the coupon exists; it
 * auto-activates the moment the env var is set.
 */
export function getIntroCouponId(): string | undefined {
  return process.env.STRIPE_COUPON_POSTCLAW_INTRO || undefined;
}

/**
 * Resolve the paywall variant for a visitor. Deterministic per distinctId
 * (PostHog consistent hashing) so the plan endpoint and the checkout route
 * always agree for the same person. Falls back to "control" whenever the
 * discount can't be honoured: no coupon configured, no distinct id, or PostHog
 * disabled.
 *
 * `sendFeatureFlagEvents: false` because the plan endpoint polls every ~2.5s —
 * we track exposure/conversion through the explicit paywall_* events instead.
 */
export async function resolvePaywallVariant(
  distinctId: string | undefined
): Promise<PaywallVariant> {
  if (!getIntroCouponId()) return "control";
  if (!distinctId) return "control";

  const flag = await getFeatureFlag(PAYWALL_INTRO_FLAG, distinctId, {
    sendFeatureFlagEvents: false,
  });
  return flag === "discount" ? "discount" : "control";
}
