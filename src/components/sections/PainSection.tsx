import AnimatedSection from "@/components/sections/AnimatedSection";
import { RotateCw } from "lucide-react";

const steps = [
  "Open LinkedIn. Write a post. Publish.",
  "Open Twitter. Rewrite it shorter. Publish.",
  "Open Threads. Rewrite again. Publish.",
  "Open Bluesky. One more time. Publish.",
  "Open Instagram. Rethink the format. Publish.",
];

export default function PainSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              Sound Familiar?
            </h2>
            <p className="text-center text-[#7a7f94] text-lg mb-12">
              This is what managing social media looks like today.
            </p>
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
              <RotateCw className="h-4 w-4 text-[#555a6b] shrink-0" />
              <span className="text-[#555a6b] text-[0.95rem] italic">
                Repeat tomorrow. And the next day. And the next...
              </span>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.6}>
            <p className="text-center text-[#e8614d] font-semibold text-lg mt-12">
              What if one message could replace all of that?
            </p>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
