import { UserPlus, Sparkles, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Connect your accounts",
    description:
      "Link your Instagram, Facebook, or whichever platforms your customers use. Takes 2 minutes.",
  },
  {
    icon: Sparkles,
    step: "2",
    title: "It suggests, you approve",
    description:
      "Your AI manager creates ready-to-publish posts based on your business. Review them, tweak if you want, or approve as-is.",
  },
  {
    icon: CheckCircle,
    step: "3",
    title: "It publishes. You're done.",
    description:
      "Posts go out at the best time, adapted for each platform. Your social media runs itself while you focus on your business.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            How It Works
          </h2>
          <p className="text-center text-secondary-foreground mb-16 text-lg">
            From signup to your first post in under 5 minutes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item, index) => (
              <div key={item.step} className="bg-card border border-border rounded-2xl p-8 h-full hover:border-primary/30 transition-colors shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground font-mono text-sm">
                    Step {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {item.title}
                </h3>
                <p className="text-secondary-foreground leading-relaxed text-[0.95rem]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
