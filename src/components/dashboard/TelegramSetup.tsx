"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import useApi from "@/lib/hooks/useApi";
import { MessageCircle, ExternalLink, ArrowRight } from "lucide-react";

export default function TelegramSetup() {
  const router = useRouter();
  const { usePost } = useApi();
  const [token, setToken] = useState("");

  const { mutate: saveToken, isPending } = usePost("/api/user/telegram-token", {
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleSubmit = () => {
    if (!token.trim()) return;
    saveToken({ token: token.trim() });
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#26A5E4]/10 mx-auto mb-4">
            <MessageCircle className="h-7 w-7 text-[#26A5E4]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Connect your Telegram bot
          </h1>
          <p className="text-gray-500 mt-2">
            PostClaw works through Telegram. Create a bot and paste its token
            below.
          </p>
        </div>

        {/* Instructions */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 mb-6">
          <p className="text-sm font-medium text-gray-900 mb-3">
            How to create your bot:
          </p>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8614d] text-white text-xs font-semibold mt-0.5">
                1
              </span>
              <span>
                Open{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#26A5E4] font-medium hover:underline inline-flex items-center gap-1"
                >
                  @BotFather on Telegram
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8614d] text-white text-xs font-semibold mt-0.5">
                2
              </span>
              <span>
                Send{" "}
                <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                  /newbot
                </code>{" "}
                and follow the steps
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8614d] text-white text-xs font-semibold mt-0.5">
                3
              </span>
              <span>Copy the token and paste it below</span>
            </li>
          </ol>
        </div>

        {/* Token input */}
        <div className="space-y-2 mb-2">
          <label
            htmlFor="telegram-token"
            className="block text-sm font-medium text-gray-700"
          >
            Bot token
          </label>
          <input
            id="telegram-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#e8614d] focus:outline-none focus:ring-1 focus:ring-[#e8614d] font-mono"
            autoFocus
          />
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            className="bg-[#e8614d] hover:bg-[#d4563f] text-white"
            disabled={!token.trim() || isPending}
          >
            {isPending ? "Saving..." : "Continue"}
            {!isPending && <ArrowRight className="h-4 w-4 ml-1.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
