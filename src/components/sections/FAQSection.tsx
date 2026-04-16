import { faqs } from "@/data/faq";

export default function FAQSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-14 text-foreground">
            Frequently Asked
            <br />
            Questions
          </h2>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="group bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between font-semibold text-[0.95rem] list-none text-foreground">
                    {faq.question}
                    <svg
                      className="faq-chevron h-5 w-5 shrink-0 text-muted-foreground ml-4"
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
                  <p className="mt-4 text-secondary-foreground leading-relaxed text-[0.92rem]">
                    {faq.answer}
                  </p>
                </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
