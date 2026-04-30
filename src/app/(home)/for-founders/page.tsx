import type { Metadata } from "next";
import Link from "next/link";
import CompareSection from "@/components/sections/CompareSection";
import PricingSection from "@/components/sections/PricingSection";
import FinalCTASection from "@/components/sections/FinalCTASection";
import config from "@/lib/config";

const PAGE_PATH = "/for-founders";
const PAGE_URL = `${config.project.url}${PAGE_PATH}`;
const PAGE_TITLE = "PostClaw for Solo Founders & Indie Hackers";
const PAGE_DESCRIPTION =
  "A social media manager for solo founders and indie hackers shipping product. Build-in-public posts, launch announcements, customer wins. $49/mo. Cheaper than your domain bill, faster than hiring.";

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

const useCases = [
  {
    t: "Launch days",
    q: "Tell PostClaw what you shipped. Get a thread for X, a LinkedIn post, a Bluesky version, an Instagram visual. All on brand, all in your voice.",
  },
  {
    t: "Build-in-public",
    q: "Weekly progress posts that don't sound like every other founder. Drop your changelog, get nine posts written for you.",
  },
  {
    t: "Customer wins",
    q: "Got a testimonial or a churn-saved story? PostClaw turns it into a quote tweet, a case study post, a LinkedIn carousel.",
  },
  {
    t: "Audience growth",
    q: "Posts that actually engage instead of disappearing. PostClaw adapts the hook for each platform and posts at the time your audience is online.",
  },
];

const steps = [
  {
    n: "01",
    t: "Paste your landing page",
    d: "PostClaw reads what you're building, who it's for, and what makes it different. Picks up your voice from your website copy.",
  },
  {
    n: "02",
    t: "Connect the platforms you actually post on",
    d: "X, LinkedIn, Bluesky, whatever you ship to. Two-minute setup. Same OAuth flow you've done a hundred times.",
  },
  {
    n: "03",
    t: "Drop a sentence, get a week",
    d: "Tell PostClaw what shipped, what's next, who you talked to. It drafts a week of posts for every platform. You approve in five minutes.",
  },
];

const faqs = [
  {
    q: "I'm shipping product, not running a content engine. Can I really hand this off?",
    a: "That's the point. You spend five minutes a week telling PostClaw what's happening (a feature, a customer call, a bug fix). It writes everything, schedules it, and posts. You go back to building.",
  },
  {
    q: "I don't want generic startup posts that sound like a bot.",
    a: "PostClaw learns from your landing page, your About section, posts you approve. It picks up your voice in the first week. By week two, posts sound like you on a good day. You can edit anything; PostClaw remembers your edits.",
  },
  {
    q: "Can it handle build-in-public + customer wins + launch announcements without losing the thread?",
    a: "Yes. You tell it what's happening, it categorizes the moment (launch, build-in-public, customer story, milestone) and writes platform-native posts for each. Coordinated across X, LinkedIn, Bluesky, and Instagram in one go.",
  },
  {
    q: "Why $49/mo and not free?",
    a: "Hiring even a fractional social manager runs $1,500 to $4,000 a month. PostClaw is the cost of two coffee subscriptions and runs around the clock. Cheaper than the time you'd spend doing this yourself if you charged your hourly rate.",
  },
  {
    q: "Can I export my posts if I leave?",
    a: "Yes. You own everything PostClaw drafts. Cancel in two clicks. Posts you've published stay on your accounts, drafts you've approved are yours to take.",
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
      name: "For Solo Founders & Indie Hackers",
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
    audienceType: "Solo founders and indie hackers",
    name: "Solo founders, indie hackers, bootstrapped SaaS builders",
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

export default function ForFoundersPage() {
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
              For solo founders & indie hackers
            </div>
            <h1 className="font-display text-5xl leading-[0.96] tracking-[-0.03em] text-balance md:text-6xl lg:text-[88px]">
              Ship the product.
              <br />
              <em className="italic text-[#ec6f5b]">We&apos;ll ship the posts.</em>
            </h1>
            <p className="mt-9 max-w-[640px] text-base leading-[1.55] text-[#b9bdd6] md:text-xl">
              Building, shipping, talking to users, that&apos;s the job. Posting nine platform-native pieces a day shouldn&apos;t be. PostClaw drafts a week of posts from a sentence and publishes them for $49 a month.
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
              What you can post about
            </div>
            <h2 className="max-w-[900px] font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-5xl lg:text-[64px]">
              Stop staring at the empty compose box{" "}
              <em className="italic text-[#ec6f5b]">on a deploy day.</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {useCases.map((u) => (
              <div
                key={u.t}
                className="flex flex-col gap-4 rounded-2xl border border-[#e2e0eb] bg-white p-7"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ec6f5b]">
                  {u.t}
                </div>
                <p className="text-base leading-[1.55] text-[#4a5073]">{u.q}</p>
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
              Setup in five minutes{" "}
              <em className="italic text-[#ec6f5b]">between two PRs.</em>
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
            &ldquo;I closed the agency. PostClaw is doing better content for $1,950 less a month.&rdquo;
          </blockquote>
          <div className="mt-8 text-sm text-[#7e8298]">
            <strong className="font-semibold text-[#0f1437]">James Otieno</strong>
            {" · "}Studio Roma, Chicago
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
              <em className="italic text-[#ec6f5b]">no growth hacks.</em>
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
