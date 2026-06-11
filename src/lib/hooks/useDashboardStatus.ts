import { useQuery } from "@tanstack/react-query";
import { fetchData } from "./useApi";

interface AccountInfo {
  id: string;
  lateAccountId: string;
  platform: string;
  username: string;
  status: string;
  analysisStatus: string;
  lastAnalyzedAt: string | null;
}

export interface AutopilotBatchInfo {
  id: string;
  status: string; // "generating" | "ready" | "failed"
  mode: string; // "full_auto" | "review"
  weekStart: string;
  digestSentAt: string | null;
  approvedAt: string | null;
  postCount: number;
  createdAt: string;
}

export interface AutopilotStatus {
  mode: string;
  paused: boolean;
  pendingBrief: string | null;
  latestBatch: AutopilotBatchInfo | null;
}

export interface DashboardStatus {
  timezone: string | null;
  accounts: AccountInfo[];
  subscription: { status: string } | null;
  postsPublished: number;
  freePostLimit: number;
  autopilot: AutopilotStatus;
}

const QUERY_KEY = ["dashboardStatus"];

export function useDashboardStatus() {
  return useQuery<DashboardStatus>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchData("/api/dashboard/status"),
    refetchInterval: (query) => {
      const accounts: AccountInfo[] = query.state.data?.accounts ?? [];
      if (accounts.some((a) => a.analysisStatus === "analyzing")) return 5000;
      // Poll while the autopilot is building a week so "Preparing…" resolves
      // into the timeline without a manual refresh.
      if (query.state.data?.autopilot?.latestBatch?.status === "generating") {
        return 7000;
      }
      return false;
    },
  });
}
