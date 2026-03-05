"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useState } from "react";
import config from "@/lib/config";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubscribeModal({
  open,
  onOpenChange,
}: SubscribeModalProps) {
  const { usePost } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: createCheckout } = usePost(appRouter.api.checkout, {
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onSettled: () => setIsLoading(false),
  });

  const plan = config.pricing.plan;

  const handleSubscribe = () => {
    setIsLoading(true);
    createCheckout({});
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="mx-auto max-w-lg w-full px-4">
        <div className="relative p-8 rounded-2xl border border-[#1e2233] bg-[#151929] shadow-xl">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-[#7a7f94] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
              Get started with PostClaw
            </h1>
            <p className="text-[#7a7f94]">$29/mo. Cancel anytime.</p>
          </div>
          <div className="mb-6">
            <span className="inline-block bg-[#e8614d]/10 text-[#e8614d] text-xs font-semibold px-3 py-1 rounded-full mb-4">
              All-inclusive
            </span>
            <h3 className="text-xl font-semibold mb-2 text-white">
              {plan.name}
            </h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-semibold text-[#555a6b] line-through">
                $49
              </span>
              <span className="text-4xl font-semibold text-[#e8614d]">
                {plan.price}
              </span>
              <span className="text-[#7a7f94]">{plan.period}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 text-sm">🎁</span>
              <span className="text-green-400 text-sm font-medium">
                $20 off for early customers (12 left)
              </span>
            </div>
            <p className="text-sm text-[#7a7f94]">{plan.description}</p>
          </div>
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#e8614d] mt-0.5 shrink-0" />
                <span className="text-sm text-[#c0c4d0]">{feature}</span>
              </li>
            ))}
          </ul>
          <Button
            className="w-full bg-[#e8614d] hover:bg-[#d4563f] text-white"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Get Started"}
          </Button>
        </div>
      </div>
    </div>
  );
}
