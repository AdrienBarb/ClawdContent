import {
  SiInstagram,
  SiFacebook,
  SiTiktok,
  SiX,
  SiYoutube,
  SiPinterest,
  SiThreads,
  SiBluesky,
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import type { ComponentType, SVGProps } from "react";

type Platform = {
  name: string;
  c: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const platforms: Platform[] = [
  { name: "Instagram", c: "#E4405F", Icon: SiInstagram },
  { name: "Facebook", c: "#1877F2", Icon: SiFacebook },
  { name: "TikTok", c: "#000000", Icon: SiTiktok },
  { name: "LinkedIn", c: "#0A66C2", Icon: FaLinkedinIn },
  { name: "X / Twitter", c: "#000000", Icon: SiX },
  { name: "YouTube", c: "#FF0000", Icon: SiYoutube },
  { name: "Pinterest", c: "#E60023", Icon: SiPinterest },
  { name: "Threads", c: "#000000", Icon: SiThreads },
  { name: "Bluesky", c: "#0085FF", Icon: SiBluesky },
];

export default function PlatformsSection() {
  return (
    <section className="bg-[#0f1029] px-6 py-24 text-white md:px-14 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-14 text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#f8a594]">
            Posts to nine platforms
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-balance md:text-5xl lg:text-6xl">
            Wherever your customers{" "}
            <em className="italic text-[#ec6f5b]">already are.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-base leading-[1.55] text-[#b9bdd6] md:text-[17px]">
            Pick the platforms you actually use. Each post is rewritten for the room. Short and snappy on X, visual on Instagram, professional on LinkedIn.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map(({ name, c, Icon }) => (
            <div
              key={name}
              className="flex items-center gap-3.5 rounded-2xl border border-[#2a2d52] bg-[#191b3a] px-6 py-5"
            >
              <div
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] text-white"
                style={{ background: c }}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="text-[15px] font-medium text-white">{name}</div>
              <div className="ml-auto text-sm text-[#ec6f5b]">✓</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
