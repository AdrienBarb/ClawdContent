"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";
import { signOut } from "@/lib/better-auth/auth-client";
import { Button } from "@/components/ui/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";

export default function FrozenAccountGate({
  status,
}: {
  status: "past_due" | "canceled";
}) {
  const { usePost } = useApi();
  const [opening, setOpening] = useState(false);

  const { mutate: startCheckout } = usePost(appRouter.api.checkout, {
    onSuccess: (data: { url: string }) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Couldn't open checkout. Please try again.");
        setOpening(false);
      }
    },
    onError: () => {
      toast.error("Couldn't open checkout. Please try again.");
      setOpening(false);
    },
  });

  const handleReactivate = () => {
    setOpening(true);
    startCheckout({ planId: "pro", interval: "monthly", intent: "billing" });
  };

  const headline =
    status === "past_due"
      ? "Your subscription needs attention"
      : "Reactivate your subscription";
  const body =
    status === "past_due"
      ? "Your last payment didn't go through. Update your card to get PostClaw posting again."
      : "Your subscription has ended. Pick it back up to keep PostClaw posting for you.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f5] px-6 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="PostClaw"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-2xl"
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {headline}
          </h1>
          <p className="text-[14px] text-gray-600 leading-relaxed">{body}</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={handleReactivate}
            disabled={opening}
            className="w-full bg-gradient-to-b from-[#ec6f5b] to-[#c84a35] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),_0_1px_2px_rgba(200,74,53,0.25)] hover:opacity-95"
          >
            {opening ? (
              <>
                <SpinnerGapIcon className="h-4 w-4 animate-spin" />
                Opening checkout…
              </>
            ) : (
              "Reactivate"
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              signOut().then(() => {
                window.location.href = "/";
              });
            }}
            className="text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
