"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubscribeModal from "@/components/dashboard/SubscribeModal";

export default function DashboardUnsubscribed() {
  const [showModal, setShowModal] = useState(true);

  return (
    <>
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 max-w-md text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
            <Rocket className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Get your AI social media manager
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Subscribe to get your personal AI social media manager. It creates,
            adapts, and publishes posts across all your platforms from one chat.
          </p>
          <Button
            className="bg-primary hover:bg-[#E84A36] text-white"
            onClick={() => setShowModal(true)}
          >
            <Rocket className="h-4 w-4 mr-1.5" />
            Get started
          </Button>
        </div>
      </div>

      <SubscribeModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
