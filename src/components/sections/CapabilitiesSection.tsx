import {
  Lightbulb,
  PenLine,
  Send,
  CalendarClock,
  ImagePlus,
  BarChart3,
} from "lucide-react";

const capabilities = [
  {
    icon: Lightbulb,
    title: "Suggests what to post",
    description:
      "No more blank screens. It creates post ideas based on your business, your niche, and what your audience responds to.",
  },
  {
    icon: PenLine,
    title: "Writes every caption",
    description:
      "Professional, natural content that sounds like you wrote it. Not robotic, not generic. Your voice, your tone.",
  },
  {
    icon: Send,
    title: "Posts to Instagram, Facebook & more",
    description:
      "Publishes to all your platforms at once. Adapts the format for each one: visual for Instagram, professional for LinkedIn, casual for Facebook.",
  },
  {
    icon: CalendarClock,
    title: "Plans your whole week",
    description:
      "Get a full week of posts, scheduled at the right times, spread across your platforms. Set it and forget it.",
  },
  {
    icon: ImagePlus,
    title: "Creates images for your posts",
    description:
      "Need a visual? It generates images sized for each platform. No design skills needed, no stock photo hunting.",
  },
  {
    icon: BarChart3,
    title: "Shows you what's working",
    description:
      "See which posts get engagement, which platforms bring followers, and what to do more of. Real numbers, not guesswork.",
  },
];

export default function CapabilitiesSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Your social media, handled.
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-16">
            Six things you&apos;ll never have to do yourself again.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap) => (
              <div key={cap.title} className="bg-card border border-border rounded-2xl p-7 h-full hover:border-primary/30 transition-colors shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                  <cap.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {cap.title}
                </h3>
                <p className="text-secondary-foreground leading-relaxed text-[0.9rem]">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
