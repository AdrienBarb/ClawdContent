import AnimatedSection from "@/components/sections/AnimatedSection";
import {
  PenLine,
  Languages,
  Send,
  CalendarClock,
  Brain,
  Globe,
  ImagePlus,
  CalendarDays,
  Lightbulb,
} from "lucide-react";

const capabilities = [
  {
    icon: PenLine,
    title: "Write Posts",
    description:
      '\u201CWrite about our new feature launch.\u201D Get a ready-to-publish post in seconds. No prompts to engineer, no templates to fill.',
  },
  {
    icon: Languages,
    title: "Adapt for Every Platform",
    description:
      "One idea becomes 13 native posts. Professional on LinkedIn, punchy on X, visual on Instagram, casual on Threads \u2014 automatically.",
  },
  {
    icon: Send,
    title: "Publish Everywhere",
    description:
      "Post to all your connected platforms at once, or pick specific ones. One message, every network covered.",
  },
  {
    icon: CalendarClock,
    title: "Schedule & Automate",
    description:
      '\u201CPost this tomorrow at 9am.\u201D Schedule one-off posts or set up recurring content. OpenClaw handles the timing, even while you sleep.',
  },
  {
    icon: Brain,
    title: "Remember Your Brand Voice",
    description:
      "OpenClaw learns your tone, style, and preferences over time. The more you use it, the more it sounds like you \u2014 not a generic AI.",
  },
  {
    icon: Globe,
    title: "Research the Web",
    description:
      "OpenClaw browses the web to find trending topics, competitor activity, and industry news \u2014 then turns it into content ideas for you.",
  },
  {
    icon: ImagePlus,
    title: "Generate Images",
    description:
      "Need a visual for your post? OpenClaw creates images tailored for each platform \u2014 square for Instagram, vertical for Stories, landscape for X.",
  },
  {
    icon: CalendarDays,
    title: "Plan Your Content Calendar",
    description:
      '\u201CPlan my content for the next 2 weeks.\u201D Get a full calendar with post ideas, topics, and suggested publish dates across all platforms.',
  },
  {
    icon: Lightbulb,
    title: "Advise Your Strategy",
    description:
      "Stuck on what to post? Ask for ideas. OpenClaw suggests content based on your niche, what\u2019s working, and what your audience engages with.",
  },
];

export default function CapabilitiesSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              What OpenClaw Can Do
            </h2>
            <p className="text-center text-[#7a7f94] text-lg mb-16">
              More than a posting tool. It&apos;s your full content team in one
              chat.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap, index) => (
              <AnimatedSection key={cap.title} delay={index * 0.08}>
                <div className="bg-[#151929] border border-[#1e2233] rounded-2xl p-7 h-full hover:border-[#e8614d]/20 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8614d]/10 mb-5">
                    <cap.icon className="h-5 w-5 text-[#e8614d]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-[#7a7f94] leading-relaxed text-[0.9rem]">
                    {cap.description}
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
