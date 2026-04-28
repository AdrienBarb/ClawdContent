"use client";

import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";

export default function FinalCTASection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleGetStarted = () => {
    if (session?.user) {
      router.push(appRouter.dashboard);
      return;
    }
    setIsSignInModalOpen(true);
  };

  return (
    <section className="relative overflow-hidden bg-[#f5f0ea] px-6 pb-24 pt-32 md:px-14 md:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[20%] -translate-x-1/2 rounded-full"
        style={{
          width: 900,
          height: 600,
          background:
            "radial-gradient(circle, rgba(236,111,91,0.18) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />
      <div className="relative mx-auto max-w-[900px] text-center">
        <h2 className="font-display text-4xl leading-[0.95] tracking-[-0.03em] text-[#0f1437] text-balance md:text-6xl lg:text-[96px]">
          Every day you&apos;re not posting,{" "}
          <em className="italic text-[#ec6f5b]">your competitors are.</em>
        </h2>
        <p className="mx-auto mt-8 mb-10 max-w-[540px] text-base leading-[1.55] text-[#4a5073] md:text-[19px]">
          Setup takes two minutes. Your first drafts arrive before lunch.
        </p>
        <button
          onClick={handleGetStarted}
          className="cursor-pointer rounded-full bg-[#ec6f5b] px-9 py-5 text-base font-semibold text-white shadow-[0_14px_40px_-10px_#ec6f5b] transition-transform hover:-translate-y-0.5"
        >
          Get my 5 free posts →
        </button>
        <p className="mt-5 text-[13px] text-[#7e8298]">
          5 free posts. No credit card. $49/mo after.
        </p>
      </div>
      <SignInModal open={isSignInModalOpen} onOpenChange={setIsSignInModalOpen} />
    </section>
  );
}
