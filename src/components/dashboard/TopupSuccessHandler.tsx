"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// Stripe redirects to /d?topup=success after a successful top-up checkout.
// We invalidate the dashboard status repeatedly because the webhook may take
// a beat to land — without retries the user can land on the dashboard with
// the old balance still showing and assume their purchase failed.
const REFETCH_DELAYS_MS = [0, 1500, 4000, 8000];

export default function TopupSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Bind to the primitive flag, not the searchParams object — otherwise the
  // effect re-fires on every dashboard navigation (object identity changes).
  const topup = searchParams?.get("topup") ?? null;

  useEffect(() => {
    if (topup !== "success") return;

    const timers = REFETCH_DELAYS_MS.map((delay) =>
      setTimeout(
        () =>
          queryClient.invalidateQueries({ queryKey: ["dashboardStatus"] }),
        delay
      )
    );

    router.replace(pathname ?? "/d");

    return () => timers.forEach(clearTimeout);
  }, [topup, queryClient, router, pathname]);

  return null;
}
