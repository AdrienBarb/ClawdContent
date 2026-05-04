"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";

interface HeroSectionProps {
  variant?: string;
}

const people = [
  { src: "/images/reassurance/kaya.jpeg", name: "Kaya", linkedin: "https://www.linkedin.com/in/kayayurieff/" },
  { src: "/images/reassurance/jorje.jpeg", name: "Jorge", linkedin: "https://www.linkedin.com/in/jorge-zuloaga/" },
  { src: "/images/reassurance/Sheryl.jpeg", name: "Sheryl", linkedin: "https://www.linkedin.com/in/sheryl-sandberg-5126652/" },
  { src: "/images/reassurance/abhilaksh.jpeg", name: "Abhilaksh", linkedin: "https://www.linkedin.com/in/abhilaksh-sharma-39821696/" },
  { src: "/images/reassurance/sawyer.jpeg", name: "Sawyer", linkedin: "https://www.linkedin.com/in/sawyer-hemsley-6b9449111/" },
];

const stats: [string, string][] = [
  ["48,200", "posts published"],
  ["1,472", "businesses on board"],
  ["2 min", "average setup"],
  ["40×", "cheaper than a $2,000 agency"],
];

export default function HeroSection({ variant = "control" }: HeroSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  void variant;

  const handleGetStarted = () => {
    if (session?.user) {
      router.push(appRouter.dashboard);
      return;
    }
    setIsSignInModalOpen(true);
  };

  return (
    <section className="hero-landing-glow relative overflow-hidden bg-[#0f1029] text-white">
      <div className="relative z-10 mx-auto max-w-[1100px] px-6 pb-32 pt-20 text-center md:px-14 md:pb-36 md:pt-28">
        <div className="flex flex-col items-center">
          <div className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-[#ec6f5b55] bg-[#ec6f5b22] px-3.5 py-1.5 text-xs text-[#f8a594]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ec6f5b]" />
            Tell it. It posts it. That&apos;s it.
          </div>

          <h1 className="font-display text-5xl leading-[0.96] tracking-[-0.03em] text-balance md:text-7xl lg:text-[112px]">
            Plan a month of posts
            <br />
            in <em className="italic text-[#ec6f5b]">5 minutes</em>.
          </h1>

          <p className="mt-9 max-w-[620px] text-base leading-[1.55] text-[#b9bdd6] md:text-xl">
            Text PostClaw what&apos;s happening. It writes, schedules, and posts for you, every week.
          </p>

          <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={handleGetStarted}
              className="cursor-pointer rounded-full bg-[#ec6f5b] px-8 py-4 text-sm font-semibold text-white shadow-[0_14px_40px_-10px_#ec6f5b] transition-transform hover:-translate-y-0.5"
            >
              Get my 5 free posts →
            </button>
            <a
              href="#demo"
              className="rounded-full border border-[#2a2d52] bg-transparent px-6 py-4 text-sm font-medium text-white transition-colors hover:border-[#3a3d62]"
            >
              ▶ Watch 60-sec demo
            </a>
          </div>

          <div className="mt-9 flex items-center justify-center gap-3.5 text-xs text-[#7a7fa0] md:text-sm">
            <div className="flex">
              {people.map((person, i) => (
                <a
                  key={person.name}
                  href={person.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={person.name}
                  className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#0f1029] transition-transform hover:z-10 hover:scale-110"
                  style={{ marginLeft: i === 0 ? 0 : -10 }}
                >
                  <Image
                    src={person.src}
                    alt={person.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-cover"
                  />
                </a>
              ))}
            </div>
            <span>
              <strong className="font-semibold text-white">1472 business owners</strong>
            </span>
          </div>

          <div className="mt-20 grid w-full max-w-[1100px] grid-cols-2 gap-8 border-t border-[#2a2d52] pt-12 md:grid-cols-4">
            {stats.map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-medium leading-none tracking-[-0.02em] text-white md:text-4xl">{n}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-[#7a7fa0]">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SignInModal open={isSignInModalOpen} onOpenChange={setIsSignInModalOpen} />
    </section>
  );
}
