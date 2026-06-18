import type { UseQueryResult } from "@tanstack/react-query";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";
import type { PaywallPlanResponse } from "@/lib/schemas/onboardingPlan";

// ~120s ceiling at 2.5s intervals — covers the slow Zernio-sync path (≈80s)
// with margin. The strategy is generated async after connect; we keep polling
// until it lands, then Step6 falls back to the generic perks.
const MAX_POLLS = 48;
const POLL_MS = 2500;

/**
 * Polls the paywall plan until the strategy lands. Only stops on `ready` or
 * after MAX_POLLS — it keeps polling on `null` and `"building"` so a single
 * transient non-ready poll never strands the user (which used to need a reload
 * to recover).
 */
export function useOnboardingPlan() {
  const { useGet } = useApi();

  return useGet(appRouter.api.onboardingPlan, undefined, {
    refetchInterval: (query: { state: { data?: PaywallPlanResponse | null; dataUpdateCount: number } }) => {
      const { data, dataUpdateCount } = query.state;
      if (data?.status === "ready") return false; // landed → stop
      if (dataUpdateCount >= MAX_POLLS) return false; // give up
      return POLL_MS; // undefined / null / "building" → keep trying
    },
    // Keep polling through the build window even if the user tabs away
    // (window-focus refetch is disabled globally).
    refetchIntervalInBackground: true,
  }) as UseQueryResult<PaywallPlanResponse | null>;
}
