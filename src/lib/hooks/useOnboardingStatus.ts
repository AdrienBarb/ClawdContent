import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchData } from "./useApi";
import { appRouter } from "@/lib/constants/appRouter";
import type { OnboardingStatus } from "@/lib/schemas/onboarding";

const QUERY_KEY = ["onboardingStatus"];

// Wall-clock budget for polling a single in-flight analysis job. A genuinely
// dropped Inngest event would otherwise leave the status on "pending" forever
// and poll every 2s for as long as the wizard is mounted. Measured purely from
// client-side Date.now() deltas (immune to client/server clock skew) and reset
// whenever the job is no longer in flight.
const MAX_POLL_MS = 180_000;

// Mirrors useDashboardStatus. Polls every 2s while the background website
// analysis is in flight (screen 4) — otherwise it's a one-shot read. The
// final screen calls refetch() after the subscribe CTA to detect completion.
export function useOnboardingStatus() {
  const inFlightSince = useRef<number | null>(null);
  return useQuery<OnboardingStatus>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchData(appRouter.api.onboardingStatus),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.isCompleted) return false;
      const status = data.websiteAnalysis?.status;
      const inFlight = status === "pending" || status === "running";
      if (!inFlight) {
        inFlightSince.current = null;
        return false;
      }
      if (inFlightSince.current === null) inFlightSince.current = Date.now();
      if (Date.now() - inFlightSince.current > MAX_POLL_MS) return false;
      return 2000;
    },
  });
}
