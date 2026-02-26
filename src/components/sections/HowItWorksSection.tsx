import AnimatedSection from "@/components/sections/AnimatedSection";
import { UserPlus, MessageSquare, Send } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Connect your accounts",
    description:
      "Sign up, link your social platforms from the dashboard, and set up your Telegram bot. Takes less than 2 minutes.",
  },
  {
    icon: MessageSquare,
    step: "2",
    title: "Chat with your bot",
    description:
      'Open Telegram and tell your bot what to post. "Write about our product launch" — plain language, nothing to learn.',
  },
  {
    icon: Send,
    step: "3",
    title: "It writes, adapts, and publishes",
    description:
      "Your bot rewrites the content for each platform\u2019s tone and format, then publishes everywhere. You\u2019re done.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              How It Works
            </h2>
            <p className="text-center text-[#7a7f94] mb-16 text-lg">
              Three steps. No learning curve.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item, index) => (
              <AnimatedSection key={item.step} delay={index * 0.15}>
                <div className="bg-[#151929] border border-[#1e2233] rounded-2xl p-8 h-full hover:border-[#e8614d]/20 transition-colors">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8614d]/10">
                      <item.icon className="h-5 w-5 text-[#e8614d]" />
                    </div>
                    <span className="text-[#555a6b] font-mono text-sm">
                      Step {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">
                    {item.title}
                  </h3>
                  <p className="text-[#7a7f94] leading-relaxed text-[0.95rem]">
                    {item.description}
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
