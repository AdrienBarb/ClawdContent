import AnimatedSection from "@/components/sections/AnimatedSection";

const faqs = [
  {
    question: "How does it actually work?",
    answer:
      "After you sign up and subscribe, we deploy a private AI bot just for you. You connect your social media accounts from the dashboard, then open Telegram and start chatting with your bot. Tell it what to post — it writes the content, adapts it for each platform, and publishes. That's it.",
  },
  {
    question: "What is OpenClaw?",
    answer:
      "OpenClaw is the most popular open-source AI agent framework, with over 140K GitHub stars. PostClaw uses OpenClaw to give you a private, dedicated AI assistant that lives in your Telegram. We handle all the setup, hosting, and security — you just chat.",
  },
  {
    question: "What platforms are supported?",
    answer:
      "We support 13 platforms: Instagram, TikTok, X (Twitter), LinkedIn, Facebook, YouTube, Pinterest, Threads, Bluesky, Reddit, Telegram, Discord, and Mastodon. You can connect as many as you want and post to all of them at once.",
  },
  {
    question: "Is the content actually good?",
    answer:
      "Yes. Your bot uses advanced AI to write original content, not generic templates. It understands each platform's format, tone, and best practices — so your LinkedIn post sounds professional while your tweet is punchy and concise. You can also review and edit before publishing.",
  },
  {
    question: "Is my data private?",
    answer:
      "Absolutely. Each user gets their own isolated bot instance — no shared infrastructure, no shared data. Your social accounts, content, and conversations are completely private and never accessible to other users.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No contracts, no cancellation fees, no hidden charges. Cancel from your dashboard whenever you want and you won't be billed again.",
  },
  {
    question: "What if I need help?",
    answer:
      "Reach out to us at support@postclaw.io. We're a small team and we respond quickly. We also actively improve the product based on user feedback.",
  },
];

export default function FAQSection() {
  return (
    <section className="bg-muted/50 py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-muted-foreground">
                Everything you need to know before getting started.
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <AnimatedSection key={faq.question} delay={index * 0.08}>
                <details className="group rounded-lg border bg-background p-6">
                  <summary className="flex cursor-pointer items-center justify-between font-semibold">
                    {faq.question}
                    <svg
                      className="faq-chevron h-5 w-5 shrink-0 text-muted-foreground"
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
                  <p className="mt-4 text-muted-foreground">{faq.answer}</p>
                </details>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
