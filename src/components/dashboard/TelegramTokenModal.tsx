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

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-3">
          <p>
            Message @BotFather on Telegram, send /newbot, and follow the steps
            to create your bot and copy its token.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
            >
              Open @BotFather &rarr;
            </a>
            <a
              href="https://docs.openclaw.ai/channels/telegram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              Setup guide
            </a>
          </div>
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
