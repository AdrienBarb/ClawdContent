"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import toast from "react-hot-toast";
import { ExternalLink } from "lucide-react";

interface TelegramTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function TelegramTokenModal({
  open,
  onOpenChange,
  onSuccess,
}: TelegramTokenModalProps) {
  const { usePost } = useApi();
  const [token, setToken] = useState("");

  const { mutate: saveToken, isPending } = usePost(appRouter.api.bot, {
    onSuccess: () => {
      setToken("");
      toast.success("Telegram connected! Your bot is restarting.");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error("Invalid token format. Please check and try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    saveToken({ token: token.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Telegram</DialogTitle>
          <DialogDescription>
            Create a Telegram bot and paste its token below to connect it.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
          <p>
            Follow our setup guide to create your Telegram bot and get your
            token:
          </p>
          <a
            href="https://docs.openclaw.ai/channels/telegram"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
          >
            Telegram setup guide
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram-token">Bot token</Label>
            <Input
              id="telegram-token"
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!token.trim() || isPending}
          >
            {isPending ? "Connecting..." : "Connect Telegram"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
