"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/lib/hooks/useApi";
import { ArrowRightIcon, StorefrontIcon } from "@phosphor-icons/react";

interface KnowledgeBase {
  source?: string;
  businessName?: string;
}

interface StatusPayload {
  knowledgeBase: KnowledgeBase | null;
}

export default function LegacyKBBanner() {
  const { data } = useQuery<StatusPayload>({
    queryKey: ["dashboardStatus"],
    queryFn: () => fetchData("/api/dashboard/status"),
  });

  const kb = data?.knowledgeBase;
  const isLegacy = kb?.source === "legacy" && !kb?.businessName;

  if (!isLegacy) return null;

  return (
    <Link
      href="/d/business"
      className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <StorefrontIcon className="h-5 w-5" weight="fill" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Complete your business profile
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Add your business name, description, and services so the AI can write posts that match your brand.
          </p>
        </div>
      </div>
      <ArrowRightIcon className="h-5 w-5 shrink-0 text-primary" />
    </Link>
  );
}
