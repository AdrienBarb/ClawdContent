"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { isProduction } from "@/utils/environments";

/**
 * Identify the authenticated user so client + server events (which share the
 * anonymous `postclaw_distinct_id` via PostHogProvider's bootstrap) merge into
 * ONE person. Mounted in the authed layouts — render it on every authed page;
 * the `get_distinct_id` guard makes repeat renders a no-op.
 *
 * PostHog inits in PostHogProvider's effect, which (being an ancestor) runs
 * AFTER this deeper component's effect on the initial mount — so we wait for
 * `__loaded` before identifying, otherwise the call would be dropped.
 */
export default function PostHogIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    if (!isProduction || !userId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // ~3s at 50ms — covers init; then give up.

    const identifyWhenReady = () => {
      if (cancelled) return;
      if (!posthog.__loaded) {
        if (attempts++ >= MAX_ATTEMPTS) return; // posthog never loaded — bail.
        timer = setTimeout(identifyWhenReady, 50);
        return;
      }
      if (posthog.get_distinct_id() !== userId) {
        posthog.identify(userId);
      }
    };
    identifyWhenReady();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [userId]);

  return null;
}
