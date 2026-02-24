import { ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/sections/AnimatedSection";

const platforms = [
  "Instagram & TikTok",
  "X, LinkedIn & Facebook",
  "YouTube & Pinterest",
  "Threads & Bluesky",
  "Reddit, Telegram & Discord",
  "Mastodon",
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="rounded-[2rem] border border-[#1e2233] bg-[#111320] p-10 md:p-16">
              <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
                What Will You
                <br />
                Publish Today?
              </h2>
              <p className="text-center text-[#7a7f94] mb-12 text-lg">
                13 platforms. One conversation.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {platforms.map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between bg-[#151929] border border-[#1e2233] rounded-2xl px-6 py-5 text-[#e8e9f0] font-medium text-[0.95rem] hover:border-[#e8614d]/30 transition-colors"
                  >
                    <span>{platform}</span>
                    <ArrowRight className="h-4 w-4 text-[#e8614d]" />
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
