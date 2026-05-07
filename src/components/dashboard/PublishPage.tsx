"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import EmptyDashboardState from "./EmptyDashboardState";
import SubscribeModal from "./SubscribeModal";
import { ChatPanel } from "./ChatPanel";
import { SuggestionsBoard } from "./SuggestionsBoard";
import { SUGGESTIONS_QUERY_KEY } from "./publish/queryKeys";
import type { AccountInfo } from "./publish/types";

const CreatePostModal = dynamic(() => import("./publish/CreatePostModal"), {
  ssr: false,
});

export default function PublishPage() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    useDashboardStatus();

  const accounts: AccountInfo[] = (status?.accounts ?? []).filter(
    (a: AccountInfo) => a.status === "active"
  );
  const connectedPlatformIds = accounts.map((a: AccountInfo) => a.platform);

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerGapIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyDashboardState
        connectedPlatformIds={connectedPlatformIds}
        onAccountConnected={() => refetchStatus()}
      />
    );
  }

  // Re-mount the inner shell whenever the active account set changes —
  // this re-initializes selection cleanly via useState's lazy init without
  // synchronous setState-in-effect cascades.
  const accountKey = accounts
    .map((a) => a.id)
    .slice()
    .sort()
    .join(",");

  return (
    <PublishShell
      key={accountKey}
      accounts={accounts}
      hasSubscription={
        status?.subscription?.status === "active" ||
        status?.subscription?.status === "trialing"
      }
      postsPublished={status?.postsPublished ?? 0}
      freePostLimit={status?.freePostLimit ?? 5}
      onPublishedOrScheduled={refetchStatus}
    />
  );
}

interface ShellProps {
  accounts: AccountInfo[];
  hasSubscription: boolean;
  postsPublished: number;
  freePostLimit: number;
  onPublishedOrScheduled: () => void;
}

function PublishShell({
  accounts,
  hasSubscription,
  postsPublished,
  freePostLimit,
  onPublishedOrScheduled,
}: ShellProps) {
  const qc = useQueryClient();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() =>
    accounts.map((a) => a.id)
  );
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [creatingForAccount, setCreatingForAccount] = useState<{
    id: string;
    platform: string;
    username: string;
  } | null>(null);

  const isPostLimitReached =
    !hasSubscription && postsPublished >= freePostLimit;

  const invalidateSuggestions = () => {
    qc.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
  };

  const activeCreatingAccount =
    creatingForAccount &&
    accounts.some((a) => a.id === creatingForAccount.id)
      ? creatingForAccount
      : null;

  return (
    <>
      <ChatPanel
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
        onSelectedAccountIdsChange={setSelectedAccountIds}
        onSuggestionsChanged={invalidateSuggestions}
      />

      <div className="mt-3 mb-8 border-t border-gray-100" />

      <SuggestionsBoard
        accounts={accounts}
        onLimitReached={() => setShowSubscribeModal(true)}
        onPublishedOrScheduled={onPublishedOrScheduled}
        onAddPost={setCreatingForAccount}
        quotaRemaining={
          hasSubscription
            ? null
            : Math.max(0, freePostLimit - postsPublished)
        }
      />

      {activeCreatingAccount && (
        <CreatePostModal
          account={{
            id: activeCreatingAccount.id,
            platform: activeCreatingAccount.platform,
            username: activeCreatingAccount.username,
          }}
          onClose={() => setCreatingForAccount(null)}
          onCreate={async ({ content, mediaItems }) => {
            try {
              const res = await fetch("/api/suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  socialAccountId: activeCreatingAccount.id,
                  content,
                  mediaItems,
                }),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => null);
                toast.error(
                  body?.message ?? "Couldn't create the post. Try again."
                );
                return;
              }
              invalidateSuggestions();
              setCreatingForAccount(null);
              toast.success("Draft created");
            } catch {
              toast.error("Couldn't create the post. Try again.");
            }
          }}
        />
      )}

      {!hasSubscription && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-30">
          <div className="flex items-center gap-3 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                {postsPublished}/{freePostLimit} free posts used
              </span>
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (postsPublished / freePostLimit) * 100)}%`,
                    backgroundColor: isPostLimitReached
                      ? "#ef4444"
                      : "#e8614d",
                  }}
                />
              </div>
            </div>
            {isPostLimitReached && (
              <button
                onClick={() => setShowSubscribeModal(true)}
                className="text-xs font-medium text-white rounded-full h-9 px-4 cursor-pointer"
                style={{ backgroundColor: "#e8614d" }}
              >
                Subscribe
              </button>
            )}
          </div>
        </div>
      )}

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </>
  );
}
