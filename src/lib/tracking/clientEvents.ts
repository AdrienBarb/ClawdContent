import posthog from "posthog-js";
import { isProduction } from "@/utils/environments";

/**
 * Client-side analytics events. Server-side events use `captureServerEvent`
 * (src/lib/tracking/postHogClient.ts). Names are snake_case to match the
 * existing convention (user_signed_up, paywall_checkout_started).
 */
export type ClientAnalyticsEvent =
  | "onboarding_started"
  | "onboarding_step_viewed"
  | "onboarding_step_completed"
  | "onboarding_account_connected"
  | "onboarding_paywall_viewed";

/**
 * Capture a client-side event through posthog-js. PostHog is only initialised
 * in production (see PostHogProvider), so this is a deliberate no-op in
 * dev/staging — it never throws when the SDK isn't loaded.
 */
export function captureClientEvent(
  event: ClientAnalyticsEvent,
  properties?: Record<string, unknown>
): void {
  if (!isProduction) return;
  posthog.capture(event, properties);
}

/**
 * Reset PostHog identity on logout so the next user on this browser starts as a
 * fresh anonymous person. Without this, identifying a second user would MERGE
 * them into the first user's person (see PostHogIdentify). Call before signOut.
 */
export function resetClientIdentity(): void {
  if (!isProduction) return;
  if (posthog.__loaded) posthog.reset();
}
