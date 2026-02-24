"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import config from "@/lib/config";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";

export default function SubscribeCard() {
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

  return (
    <div className="mx-auto max-w-lg w-full">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Subscribe to get started
        </h1>
        <p className="text-muted-foreground">
          One plan. Everything included.
        </p>
      </div>
      <div className="p-8 rounded-xl border bg-card shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-semibold">{plan.price}</span>
            <span className="text-muted-foreground">{plan.period}</span>
          </div>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>
        <ul className="space-y-3 mb-8">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          onClick={handleSubscribe}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Subscribe"}
        </Button>
      </div>
    </div>
  );
}
