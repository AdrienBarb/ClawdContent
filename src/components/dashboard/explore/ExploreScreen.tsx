"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  SpinnerGapIcon,
  SparkleIcon,
  PaperPlaneTiltIcon,
  PlugsIcon,
} from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { GeneratedPostCard } from "./GeneratedPostCard";
import { jsonFetch } from "@/components/dashboard/week/datetime";
import type { ComposePostResponse } from "@/lib/schemas/composePost";

type Phase = "idle" | "generating";

export default function ExploreScreen() {
  const qc = useQueryClient();
  const { data: status, isLoading } = useDashboardStatus();
  const activeAccounts = useMemo(
    () => (status?.accounts ?? []).filter((a) => a.status === "active"),
    [status?.accounts]
  );

  const [accountId, setAccountId] = useState("");
  const [input, setInput] = useState("");
  const [post, setPost] = useState<ComposePostResponse | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  // Default to the first active account; keep the selection valid if the list
  // changes (e.g. an account disconnects).
  useEffect(() => {
    if (activeAccounts.length === 0) return;
    if (!activeAccounts.some((a) => a.id === accountId)) {
      setAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, accountId]);

  const generate = async () => {
    const brief = input.trim();
    if (!brief || !accountId || phase === "generating") return;
    setPhase("generating");
    setPost(null); // one card at a time — a new brief replaces the current post
    setInput(""); // clear immediately on send; restored below if generation fails
    try {
      const r = await jsonFetch(appRouter.api.exploreGenerate, {
        method: "POST",
        body: JSON.stringify({ accountId, brief }),
      });
      if (!r.ok) {
        const body = r.body as { message?: string } | null;
        toast.error(body?.message ?? "Couldn't create your post. Try again.");
        setInput(brief);
        return;
      }
      const body = r.body as { post: ComposePostResponse };
      setPost(body.post);
    } catch {
      toast.error("Couldn't create your post. Try again.");
      setInput(brief);
    } finally {
      setPhase("idle");
    }
  };

  const onCommitted = (action: "published" | "scheduled") => {
    setPost(null);
    toast.success(action === "scheduled" ? "Scheduled." : "Posting now.");
    // The committed post now lives on the week timeline / results.
    qc.invalidateQueries({ queryKey: ["get"] });
    qc.invalidateQueries({ queryKey: ["dashboardStatus"] });
  };

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="flex justify-center py-24">
        <SpinnerGapIcon className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  } else if (activeAccounts.length === 0) {
    body = <EmptyState />;
  } else {
    body = (
      <div className="flex flex-col gap-6">
        {phase === "generating" ? (
          <GeneratingCard />
        ) : post ? (
          <GeneratedPostCard post={post} onCommitted={onCommitted} />
        ) : (
          <Hero />
        )}

        <Composer
          accountId={accountId}
          input={input}
          onInputChange={setInput}
          onSend={generate}
          busy={phase === "generating"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 min-w-0">
      <DashboardTabs />
      {body}
    </div>
  );
}

function Composer({
  accountId,
  input,
  onInputChange,
  onSend,
  busy,
}: {
  accountId: string;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const canSend = !busy && accountId !== "" && input.trim().length > 0;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
      className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-[#e8614d] focus-within:ring-2 focus-within:ring-[#e8614d]/15"
    >
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          rows={3}
          maxLength={4000}
          placeholder="Tell us what to post about…"
          className="max-h-60 min-h-[88px] w-full resize-none bg-transparent px-4 pt-3 pb-12 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="absolute bottom-3 right-3">
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-5 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "#e8614d" }}
          >
            {busy ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PaperPlaneTiltIcon className="h-4 w-4" weight="fill" />
            )}
            <span>Send</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function Hero() {
  return (
    <div className="mx-auto max-w-xl pt-6 pb-2 text-center">
      <span
        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#f3f4f6" }}
      >
        <SparkleIcon
          className="h-6 w-6"
          weight="fill"
          style={{ color: "#6b7280" }}
        />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
        What should we post about?
      </h1>
      <p className="mt-3 text-base leading-relaxed text-gray-500">
        Describe what you want — we write the caption and design the visual. Then
        post it now or schedule it.
      </p>
    </div>
  );
}

function GeneratingCard() {
  return (
    <div className="mx-auto w-full max-w-[470px] overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="h-8 w-8 rounded-full bg-gray-100" />
        <span className="h-3 w-24 rounded bg-gray-100" />
      </div>
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <SpinnerGapIcon className="h-6 w-6 animate-spin" />
          <span className="text-[12px]">Creating your post…</span>
        </div>
      </div>
      <div className="space-y-2 px-3 py-3">
        <div className="h-2.5 w-3/4 rounded bg-gray-100" />
        <div className="h-2.5 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
        <PlugsIcon className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold tracking-tight text-gray-900">
        Connect an account to start creating
      </p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-gray-500">
        Once an Instagram account is connected, you can create posts
        here whenever you want — your weekly plan keeps running either way.
      </p>
      <Link
        href={appRouter.accounts}
        className="mt-5 inline-flex items-center justify-center rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
        style={{ background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)" }}
      >
        Connect an account
      </Link>
    </div>
  );
}
