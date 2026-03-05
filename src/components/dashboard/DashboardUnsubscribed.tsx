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
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#e8614d]/10 mx-auto mb-4">
            <Rocket className="h-7 w-7 text-[#e8614d]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Launch your bot
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Subscribe to get your personal AI content manager. Create, adapt,
            and publish posts across all your social accounts from one Telegram
            chat.
          </p>
          <Button
            className="bg-[#e8614d] hover:bg-[#d4563f] text-white"
            onClick={() => setShowModal(true)}
          >
            <Rocket className="h-4 w-4 mr-1.5" />
            Launch my bot
          </Button>
        </div>
      </div>

      <SubscribeModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
