import AnimatedSection from "@/components/sections/AnimatedSection";
import { Github, Lock, Zap } from "lucide-react";

const stats = [
  { value: "13", label: "Platforms Supported" },
  { value: "140K+", label: "GitHub Stars" },
  { value: "< 2 min", label: "Setup Time" },
  { value: "24/7", label: "Always-On Bot" },
];

const trustPoints = [
  {
    icon: Github,
    title: "Open-Source & Transparent",
    description:
      "Built on battle-tested open-source technology with 140K+ GitHub stars. Public code, active community, proven reliability.",
  },
  {
    icon: Lock,
    title: "Your own isolated server",
    description:
      "Every user gets a private bot instance on a dedicated server. No shared infrastructure, no data leaks. Your content stays yours.",
  },
  {
    icon: Zap,
    title: "Set up in under 2 minutes",
    description:
      "Connect your accounts and start publishing. No complex configuration, no onboarding calls.",
  },
];

export default function SocialProofSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center bg-[#151929] border border-[#1e2233] rounded-2xl p-6"
                >
                  <div className="text-3xl md:text-4xl font-bold text-[#e8614d] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#7a7f94] font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-14 text-white">
              Why You Can Trust PostClaw
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trustPoints.map((point, index) => (
              <AnimatedSection key={point.title} delay={index * 0.12}>
                <div className="bg-[#151929] border border-[#1e2233] rounded-2xl p-8 h-full flex flex-col hover:border-[#e8614d]/20 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8614d]/10 mb-5">
                    <point.icon className="h-5 w-5 text-[#e8614d]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {point.title}
                  </h3>
                  <p className="text-[#7a7f94] leading-relaxed text-[0.92rem] flex-1">
                    {point.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
