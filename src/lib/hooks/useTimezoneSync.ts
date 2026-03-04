"use client";

import { useEffect, useRef } from "react";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";

export function useTimezoneSync() {
  const hasSynced = useRef(false);
  const { useGet, usePatch } = useApi();

  const { data: status } = useGet(appRouter.api.dashboardStatus) as {
    data: { timezone: string | null } | undefined;
  };

  const { mutate: updateTimezone } = usePatch("/api/user/timezone");

  useEffect(() => {
    if (hasSynced.current || !status || status.timezone) return;

    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected) return;

    hasSynced.current = true;
    updateTimezone({ timezone: detected });
  }, [status, updateTimezone]);
}
