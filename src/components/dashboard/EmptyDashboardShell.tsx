"use client";

import { useRouter } from "next/navigation";
import EmptyDashboardState from "@/components/dashboard/EmptyDashboardState";

/**
 * Reaches the dashboard root when a user has finished onboarding but has no
 * active social account (e.g. they disconnected the only one they had).
 * Renders the connect picker and refreshes the page on success — the server
 * /d route then redirects to /d/[firstPlatform].
 */
export default function EmptyDashboardShell() {
  const router = useRouter();
  return (
    <EmptyDashboardState
      connectedPlatformIds={[]}
      onAccountConnected={() => router.refresh()}
    />
  );
}
