"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import SubscribeModal from "@/components/dashboard/SubscribeModal";

export default function BillingUnsubscribed() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Billing
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your subscription and billing details.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-center">
          <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            No active subscription
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Subscribe to get your personal AI social media manager.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-md bg-primary hover:bg-[#E84A36] text-white px-6 py-2.5 text-sm font-medium transition-colors cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            View plans
          </button>
        </div>
      </div>

      <SubscribeModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
