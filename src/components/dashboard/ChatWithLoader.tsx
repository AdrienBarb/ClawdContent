"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatInterface from "@/components/dashboard/ChatInterface";

declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
    rdt?: (...args: unknown[]) => void;
  }
}

export default function ChatWithLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Conversion tracking on successful payment
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      window.twq?.("event", "tw-r799m-r799n", {});
      window.rdt?.("track", "Purchase");
      router.replace("/d", { scroll: false });
    }
  }, [searchParams, router]);

  return <ChatInterface />;
}
