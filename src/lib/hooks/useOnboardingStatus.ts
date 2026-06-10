import { useQuery } from "@tanstack/react-query";
import { fetchData } from "./useApi";
import { appRouter } from "@/lib/constants/appRouter";
import type { OnboardingStatus } from "@/lib/schemas/onboarding";

const QUERY_KEY = ["onboardingStatus"];

// Mirrors useDashboardStatus. Polls every 2s while the background website
// analysis is in flight (screen 3) — otherwise it's a one-shot read. The
// final screen calls refetch() after the subscribe CTA to detect completion.
export function useOnboardingStatus() {
  return useQuery<OnboardingStatus>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchData(appRouter.api.onboardingStatus),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.isCompleted) return false;
      const status = data.websiteAnalysis?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    },
  });
}
