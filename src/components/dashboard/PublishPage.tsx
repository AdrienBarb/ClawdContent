"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  SpinnerGapIcon,
  ShieldCheckIcon,
  LockKeyIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { getPlatform } from "@/lib/constants/platforms";
import ConnectAccountButtons from "./ConnectAccountButtons";
import PublishEntry from "./PublishEntry";
import SubscribeModal from "./SubscribeModal";
import { AnalyzingCard } from "./publish/AnalyzingCard";
import { PlatformSelectView } from "./publish/PlatformSelectView";
import { BriefView } from "./publish/BriefView";
import { LoadingView } from "./publish/LoadingView";
import { ResultsView } from "./publish/ResultsView";
import type { AccountInfo, Mode, Suggestion, View } from "./publish/types";

// Lazy-load the edit modal — only fetched when the user clicks Edit, keeping
// the initial /d bundle smaller (image upload + Cloudinary widget code).
const EditSuggestionModal = dynamic(
  () => import("./publish/EditSuggestionModal"),
  { ssr: false }
);

export default function PublishPage() {
  const [view, setView] = useState<View>("entry");
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [generatedSuggestions, setGeneratedSuggestions] = useState<
    Suggestion[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Suggestion | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useDashboardStatus();

  const accounts: AccountInfo[] = (status?.accounts ?? []).filter(
    (a: AccountInfo) => a.status === "active"
  );
  const connectedPlatformIds = accounts.map((a: AccountInfo) => a.platform);
  const isAnalyzing = accounts.some(
    (a: AccountInfo) => a.analysisStatus === "analyzing"
  );

  const hasSubscription =
    status?.subscription?.status === "active" ||
    status?.subscription?.status === "trialing";
  const postsPublished: number = status?.postsPublished ?? 0;
  const freePostLimit: number = status?.freePostLimit ?? 5;
  const isPostLimitReached =
    !hasSubscription && postsPublished >= freePostLimit;

  const guardPost = async (action: () => Promise<void>) => {
    if (isPostLimitReached) {
      setShowSubscribeModal(true);
    } else {
      await action();
    }
  };

  const generationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
    };
  }, []);

  const cancelGeneration = () => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
  };

  const resetToEntry = () => {
    cancelGeneration();
    setView("entry");
    setMode(null);
    setSelectedAccountIds([]);
    setBrief("");
    setGeneratedSuggestions([]);
    setError(null);
  };

  const runGenerate = async (
    modeArg: Mode,
    accountIds: string[],
    briefArg: string
  ) => {
    setError(null);
    setView("loading");

    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    const { signal } = controller;

    try {
      const endpoint =
        modeArg === "ideas"
          ? "/api/suggestions/generate"
          : "/api/suggestions/from-brief";
      const body =
        modeArg === "ideas"
          ? { accountIds }
          : { accountIds, brief: briefArg.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ?? "Generation failed. Try again in a moment."
        );
      }
      const data = await res.json();
      const suggestions: Suggestion[] = Array.isArray(data?.suggestions)
        ? data.suggestions
        : [];
      const failedIds: string[] = Array.isArray(data?.failedAccountIds)
        ? data.failedAccountIds
        : [];
      if (suggestions.length === 0) {
        throw new Error(
          "We couldn't generate any posts. Try again in a moment."
        );
      }
      if (signal.aborted) return;
      if (failedIds.length > 0) {
        const failedLabels = failedIds
          .map((id) => {
            const acc = accounts.find((a) => a.id === id);
            return acc
              ? (getPlatform(acc.platform)?.label ?? acc.platform)
              : null;
          })
          .filter((x): x is string => Boolean(x));
        const list =
          failedLabels.length > 0
            ? failedLabels.join(", ")
            : `${failedIds.length} account${failedIds.length === 1 ? "" : "s"}`;
        toast.error(
          `Couldn't generate posts for ${list}. The rest went through.`
        );
      }
      setGeneratedSuggestions(suggestions);
      setView("results");
    } catch (err) {
      // User-initiated cancel: silent exit, the cancel handler already moved
      // the view back. Don't toast or surface an error.
      if (signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      if (modeArg === "ideas") {
        // No confirm screen for ideas — surface the error via toast and
        // bounce back to platforms (or entry, if a single-account account
        // skipped the platform step).
        toast.error(message);
        setView(accounts.length === 1 ? "entry" : "platforms");
      } else {
        // BriefView shows the error inline.
        setError(message);
        setView("action");
      }
    } finally {
      if (generationAbortRef.current === controller) {
        generationAbortRef.current = null;
      }
    }
  };

  /**
   * Shared handler for "publish" / "schedule" actions on a suggestion.
   * Both go through `POST /api/suggestions/:id`; only the body and toast
   * copy differ. Pulls free-tier paywall + validation handling into one
   * place so the two callers stay in sync.
   */
  const submitSuggestionAction = async (
    id: string,
    body: Record<string, unknown>,
    opts: { successMessage: string; failureMessage: string }
  ) => {
    await guardPost(async () => {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error === "FREE_POST_LIMIT_REACHED") {
          setShowSubscribeModal(true);
          return;
        }
        if (data?.error === "VALIDATION_FAILED" && data.validationErrors) {
          for (const e of data.validationErrors) {
            toast.error(`${e.platform}: ${e.error}`);
          }
        } else {
          toast.error(opts.failureMessage);
        }
        return;
      }
      toast.success(opts.successMessage);
      setGeneratedSuggestions((prev) => prev.filter((s) => s.id !== id));
      refetchStatus();
    });
  };

  const startFlow = (nextMode: Mode) => {
    setMode(nextMode);
    setBrief("");
    setError(null);
    if (accounts.length === 1) {
      const ids = [accounts[0].id];
      setSelectedAccountIds(ids);
      // Single account: skip the platform picker.
      // - ideas: generate immediately.
      // - create: go straight to the brief textarea.
      if (nextMode === "create") {
        setView("action");
      } else {
        runGenerate("ideas", ids, "");
      }
    } else {
      setSelectedAccountIds([]);
      setView("platforms");
    }
  };

  const handlePlatformsContinue = () => {
    if (mode === "ideas") {
      runGenerate("ideas", selectedAccountIds, "");
    } else {
      setView("action");
    }
  };

  const handleBriefSubmit = () => {
    if (!mode) return;
    runGenerate(mode, selectedAccountIds, brief);
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerGapIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // No connected accounts → show connect-first state
  if (accounts.length === 0) {
    return (
      <>
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: "#fef2f0" }}
          >
            <ShieldCheckIcon
              className="h-7 w-7"
              style={{ color: "#e8614d" }}
              weight="duotone"
            />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1.5">
            Connect your first account to get started
          </h2>
          <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
            We&apos;ll draft posts for your business — you decide what goes
            live.
          </p>
          <ConnectAccountButtons
            onAccountConnected={() => refetchStatus()}
            connectedPlatforms={connectedPlatformIds}
          />
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <LockKeyIcon className="h-3.5 w-3.5" />
              Secure connection
            </span>
            <span className="text-gray-200">·</span>
            <span className="flex items-center gap-1.5">
              <SignOutIcon className="h-3.5 w-3.5" />
              Disconnect anytime
            </span>
          </div>
        </div>
        <SubscribeModal
          open={showSubscribeModal}
          onOpenChange={setShowSubscribeModal}
        />
      </>
    );
  }

  const wizardAccounts = accounts.map((a) => ({
    id: a.id,
    platform: a.platform,
    username: a.username,
  }));

  return (
    <>
      <div key={view} className="animate-in fade-in duration-200">
        {view === "entry" &&
          (isAnalyzing ? (
            <AnalyzingCard />
          ) : (
            <PublishEntry
              onGetIdeas={() => startFlow("ideas")}
              onCreatePost={() => startFlow("create")}
            />
          ))}

        {view === "platforms" && mode && (
          <PlatformSelectView
            mode={mode}
            accounts={wizardAccounts}
            selectedIds={selectedAccountIds}
            onToggle={(id) =>
              setSelectedAccountIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onSelectAll={() =>
              setSelectedAccountIds(
                selectedAccountIds.length === wizardAccounts.length
                  ? []
                  : wizardAccounts.map((a) => a.id)
              )
            }
            onBack={resetToEntry}
            onContinue={handlePlatformsContinue}
          />
        )}

        {view === "action" && mode === "create" && (
          <BriefView
            brief={brief}
            onBriefChange={setBrief}
            canGoBack={accounts.length > 1}
            error={error}
            onBack={() =>
              accounts.length > 1 ? setView("platforms") : resetToEntry()
            }
            onSubmit={handleBriefSubmit}
          />
        )}

        {view === "loading" && mode && (
          <LoadingView mode={mode} onCancel={resetToEntry} />
        )}

        {view === "results" && (
          <ResultsView
            accounts={wizardAccounts}
            suggestions={generatedSuggestions}
            onBack={resetToEntry}
            onEdit={setEditingItem}
            onSchedule={(id, scheduledAt) =>
              submitSuggestionAction(
                id,
                { scheduledAt },
                {
                  successMessage: "Post scheduled",
                  failureMessage: "Failed to schedule post",
                }
              )
            }
            onAction={async (action, suggestion) => {
              if (action === "publish") {
                await submitSuggestionAction(
                  suggestion.id,
                  { action: "publish" },
                  {
                    successMessage: "Post published",
                    failureMessage: "Failed to publish post",
                  }
                );
              } else if (action === "delete") {
                const res = await fetch(`/api/suggestions/${suggestion.id}`, {
                  method: "DELETE",
                });
                if (!res.ok) {
                  toast.error("Couldn't delete that post. Try again.");
                  return;
                }
                toast.success("Post deleted");
                setGeneratedSuggestions((prev) =>
                  prev.filter((s) => s.id !== suggestion.id)
                );
              }
            }}
          />
        )}
      </div>

      {editingItem && (
        <EditSuggestionModal
          suggestion={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (updated) => {
            try {
              const res = await fetch(`/api/suggestions/${editingItem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
              });
              if (!res.ok) {
                toast.error("Couldn't save your changes. Try again.");
                return;
              }
              setGeneratedSuggestions((prev) =>
                prev.map((s) =>
                  s.id === editingItem.id
                    ? {
                        ...s,
                        content: updated.content,
                        mediaUrl: updated.mediaUrl ?? null,
                        mediaType: updated.mediaType ?? null,
                      }
                    : s
                )
              );
              setEditingItem(null);
            } catch {
              toast.error("Couldn't save your changes. Try again.");
            }
          }}
        />
      )}

      {!hasSubscription && accounts.length > 0 && (
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
