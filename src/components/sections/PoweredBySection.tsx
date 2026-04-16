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
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Powered By
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-16">
            Built on proven, open-source infrastructure trusted by thousands
            of developers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {technologies.map((tech, index) => (
              <a
                  href={tech.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-card border border-border rounded-2xl p-8 h-full hover:border-primary/30 transition-colors group shadow-sm"
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
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {tech.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{tech.stat}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {tech.name}
                  </h3>
                  <p className="text-secondary-foreground leading-relaxed text-[0.92rem]">
                    {tech.description}
                  </p>
                </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
