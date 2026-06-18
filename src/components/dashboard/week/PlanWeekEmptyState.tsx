"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";

/**
 * Empty-state card for the week timeline. Lets the user trigger an on-demand
 * autopilot fill ("plan the rest of this week") instead of waiting for the
 * scheduled run. `phase` selects the surface: "preparing" = the batch is
 * generating (or the parent is bridging to it) → loader; "failed" = the last
 * batch errored → retry CTA; "idle" = nothing scheduled yet → plan CTA.
 */
export function PlanWeekEmptyState({
  phase,
  onTriggered,
}: {
  phase: "preparing" | "failed" | "idle";
  onTriggered: () => void;
}) {
  const { usePost } = useApi();
  const { mutate, isPending } = usePost(appRouter.api.autopilotGenerateNow, {
    onSuccess: () => {
      toast.success("On it — planning the rest of your week.");
      onTriggered();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Couldn't start planning. Please try again.";
      toast.error(msg);
    },
  });

  if (phase === "preparing") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-tight text-gray-900">
          <SpinnerGapIcon className="h-4 w-4 animate-spin text-gray-400" />
          Preparing your week…
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-gray-500">
          Your posts are being planned and will appear here in a moment.
        </p>
      </div>
    );
  }

  const failed = phase === "failed";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold tracking-tight text-gray-900">
        {failed
          ? "We couldn't finish planning your week"
          : "Nothing scheduled yet"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-gray-500">
        {failed
          ? "Something went wrong last time. Give it another try."
          : "Your next 7 days of posts are planned for you automatically, every week."}
      </p>
      <button
        onClick={() => mutate({})}
        disabled={isPending}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
        style={{
          backgroundImage: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
        }}
      >
        {isPending ? (
          <>
            <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            Starting…
          </>
        ) : failed ? (
          "Try again"
        ) : (
          "Plan the rest of my week"
        )}
      </button>
      {!failed && (
        <p className="mx-auto mt-3 max-w-sm text-[12px] text-gray-400">
          Prefer to do it yourself?{" "}
          <Link
            href={appRouter.explore}
            className="font-medium text-gray-500 underline-offset-2 hover:underline"
          >
            Create a post
          </Link>
          .
        </p>
      )}
    </div>
  );
}
