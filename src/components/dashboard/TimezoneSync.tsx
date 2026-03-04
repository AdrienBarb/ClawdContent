"use client";

import { useTimezoneSync } from "@/lib/hooks/useTimezoneSync";

export default function TimezoneSync() {
  useTimezoneSync();
  return null;
}
