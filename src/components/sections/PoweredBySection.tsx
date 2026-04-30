import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function PoweredBySection() {
  return (
    <section
      id="powered-by"
      className="bg-[#0f1029] px-6 py-24 text-white md:px-14 md:py-32"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-14 text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#f8a594]">
            Partnership
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-balance md:text-5xl lg:text-[64px]">
            Built on the rails of{" "}
            <em className="italic text-[#ec6f5b]">Zernio.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-base leading-[1.55] text-[#b9bdd6] md:text-[17px]">
            Every post you approve goes out through Zernio&apos;s social media
            API. Proven infrastructure across every major platform.
          </p>
        </div>

        <div className="mx-auto max-w-[520px]">
          <a
            href="https://zernio.com/?utm_source=postclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-3xl border border-[#2a2d52] bg-[#191b3a] p-8 transition-colors hover:border-[#ec6f5b]/60"
          >
            <div className="mb-6 flex items-center justify-between">
              <Image
                src="/images/zernio/logo-primary.svg"
                alt="Zernio"
                width={140}
                height={48}
                className="h-12 w-auto brightness-0 invert"
              />
              <ArrowUpRight className="h-5 w-5 text-[#7a7fa0] transition-colors group-hover:text-[#ec6f5b]" />
            </div>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full bg-[#ec6f5b]/15 px-3 py-1 text-xs font-medium text-[#f8a594]">
                Social media API
              </span>
              <span className="text-xs text-[#7a7fa0]">9 platforms</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold tracking-[-0.015em] text-white md:text-2xl">
              Zernio
            </h3>
            <p className="text-[15px] leading-[1.6] text-[#b9bdd6]">
              Unified API for publishing, scheduling, and analytics across every
              major social platform.
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}
