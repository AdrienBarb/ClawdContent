import AnimatedSection from "@/components/sections/AnimatedSection";

const stats = [
  { value: "13", label: "Platforms" },
  { value: "140K+", label: "OpenClaw Stars" },
  { value: "1,000+", label: "Posts Published" },
  { value: "< 2 min", label: "Setup Time" },
];

// TODO: Replace with real testimonials
const testimonials = [
  {
    quote:
      "I used to spend 2 hours a day managing social media across 5 platforms. Now I send one message and it's done in seconds.",
    name: "Sarah M.",
    role: "Founder, PixelBrew Studio",
    bg: "bg-amber-50",
  },
  {
    quote:
      "The content adapts for each platform. My LinkedIn posts sound professional, my tweets are punchy. It actually gets it.",
    name: "James K.",
    role: "Marketing Lead, Nomad SaaS",
    bg: "bg-sky-50",
  },
  {
    quote:
      "I was paying $200/mo for three different tools. PostClaw replaced all of them for $39. The ROI is insane.",
    name: "Priya R.",
    role: "Solo Creator, The Content Lab",
    bg: "bg-violet-50",
  },
];

export default function SocialProofSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center bg-card rounded-2xl p-6 shadow-sm"
                >
                  <div className="font-serif text-3xl md:text-4xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-center mb-14">
              What Our Users Say
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={testimonial.name} delay={index * 0.12}>
                <div
                  className={`${testimonial.bg} rounded-2xl p-8 h-full flex flex-col`}
                >
                  <p className="text-foreground leading-relaxed flex-1 text-[0.95rem] mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {testimonial.role}
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
