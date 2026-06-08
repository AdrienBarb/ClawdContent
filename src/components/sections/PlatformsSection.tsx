import { SiInstagram, SiFacebook } from "react-icons/si";
import type { ComponentType, SVGProps } from "react";

type Platform = {
  name: string;
  c: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  blurb: string;
};

const platforms: Platform[] = [
  {
    name: "Instagram",
    c: "#E4405F",
    Icon: SiInstagram,
    blurb:
      "Scroll-stopping captions, the right hashtags, and posts shaped for the feed, Reels, and Stories.",
  },
  {
    name: "Facebook",
    c: "#0866FF",
    Icon: SiFacebook,
    blurb:
      "Warmer, shareable posts that reach your local customers and keep your Page active without you.",
  },
];

export default function PlatformsSection() {
  return (
    <section className="bg-[#0f1029] px-6 py-24 text-white md:px-14 md:py-28">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-14 text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#f8a594]">
            Built for Instagram &amp; Facebook
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-balance md:text-5xl lg:text-6xl">
            Your Instagram and Facebook,{" "}
            <em className="italic text-[#ec6f5b]">handled.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-base leading-[1.55] text-[#b9bdd6] md:text-[17px]">
            This is where your customers actually scroll — so this is where
            PostClaw works hardest. Every post is written for the platform
            it&apos;s going to.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {platforms.map(({ name, c, Icon, blurb }) => (
            <div
              key={name}
              className="rounded-2xl border border-[#2a2d52] bg-[#191b3a] p-7"
            >
              <div className="mb-4 flex items-center gap-3.5">
                <div
                  className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[12px] text-white"
                  style={{ background: c }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="text-lg font-semibold text-white">{name}</div>
              </div>
              <p className="text-[15px] leading-[1.55] text-[#b9bdd6]">{blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
