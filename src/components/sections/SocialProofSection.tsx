import AnimatedSection from "@/components/sections/AnimatedSection";

const stats = [
  { value: "13", label: "Platforms supported" },
  { value: "140K+", label: "OpenClaw GitHub stars" },
  { value: "1,000+", label: "Posts published" },
  { value: "< 2 min", label: "Setup time" },
];

// TODO: Replace with real testimonials
const testimonials = [
  {
    quote:
      "I used to spend 2 hours a day managing social media across 5 platforms. Now I send one message and it's done in seconds.",
    name: "Sarah M.",
    role: "Founder",
    company: "PixelBrew Studio",
  },
  {
    quote:
      "The content isn't just reposted — it's actually adapted for each platform. My LinkedIn posts sound professional, my tweets are punchy. It gets it.",
    name: "James K.",
    role: "Marketing Lead",
    company: "Nomad SaaS",
  },
  {
    quote:
      "I was paying $200/mo for three different tools. PostClaw replaced all of them for $39. The ROI is insane.",
    name: "Priya R.",
    role: "Solo Creator",
    company: "The Content Lab",
  },
];

export default function SocialProofSection() {
  return (
    <section className="py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={testimonial.name} delay={index * 0.15}>
                <div className="p-6 rounded-lg border bg-muted/50 h-full flex flex-col">
                  <p className="text-foreground mb-4 flex-1">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
