import AnimatedSection from "@/components/sections/AnimatedSection";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

const technologies = [
  {
    name: "OpenClaw",
    logo: "/images/openclaw/openclaw-seeklogo.svg",
    logoWidth: 48,
    label: "AI Agent Framework",
    stat: "140K+ GitHub Stars",
    description:
      "The most popular open-source AI agent framework. Battle-tested, community-driven, and the AI brain powering your social media manager.",
    url: "https://openclaw.ai/",
  },
  {
    name: "Zernio",
    logo: "/images/zernio/logo-primary.svg",
    logoWidth: 140,
    label: "Social Media API",
    stat: "13+ Platforms",
    description:
      "Unified social media API for publishing, scheduling, and account management across every major platform.",
    url: "https://zernio.com/?utm_source=postclaw",
  },
];

export default function PoweredBySection() {
  return (
    <section id="powered-by" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              Powered By
            </h2>
            <p className="text-center text-[#7a7f94] text-lg mb-16">
              Built on proven, open-source infrastructure trusted by thousands
              of developers.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {technologies.map((tech, index) => (
              <AnimatedSection key={tech.name} delay={index * 0.15}>
                <a
                  href={tech.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#151929] border border-[#1e2233] rounded-2xl p-8 h-full hover:border-[#e8614d]/20 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-12 flex items-center">
                      <Image
                        src={tech.logo}
                        alt={`${tech.name} logo`}
                        width={tech.logoWidth}
                        height={48}
                        className="h-12 w-auto"
                      />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-[#555a6b] group-hover:text-[#e8614d] transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-medium text-[#e8614d] bg-[#e8614d]/10 px-3 py-1 rounded-full">
                      {tech.label}
                    </span>
                    <span className="text-xs text-[#555a6b]">{tech.stat}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {tech.name}
                  </h3>
                  <p className="text-[#7a7f94] leading-relaxed text-[0.92rem]">
                    {tech.description}
                  </p>
                </a>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
