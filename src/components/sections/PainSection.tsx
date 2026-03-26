import AnimatedSection from "@/components/sections/AnimatedSection";

const steps = [
  "Wake up. Realize you haven't posted in 3 days.",
  "Open LinkedIn. Stare at a blank editor. Write something. Delete it.",
  "Copy it to Twitter. Too long. Rewrite.",
  "Open Threads. Rewrite again, different tone.",
  "Instagram needs a visual. You don't have one.",
  "Give up on Bluesky, TikTok, and Pinterest entirely.",
];

export default function PainSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-white leading-tight">
              You didn&apos;t start your business
              <br />
              to be a social media manager.
            </h2>
          </AnimatedSection>

          <div className="space-y-3 mb-8">
            {steps.map((step, index) => (
              <AnimatedSection key={step} delay={index * 0.08}>
                <div className="flex items-center gap-4 bg-[#151929] border border-[#1e2233] rounded-2xl px-6 py-4">
                  <span className="text-[#555a6b] font-mono text-sm shrink-0">
                    {index + 1}.
                  </span>
                  <span className="text-[#8a8f9e] text-[0.95rem]">{step}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.5}>
            <div className="flex items-center gap-4 bg-[#151929] border border-[#e8614d]/20 rounded-2xl px-6 py-4">
              <span className="text-[#555a6b] font-mono text-sm shrink-0">
                7.
              </span>
              <span className="text-[#8a8f9e] text-[0.95rem] italic">
                Tell yourself you&apos;ll &ldquo;batch content this
                weekend.&rdquo; You won&apos;t.
              </span>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.6}>
            <p className="text-center text-[#e8614d] font-semibold text-lg mt-12">
              What if you could hand all of this to someone who actually wants to
              do it?
            </p>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
