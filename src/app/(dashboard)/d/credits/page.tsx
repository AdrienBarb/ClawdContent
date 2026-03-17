"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Plus, Minus, CheckCircle } from "lucide-react";

export default function CreditsPage() {
  const { useGet, usePost } = useApi();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("payment") === "success";

  const { data: credits, isLoading } = useGet(appRouter.api.credits);
  const { data: dashboardStatus } = useGet(appRouter.api.dashboardStatus);

  const [quantity, setQuantity] = useState(5);

  const { mutate: buyCredits, isPending: buying } = usePost(
    appRouter.api.creditsCheckout,
    {
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url;
      },
    }
  );

  const planCredits = credits?.planCredits ?? 0;
  const topUpCredits = credits?.topUpCredits ?? 0;
  const total = credits?.total ?? 0;

  const planId = dashboardStatus?.subscription?.planId;
  const planAllowance =
    planId === "business" ? 20 : planId === "pro" ? 10 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Image Credits
        </h1>
        <p className="text-gray-500 mt-1">
          Generate AI images directly in your chat. Each generation costs 1
          credit.
        </p>
      </div>

      {paymentSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">
            Credits purchased successfully!
          </p>
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#e8614d]" />
          Your Balance
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Plan credits</span>
              <span className="text-sm font-medium text-gray-900">
                {planCredits}
                {planAllowance > 0 && (
                  <span className="text-gray-400"> / {planAllowance}</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Top-up credits</span>
              <span className="text-sm font-medium text-gray-900">
                {topUpCredits}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-semibold text-gray-900">
                Total available
              </span>
              <span className="text-lg font-bold text-[#e8614d]">{total}</span>
            </div>
          </div>
        )}

        {planAllowance > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Plan credits reset monthly. Top-up credits never expire.
          </p>
        )}
      </div>

      {/* Purchase card */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Buy More Credits
        </h2>

        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="h-10 w-10 rounded-xl cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{quantity}</div>
            <div className="text-xs text-gray-500">
              credit{quantity > 1 ? "s" : ""}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            disabled={quantity >= 50}
            className="h-10 w-10 rounded-xl cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-2xl font-bold text-gray-900">
            ${quantity}
          </span>
          <span className="text-sm text-gray-500">
            ($1.00/credit)
          </span>
        </div>

        <Button
          onClick={() => buyCredits({ quantity })}
          disabled={buying}
          className="w-full bg-[#e8614d] hover:bg-[#d4563f] text-white cursor-pointer disabled:cursor-not-allowed"
        >
          {buying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting...
            </span>
          ) : (
            "Buy Credits"
          )}
        </Button>

        <p className="text-xs text-gray-400 mt-3 text-center">
          One-time payment. Credits never expire.
        </p>
      </div>
    </div>
  );
}
