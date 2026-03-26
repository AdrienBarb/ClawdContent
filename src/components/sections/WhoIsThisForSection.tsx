import AnimatedSection from "@/components/sections/AnimatedSection";
import { Rocket, Users, Palette } from "lucide-react";

const personas = [
  {
    icon: Rocket,
    title: "Solo Founders & Indie Hackers",
    description:
      "You're shipping features, closing deals, and talking to users. Writing 5 platform-native posts a day is a full-time job you didn't sign up for — and can't afford to hire for. PostClaw is the social media manager that fits your budget and your bandwidth.",
  },
  {
    icon: Users,
    title: "Small Teams & Startups",
    description:
      "Your team has 3 people and none of them is a social media manager. You don't need to hire one. PostClaw plans your content calendar, writes every post, adapts for each platform, and publishes on schedule — while your team builds the product.",
  },
  {
    icon: Palette,
    title: "Creators Who'd Rather Create",
    description:
      "You have ideas, not time. PostClaw turns one idea into 13 platform-ready posts, remembers your style, and handles publishing. You focus on the work that actually matters to you.",
  },
];

export default function WhoIsThisForSection() {
  return (
    <section id="who-is-this-for" className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white leading-tight">
              Built for people who have a business to run
              <br />
              — not a feed to manage.
            </h2>
            <p className="text-center text-[#7a7f94] text-lg mb-16">
              &nbsp;
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {personas.map((persona, index) => (
              <AnimatedSection key={persona.title} delay={index * 0.15}>
                <div className="bg-[#151929] border border-[#1e2233] rounded-2xl p-8 h-full hover:border-[#e8614d]/20 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8614d]/10 mb-5">
                    <persona.icon className="h-5 w-5 text-[#e8614d]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">
                    {persona.title}
                  </h3>
                  <p className="text-[#7a7f94] leading-relaxed text-[0.95rem]">
                    {persona.description}
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
