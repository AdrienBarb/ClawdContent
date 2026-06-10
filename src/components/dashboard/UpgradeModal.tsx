"use client";

import { XIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanName: string;
  accountLimit: number;
}

// Single plan, single interval — there is no higher tier to upgrade to.
// Hitting the account cap is a hard product limit: the only way forward is
// disconnecting an account the user no longer needs.
export default function UpgradeModal({
  open,
  onOpenChange,
  currentPlanName,
  accountLimit,
}: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-auto max-w-md w-full px-4">
        <div className="relative p-8 rounded-2xl border border-border bg-card shadow-xl text-center">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <XIcon className="h-5 w-5" weight="bold" />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
            <UsersThreeIcon className="h-7 w-7 text-primary" />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            Account limit reached
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            You&apos;ve connected the maximum of {accountLimit} social accounts
            included in the {currentPlanName} plan. Disconnect an account you
            no longer use to connect a new one.
          </p>

          <Button
            className="w-full bg-primary hover:bg-[#E84A36] text-white h-12"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
