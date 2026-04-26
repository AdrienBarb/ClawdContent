import Link from "next/link";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import { DollarSign, Share2, BarChart3, Zap } from "lucide-react";
import RevenueSimulator from "@/components/affiliates/RevenueSimulator";

export const metadata = genPageMetadata({
  title: "Affiliate Program — Earn 40% Recurring Commission",
  description:
    "Earn 40% recurring commission promoting PostClaw — the AI social media manager small business owners actually stick with. Real monthly income, no caps.",
  url: "/affiliates",
});

const benefits = [
  {
    icon: DollarSign,
    title: "40% Recurring Commission",
    description:
      "Earn 40% of every payment, every month, for as long as your referral stays subscribed.",
  },
  {
    icon: Share2,
    title: "Easy to Share",
    description:
      "Get a unique referral link and start sharing with your audience right away.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    description:
      "Track clicks, conversions, and earnings in your affiliate dashboard.",
  },
  {
    icon: Zap,
    title: "30-Day Cookie",
    description:
      "Your referrals are tracked for 30 days — plenty of time to convert.",
  },
];

const faqs = [
  {
    question: "When do I get paid?",
    answer:
      "Payouts are processed monthly. In the first week of each month, all approved commissions from the previous month (that have cleared the hold period) are queued for payment. You typically receive your payment within 7\u201314 days of the month start.",
  },
  {
    question: "What\u2019s the minimum payout?",
    answer:
      "$50. If your balance is below $50 at month-end, it rolls over to the next month until you cross the threshold.",
  },
  {
    question: "In what currency am I paid?",
    answer:
      "All payouts are in USD, regardless of the currency the referred customer paid in. Conversions use the exchange rate on invoice creation day.",
  },
  {
    question: "How am I paid?",
    answer:
      "PayPal or bank wire transfer. You choose your preferred method in your affiliate dashboard at postclaw.affonso.io.",
  },
  {
    question: "Are there any fees?",
    answer:
      "Any fees charged by your bank or PayPal to receive the payment are your responsibility (industry standard). PostClaw covers all sending-side costs.",
  },
  {
    question: "Do I need to send an invoice?",
    answer:
      "No. Affonso handles all invoicing and tax compliance automatically. If you\u2019re based in the US or deal with US tax law, you may be asked to submit a W9 or W8-BEN form through Affonso \u2014 just a one-time thing.",
  },
  {
    question: "How does recurring commission work?",
    answer:
      "You earn 40% of every payment your referral makes, for as long as they stay subscribed. PostClaw is $49/mo, so each active referral = $19.60/month, every month. 20 active referrals = $392/month recurring ($4,704/year). Yearly plan referrals pay 40% of the discounted yearly total upfront.",
  },
  {
    question: "What happens if my referral cancels or gets refunded?",
    answer:
      "The commission for that specific payment is reversed. You keep all commissions from previous months they paid for.",
  },
  {
    question: "When does the 30-day cookie start?",
    answer:
      "The moment someone clicks your affiliate link. If they sign up within 30 days, the sale is attributed to you.",
  },
  {
    question: "Question about a specific commission?",
    answer:
      "Email admin@postclaw.io with your affiliate email and the referral details. We\u2019ll investigate within 2 business days.",
  },
];

export default function AffiliatesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-16 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
            Affiliate Program
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Earn 40% recurring commission
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Tell the small business owners in your audience — photographers,
            caterers, coaches, consultants — about PostClaw, and earn 40% of
            every payment they make. Every month, for as long as they stay.
          </p>
          <div className="mt-10">
            <Link
              href="https://postclaw.affonso.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-primary"
            >
              Join the Affiliate Program
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl mb-12">
          How it works
        </h2>
        <div className="mx-auto max-w-3xl">
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Sign up for free",
                desc: "Create your affiliate account in seconds — no approval wait.",
              },
              {
                step: "2",
                title: "Share your link",
                desc: "Recommend PostClaw on your blog, newsletter, social, or community of small business owners.",
              },
              {
                step: "3",
                title: "Earn every month",
                desc: "Get 40% of every payment your referrals make — $19.60/mo per referral, recurring for as long as they stay.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl mb-12">
          Why join?
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue Simulator */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl mb-4">
          How much can you earn?
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Drag the slider and pick a plan to see your potential recurring
          income.
        </p>
        <RevenueSimulator />
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl mb-12">
          Affiliate Payouts FAQ
        </h2>
        <div className="mx-auto max-w-3xl space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="text-base font-semibold text-foreground">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-10">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Ready to start earning?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join the PostClaw affiliate program today and earn $19.60/month for
            every small business owner you bring on board.
          </p>
          <div className="mt-8">
            <Link
              href="https://postclaw.affonso.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-primary"
            >
              Join the Affiliate Program
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
