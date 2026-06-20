"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import PostHogPageView from "@/components/tracking/PostHogPageView";
import { isProduction } from "@/utils/environments";
import { DISTINCT_ID_COOKIE, readClientCookie } from "@/lib/tracking/cookies";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (isProduction) {
      // Bootstrap posthog-js with the same anonymous id the server uses
      // (postclaw_distinct_id) so client + server events resolve to ONE person.
      // PostHogIdentify then merges that anon id into the userId on login.
      const bootstrapId = readClientCookie(DISTINCT_ID_COOKIE);
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false,
        ...(bootstrapId
          ? { bootstrap: { distinctID: bootstrapId, isIdentifiedID: false } }
          : {}),
      });
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

