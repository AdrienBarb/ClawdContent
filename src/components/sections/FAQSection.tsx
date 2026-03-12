import AnimatedSection from "@/components/sections/AnimatedSection";
import { faqs } from "@/data/faq";

export default function FAQSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-14 text-white">
              Frequently Asked
              <br />
              Questions
            </h2>
          </AnimatedSection>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <AnimatedSection key={faq.question} delay={index * 0.06}>
                <details className="group bg-[#151929] border border-[#1e2233] rounded-2xl p-6">
                  <summary className="flex cursor-pointer items-center justify-between font-semibold text-[0.95rem] list-none text-[#e8e9f0]">
                    {faq.question}
                    <svg
                      className="faq-chevron h-5 w-5 shrink-0 text-[#555a6b] ml-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="mt-4 text-[#7a7f94] leading-relaxed text-[0.92rem]">
                    {faq.answer}
                  </p>
                </details>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
