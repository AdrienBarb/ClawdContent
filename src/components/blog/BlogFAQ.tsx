import Script from "next/script";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FAQBlock } from "@/lib/sanity/types";

interface BlogFAQProps {
  faq: FAQBlock;
}

export default function BlogFAQ({ faq }: BlogFAQProps) {
  if (!faq.items || faq.items.length === 0) return null;

  // Generate FAQ structured data for SEO
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="mt-16">
      {/* FAQ Structured Data for SEO */}
      <Script
        id="blog-faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <h2 className="text-2xl font-bold text-foreground mb-6">{faq.title}</h2>

      <Accordion type="single" collapsible className="space-y-3">
        {faq.items.map((item) => (
          <AccordionItem
            key={item._key}
            value={item._key}
            className="bg-card rounded-xl border border-border px-5 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <h3 className="text-base font-medium text-foreground text-left pr-4">
                {item.question}
              </h3>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
