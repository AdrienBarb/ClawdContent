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
  },
  {
    quote:
      "The content adapts for each platform. My LinkedIn posts sound professional, my tweets are punchy. It actually gets it.",
    name: "James K.",
    role: "Marketing Lead, Nomad SaaS",
  },
  {
    quote:
      "I was paying $200/mo for three different tools. PostClaw replaced all of them for $39. The ROI is insane.",
    name: "Priya R.",
    role: "Solo Creator, The Content Lab",
  },
];

export default function SocialProofSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center bg-[#151929] border border-[#1e2233] rounded-2xl p-6"
                >
                  <div className="text-3xl md:text-4xl font-bold text-[#e8614d] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#7a7f94] font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-14 text-white">
              What Our Users Say
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={testimonial.name} delay={index * 0.12}>
                <div className="bg-[#151929] border border-[#1e2233] rounded-2xl p-8 h-full flex flex-col hover:border-[#e8614d]/20 transition-colors">
                  <p className="text-[#c0c4d0] leading-relaxed flex-1 text-[0.95rem] mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-sm text-white">{testimonial.name}</p>
                    <p className="text-xs text-[#7a7f94] mt-0.5">
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
