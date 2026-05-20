"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedPlatforms: string[];
  onAccountConnected: () => void;
}

export default function AddAccountModal({
  open,
  onOpenChange,
  connectedPlatforms,
  onAccountConnected,
}: AddAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect an account</DialogTitle>
          <DialogDescription>
            Pick a platform to connect. We&apos;ll open the sign-in window for
            you.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <ConnectAccountButtons
            connectedPlatforms={connectedPlatforms}
            onAccountConnected={onAccountConnected}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
