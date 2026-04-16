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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-auto max-w-md w-full px-4">
        <div className="relative p-8 rounded-2xl border border-border bg-card shadow-xl text-center">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
            <ArrowUpRight className="h-7 w-7 text-primary" />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            Upgrade your plan
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            You&apos;ve reached the limit of {accountLimit} social accounts on
            the {currentPlanName} plan. Upgrade to connect more accounts.
          </p>

          <Button
            className="w-full bg-primary hover:bg-[#E84A36] text-white h-12"
            onClick={() => {
              onOpenChange(false);
              router.push(appRouter.billing);
            }}
          >
            View plans
          </Button>

          <button
            onClick={() => onOpenChange(false)}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
