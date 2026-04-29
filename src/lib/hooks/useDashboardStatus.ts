import { useQuery } from "@tanstack/react-query";
import { fetchData } from "./useApi";

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  status: string;
  analysisStatus: string;
  lastAnalyzedAt: string | null;
}

export interface UsageBreakdown {
  // Single number 0–100. UI never shows raw points or caps.
  percentageRemaining: number;
  resetAt: string | null;
  isPaid: boolean;
}

export interface DashboardStatus {
  accounts: AccountInfo[];
  subscription: { status: string } | null;
  postsPublished: number;
  freePostLimit: number;
  usage: UsageBreakdown;
}

const QUERY_KEY = ["dashboardStatus"];

export function useDashboardStatus() {
  return useQuery<DashboardStatus>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchData("/api/dashboard/status"),
    refetchInterval: (query) => {
      const accounts: AccountInfo[] = query.state.data?.accounts ?? [];
      return accounts.some((a) => a.analysisStatus === "analyzing")
        ? 5000
        : false;
    },
  });
}
