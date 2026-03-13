import Link from "next/link";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import { DollarSign, Share2, BarChart3, Zap } from "lucide-react";

export const metadata = genPageMetadata({
  title: "Affiliate Program — Earn 40% Recurring Commission",
  description:
    "Join the PostClaw affiliate program and earn 40% recurring commission on every referral. Share your link, earn monthly income.",
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

export default function AffiliatesPage() {
  return (
    <div className="bg-[#0a0c14]">
      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-16 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#e8614d]">
            Affiliate Program
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Earn 40% recurring commission
          </h1>
          <p className="mt-6 text-lg text-[#8a8f9e] max-w-2xl mx-auto">
            Recommend PostClaw to your audience and earn 40% of every payment —
            not just the first one. As long as they stay subscribed, you keep
            earning.
          </p>
          <div className="mt-10">
            <Link
              href="https://postclaw.affonso.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#e8614d] px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-[#d4563f]"
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
        <h2 className="text-center text-2xl font-bold text-white sm:text-3xl mb-12">
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
                desc: "Promote PostClaw on your blog, social media, newsletter, or community.",
              },
              {
                step: "3",
                title: "Earn every month",
                desc: "Get 40% of every payment your referrals make — recurring, forever.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8614d]/10 text-[#e8614d] font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[#8a8f9e]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-white sm:text-3xl mb-12">
          Why join?
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-[#1e2233] bg-[#0d0f17] p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#e8614d]/10">
                <benefit.icon className="h-5 w-5 text-[#e8614d]" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm text-[#8a8f9e]">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#1e2233] bg-[#0d0f17] p-10">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to start earning?
          </h2>
          <p className="mt-4 text-[#8a8f9e]">
            Join the PostClaw affiliate program today and start earning 40%
            recurring commission on every referral.
          </p>
          <div className="mt-8">
            <Link
              href="https://postclaw.affonso.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#e8614d] px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-[#d4563f]"
            >
              Join the Affiliate Program
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
