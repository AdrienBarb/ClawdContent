import { Camera, UtensilsCrossed, Briefcase, Store } from "lucide-react";

const personas = [
  {
    icon: Camera,
    title: "Photographers & Creatives",
    description:
      "You shoot beautiful work but posting it, writing captions, keeping Instagram updated... that takes as long as the shoot itself. PostClaw turns your portfolio into a steady stream of posts.",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurants & Cafés",
    description:
      "Your food speaks for itself, but only if people see it. PostClaw posts your daily specials and behind-the-scenes content that fills tables. No more 'we should really post something today.'",
  },
  {
    icon: Briefcase,
    title: "Coaches & Consultants",
    description:
      "Your expertise is your business, but building an audience means showing up every day. PostClaw writes posts that position you as the expert and publishes while you're with clients.",
  },
  {
    icon: Store,
    title: "Local Businesses",
    description:
      "Florists, salons, fitness studios... you're too busy serving customers to manage a social media presence. PostClaw keeps your business visible online without adding another job to your plate.",
  },
];

export default function WhoIsThisForSection() {
  return (
    <section id="who-is-this-for" className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground leading-tight">
            Who It&apos;s For
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-14">
            Built for people who have a business to run, not a feed to manage.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {personas.map((persona) => (
              <div key={persona.title} className="bg-card border border-border rounded-2xl p-8 h-full hover:border-primary/30 transition-colors shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                  <persona.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {persona.title}
                </h3>
                <p className="text-secondary-foreground leading-relaxed text-[0.95rem]">
                  {persona.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
