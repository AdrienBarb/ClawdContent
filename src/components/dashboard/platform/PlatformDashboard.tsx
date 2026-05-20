"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPlatform } from "@/lib/constants/platforms";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import PlatformStrategyCard from "@/components/dashboard/platform/PlatformStrategyCard";
import AutopublishToggle from "@/components/dashboard/platform/AutopublishToggle";
import UpcomingPostsCalendar from "@/components/dashboard/platform/UpcomingPostsCalendar";
import PostEditDrawer from "@/components/dashboard/platform/PostEditDrawer";
import StrategyOverrideDrawer from "@/components/dashboard/platform/StrategyOverrideDrawer";
import EmptyDashboardShell from "@/components/dashboard/EmptyDashboardShell";
import type {
  AccountSwitcherEntry,
  PlatformAccount,
  PlatformSuggestion,
} from "@/components/dashboard/platform/types";

interface Props {
  platform: string;
  account: PlatformAccount | null;
  accountsOnPlatform: AccountSwitcherEntry[];
  suggestions: PlatformSuggestion[];
  cadenceDefault: number | null;
}

export default function PlatformDashboard({
  platform,
  account,
  accountsOnPlatform,
  suggestions,
  cadenceDefault,
}: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [strategyDrawerOpen, setStrategyDrawerOpen] = useState(false);

  const platformBrand = getPlatform(platform);
  const platformConfig = (() => {
    try {
      return getPlatformConfig(platform);
    } catch {
      return null;
    }
  })();

  const editingSuggestion = useMemo(
    () => suggestions.find((s) => s.id === editingId) ?? null,
    [editingId, suggestions]
  );

  // No connected account on this platform — surface a connect prompt.
  if (!account) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {platformBrand?.label ?? platform}
        </h1>
        <p className="mt-2 text-[14px] text-gray-600">
          You don&apos;t have a {platformBrand?.label ?? platform} account
          connected yet. Connect one to start planning posts.
        </p>
        <div className="mt-10">
          <EmptyDashboardShell />
        </div>
      </div>
    );
  }

  const videoDisabled = cadenceDefault === null;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header ------------------------------------------------------ */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {platformBrand && (
            <span
              aria-hidden
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-white"
              style={{ backgroundColor: platformBrand.color }}
            >
              {platformBrand.icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              @{account.username}
            </h1>
            <p className="text-[13px] text-gray-500">
              {platformBrand?.label ?? platform}
              {accountsOnPlatform.length > 1 && (
                <>
                  {" · "}
                  <AccountSwitcher
                    platform={platform}
                    current={account.id}
                    options={accountsOnPlatform}
                  />
                </>
              )}
            </p>
          </div>
        </div>

        {!videoDisabled && (
          <AutopublishToggle
            accountId={account.id}
            autopublish={account.autopublish}
            hasScheduledPosts={suggestions.some(
              (s) => s.publishedExternalId != null || s.scheduledAt != null
            )}
            onChanged={() => router.refresh()}
          />
        )}
      </header>

      {/* Video-disabled state --------------------------------------- */}
      {videoDisabled ? (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Video planning coming soon
          </h2>
          <p className="mt-2 text-[14px] text-gray-600">
            We&apos;re still building the {platformBrand?.label ?? platform}{" "}
            workflow. Your account stays connected, and we&apos;ll switch on
            generation here as soon as it&apos;s ready.
          </p>
        </div>
      ) : (
        <>
          {/* Strategy card -------------------------------------------- */}
          <section className="mt-8">
            <PlatformStrategyCard
              account={account}
              cadenceDefault={cadenceDefault ?? 0}
              onCustomize={() => setStrategyDrawerOpen(true)}
            />
          </section>

          {/* Calendar --------------------------------------------------- */}
          <section className="mt-8">
            <UpcomingPostsCalendar
              suggestions={suggestions}
              onEdit={(id) => setEditingId(id)}
            />
          </section>
        </>
      )}

      {/* Drawers ------------------------------------------------------- */}
      {editingSuggestion && (
        <PostEditDrawer
          open={editingSuggestion != null}
          onOpenChange={(o) => {
            if (!o) setEditingId(null);
          }}
          suggestion={editingSuggestion}
          platform={account.platform}
          charLimit={platformConfig?.charLimit ?? null}
          imageRequired={
            platformConfig?.requiresMedia === "image_or_video" ||
            platformConfig?.requiresMedia === "video"
          }
          onMutated={() => router.refresh()}
        />
      )}

      {!videoDisabled && cadenceDefault !== null && (
        <StrategyOverrideDrawer
          open={strategyDrawerOpen}
          onOpenChange={setStrategyDrawerOpen}
          account={account}
          cadenceDefault={cadenceDefault}
          onMutated={() => router.refresh()}
        />
      )}
    </div>
  );
}

function AccountSwitcher({
  platform,
  current,
  options,
}: {
  platform: string;
  current: string;
  options: AccountSwitcherEntry[];
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {options.map((opt, i) => (
        <span key={opt.id}>
          {i > 0 && <span className="text-gray-300"> · </span>}
          {opt.id === current ? (
            <span className="text-gray-700">@{opt.username}</span>
          ) : (
            <Link
              href={`/d/${platform}?accountId=${opt.id}`}
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              @{opt.username}
            </Link>
          )}
        </span>
      ))}
    </span>
  );
}
