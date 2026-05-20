"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { appRouter } from "@/lib/constants/appRouter";

interface Props {
  accountId: string;
  autopublish: boolean;
  hasScheduledPosts: boolean;
  onChanged: () => void;
}

export default function AutopublishToggle({
  accountId,
  autopublish,
  hasScheduledPosts,
  onChanged,
}: Props) {
  const [pending, setPending] = useState(false);

  async function flip() {
    const next = !autopublish;

    if (!next && hasScheduledPosts) {
      const ok = window.confirm(
        "You already have posts scheduled this week. They'll still go out — only future posts will need approval. Continue?"
      );
      if (!ok) return;
    }

    setPending(true);
    try {
      await axios.patch(appRouter.api.account(accountId), {
        autopublish: next,
      });
      toast.success(
        next
          ? "Switched to autopublish."
          : "Switched to approval mode — new posts will wait for you."
      );
      onChanged();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Couldn't save that. Try again.";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-gray-900">
          {autopublish ? "Autopublish" : "Approval required"}
        </p>
        <p className="text-[11px] text-gray-500">
          {autopublish
            ? "Posts go live without you."
            : "We wait for your tap."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={autopublish}
        aria-label="Toggle autopublish"
        disabled={pending}
        onClick={flip}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          autopublish ? "bg-[#ec6f5b]" : "bg-gray-300"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            autopublish ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
