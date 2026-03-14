"use client";

import { X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanName: string;
  accountLimit: number;
}

export default function UpgradeModal({
  open,
  onOpenChange,
  currentPlanName,
  accountLimit,
}: UpgradeModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="mx-auto max-w-md w-full px-4">
        <div className="relative p-8 rounded-2xl border border-[#1e2233] bg-[#151929] shadow-xl text-center">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-[#7a7f94] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#e8614d]/10 mx-auto mb-4">
            <ArrowUpRight className="h-7 w-7 text-[#e8614d]" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">
            Upgrade your plan
          </h2>
          <p className="text-[#7a7f94] text-sm mb-6">
            You&apos;ve reached the limit of {accountLimit} social accounts on
            the {currentPlanName} plan. Upgrade to connect more accounts.
          </p>

          <Button
            className="w-full bg-[#e8614d] hover:bg-[#d4563f] text-white h-12"
            onClick={() => {
              onOpenChange(false);
              router.push(appRouter.billing);
            }}
          >
            View plans
          </Button>

          <button
            onClick={() => onOpenChange(false)}
            className="mt-3 text-sm text-[#7a7f94] hover:text-white transition-colors cursor-pointer"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
