import type { Metadata } from "next";
import Link from "next/link";
import CompareSection from "@/components/sections/CompareSection";
import PricingSection from "@/components/sections/PricingSection";
import FinalCTASection from "@/components/sections/FinalCTASection";
import config from "@/lib/config";

const PAGE_PATH = "/for-small-businesses";
const PAGE_URL = `${config.project.url}${PAGE_PATH}`;
const PAGE_TITLE = "PostClaw for Small Business Owners";
const PAGE_DESCRIPTION =
  "A social media manager built for photographers, caterers, coaches, consultants, and local shops. Plans your posts, writes them in your voice, and publishes on schedule for $49/mo.";

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | ${config.project.brandName}`,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    images: [`${config.project.url}${config.seo.ogImage}`],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [`${config.project.url}${config.seo.ogImage}`],
  },
};

const subSegments = [
  {
    t: "Photographers",
    q: "Turn your portfolio into a feed that books shoots.",
  },
  {
    t: "Restaurants & cafés",
    q: "Daily specials, behind-the-scenes, the dish that flew today.",
  },
  {
    t: "Coaches & consultants",
    q: "Show up as the expert without being on Instagram all day.",
  },
  {
    t: "Local shops",
    q: "Florists, salons, studios. Stay visible while serving customers.",
  },
];

const steps = [
  {
    n: "01",
    t: "Paste your website",
    d: "PostClaw reads what you sell, your tone, what's special, in 30 seconds. No long onboarding form.",
  },
  {
    n: "02",
    t: "Connect Instagram & Facebook",
    d: "Two minutes, no technical setup. Add the accounts your customers actually use.",
  },
  {
    n: "03",
    t: "Approve from your phone",
    d: "Drafts arrive ready. Tap approve between customers. Posts go out at the right time, written for each platform.",
  },
];

const faqs = [
  {
    q: "I run a small business and barely have time. Will this actually save me time?",
    a: "Yes. You spend two minutes a day approving drafts. PostClaw plans the calendar, writes every post in your voice, and publishes on schedule. No dashboard to learn, no editor to fight.",
  },
  {
    q: "I'm a photographer (or caterer, or coach). Will PostClaw understand my business?",
    a: "PostClaw learns from your website. It reads what you sell, your tone, the kind of customer you serve. The first week tunes it to your voice. After that, posts sound like you wrote them.",
  },
  {
    q: "I tried Buffer and Hootsuite and they're just empty dashboards. How is this different?",
    a: "Buffer and Hootsuite hand you a blank screen and expect you to write. PostClaw writes the posts, adapts each one for the platform, and publishes them. You only review.",
  },
  {
    q: "Will my posts sound generic or robotic?",
    a: "PostClaw learns your brand voice from your website and from posts you approve. The more you use it, the more it sounds like you. You can also edit any draft, and it remembers your style going forward.",
  },
  {
    q: "What if I want to pause for a busy season?",
    a: "Cancel anytime in two clicks, no contracts. When you come back, your brand voice and content history are still there.",
  },
];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: config.project.url,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "For Small Business Owners",
      item: PAGE_URL,
    },
  ],
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  audience: {
    "@type": "Audience",
    audienceType: "Small business owners",
    name: "Photographers, caterers, coaches, consultants, local shops",
  },
  about: {
    "@type": "SoftwareApplication",
    name: config.project.brandName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function ForSmallBusinessesPage() {
  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="hero-landing-glow relative overflow-hidden bg-[#0f1029] text-white">
        <div className="relative z-10 mx-auto max-w-[1100px] px-6 pb-24 pt-20 text-center md:px-14 md:pb-28 md:pt-24">
          <div className="flex flex-col items-center">
            <div className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-[#ec6f5b55] bg-[#ec6f5b22] px-3.5 py-1.5 text-xs text-[#f8a594]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ec6f5b]" />
              For small business owners
            </div>
            <h1 className="font-display text-5xl leading-[0.96] tracking-[-0.03em] text-balance md:text-6xl lg:text-[88px]">
              You run the shop.
              <br />
              <em className="italic text-[#ec6f5b]">We run the feed.</em>
            </h1>
            <p className="mt-9 max-w-[640px] text-base leading-[1.55] text-[#b9bdd6] md:text-xl">
              PostClaw is a social media manager for photographers, caterers, coaches, consultants, and local shops. It learns your business, writes posts in your voice, and publishes to nine platforms on schedule. $49 a month, the agency you&apos;d hire costs forty times more.
            </p>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="#pricing"
                className="cursor-pointer rounded-full bg-[#ec6f5b] px-8 py-4 text-sm font-semibold text-white shadow-[0_14px_40px_-10px_#ec6f5b] transition-transform hover:-translate-y-0.5"
              >
                Get my 5 free posts →
              </Link>
              <Link
                href="/"
                className="rounded-full border border-[#2a2d52] bg-transparent px-6 py-4 text-sm font-medium text-white transition-colors hover:border-[#3a3d62]"
              >
                See the full demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f0ea] px-6 py-24 md:px-14 md:py-32">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-16 md:mb-20">
            <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
              Built for your trade
            </div>
            <h2 className="max-w-[900px] font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-5xl lg:text-[64px]">
              Pick the small business that sounds like{" "}
              <em className="italic text-[#ec6f5b]">you.</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {subSegments.map((s) => (
              <div
                key={s.t}
                className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-[#e2e0eb] bg-white p-7"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ec6f5b]">
                  {s.t}
                </div>
                <p className="text-lg font-medium leading-[1.4] tracking-[-0.01em] text-[#0f1437]">
                  {s.q}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-24 md:px-14 md:py-32">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-16 md:mb-20">
            <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
              How it works
            </div>
            <h2 className="max-w-[900px] font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-5xl lg:text-[64px]">
              From signup to first post,{" "}
              <em className="italic text-[#ec6f5b]">while you serve a customer.</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="mb-4 text-5xl font-semibold leading-none tracking-[-0.04em] text-[#ec6f5b] md:text-7xl">
                  {s.n}
                </div>
                <h3 className="mb-3 text-xl font-semibold tracking-[-0.015em] text-[#0f1437] md:text-2xl">
                  {s.t}
                </h3>
                <p className="text-base leading-[1.6] text-[#4a5073]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f0ea] px-6 py-24 md:px-14 md:py-32">
        <div className="mx-auto max-w-[900px] text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
            One of yours
          </div>
          <blockquote className="font-display text-3xl leading-[1.15] tracking-[-0.02em] text-[#0f1437] md:text-4xl lg:text-5xl">
            &ldquo;It writes like I write. Customers tell me my Instagram has &lsquo;really gotten good lately&rsquo;.&rdquo;
          </blockquote>
          <div className="mt-8 text-sm text-[#7e8298]">
            <strong className="font-semibold text-[#0f1437]">Marie Chen</strong>
            {" · "}Owner, The Corner Bakery
          </div>
        </div>
      </section>

      <CompareSection />
      <PricingSection />

      <section id="faq" className="bg-[#f5f0ea] px-6 py-24 md:px-14 md:py-32">
        <div className="mx-auto max-w-[900px]">
          <div className="mb-12 text-center">
            <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
              Questions
            </div>
            <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-5xl lg:text-6xl">
              Honest answers,{" "}
              <em className="italic text-[#ec6f5b]">not marketing.</em>
            </h2>
          </div>
          <div className="space-y-5">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-[#e2e0eb] bg-white p-6 [&[open]]:bg-white"
              >
                <summary className="cursor-pointer list-none text-lg font-semibold tracking-[-0.01em] text-[#0f1437] [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-4 text-base leading-[1.6] text-[#4a5073]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <FinalCTASection />

      <p className="bg-[#f5f0ea] pb-6 pt-2 text-center text-xs text-[#7e8298]">
        Last updated: April 2026
      </p>
    </div>
  );
}
