import { UserPlus, MessageSquare, Send } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Connect your accounts",
    description:
      "Sign up, link your social platforms from the dashboard. Takes less than 2 minutes.",
  },
  {
    icon: MessageSquare,
    step: "2",
    title: "Talk to your AI social media manager",
    description:
      '"Write about our product launch." "Plan my content for next week." "Make a thread about what I learned this month." Plain language, nothing to learn.',
  },
  {
    icon: Send,
    step: "3",
    title: "It writes, adapts, and publishes",
    description:
      "Your AI social media manager rewrites the content for each platform\u2019s tone and format, schedules it at the right time, and publishes everywhere. You\u2019re done.",
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
            Three steps. No learning curve. No dashboard to figure out.
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
