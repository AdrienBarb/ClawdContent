import { Lock, Zap } from "lucide-react";

const stats = [
  { value: "9", label: "Platforms Supported" },
  { value: "< 2 min", label: "Setup Time" },
  { value: "24/7", label: "Always-On AI" },
  { value: "$17/mo", label: "Starting Price" },
];

const trustPoints = [
  {
    icon: Lock,
    title: "Your data stays private",
    description:
      "Your content, conversations, and social accounts are completely isolated. No shared data, no access from other users.",
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center bg-card border border-border rounded-2xl p-6"
                >
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

          <h2 className="text-4xl md:text-5xl font-bold text-center mb-14 text-foreground">
              Why You Can Trust PostClaw
            </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {trustPoints.map((point, index) => (
              <div key={point.title} className="bg-card border border-border rounded-2xl p-8 h-full flex flex-col hover:border-primary/20 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                    <point.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {point.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-[0.92rem] flex-1">
                    {point.description}
                  </p>
                </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
