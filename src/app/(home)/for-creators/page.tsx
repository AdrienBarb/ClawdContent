import type { Metadata } from "next";
import Link from "next/link";
import CompareSection from "@/components/sections/CompareSection";
import PricingSection from "@/components/sections/PricingSection";
import FinalCTASection from "@/components/sections/FinalCTASection";
import config from "@/lib/config";

const PAGE_PATH = "/for-creators";
const PAGE_URL = `${config.project.url}${PAGE_PATH}`;
const PAGE_TITLE = "PostClaw for Creators";
const PAGE_DESCRIPTION =
  "A social media manager for video creators, newsletter writers, course makers, and indie artists. One idea becomes nine platform-ready posts. $49/mo, less than your editing software.";

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
    t: "Video drops",
    q: "New video, new podcast, new short. PostClaw writes the TikTok hook, the Instagram carousel, the X thread, the LinkedIn version. Each one tuned to the platform.",
  },
  {
    t: "Newsletter promo",
    q: "Drop your newsletter URL on send day. PostClaw turns the lede into platform-native teasers that drive subscribers, not impressions.",
  },
  {
    t: "Course & product launches",
    q: "Launch week posts that don't sound desperate. Pre-launch curiosity, launch day hype, mid-week social proof, end-of-launch close.",
  },
  {
    t: "Behind-the-scenes",
    q: "The work-in-progress shot, the failed take, the quiet moment. PostClaw turns it into the kind of post that makes people feel like insiders.",
  },
];

const steps = [
  {
    n: "01",
    t: "Tell PostClaw what you make",
    d: "Paste your YouTube channel, your Substack, your portfolio. PostClaw learns your voice, your audience, your usual themes.",
  },
  {
    n: "02",
    t: "Connect the platforms you grow on",
    d: "Instagram, TikTok, X, YouTube, LinkedIn, Threads, whatever your audience uses. Two-minute connect.",
  },
  {
    n: "03",
    t: "Drop one idea, get nine posts",
    d: "Tell PostClaw what you're working on. It drafts a week of platform-native posts in your voice. Approve, edit, or skip — your call.",
  },
];

const faqs = [
  {
    q: "I have ideas, not time. Will PostClaw actually save my schedule?",
    a: "That's the whole point. You drop one idea (a video, a newsletter, a thought) and get nine platform-native posts back. Approve in five minutes, get back to making things. Most creators batch a week of posts in one sitting.",
  },
  {
    q: "Will it sound like a marketing bot?",
    a: "PostClaw learns your voice from your existing work and from posts you approve. The first week tunes it. After that, posts sound like you on a good day. If a draft sounds off, edit once and PostClaw remembers.",
  },
  {
    q: "I post across platforms with very different vibes. Can it handle that?",
    a: "That's the design. The same idea becomes punchy on X, visual on Instagram, conversational on Threads, professional on LinkedIn, and a hook on TikTok. You don't write five versions, PostClaw does.",
  },
  {
    q: "Can I batch a whole week's content in one session?",
    a: "Yes. Tell PostClaw your themes for the week (a video drop, a newsletter promo, a build-update). You get a calendar of drafts across every platform. Approve in 5 to 10 minutes, done for the week.",
  },
  {
    q: "What if my style is very specific and I don't want it changed?",
    a: "PostClaw doesn't push a style on you. It learns yours and only writes in it. If you edit a draft, it remembers your edits going forward. You stay in control of every post.",
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
      name: "For Creators",
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
    audienceType: "Creators",
    name: "Video creators, newsletter writers, course makers, indie artists",
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

export default function ForCreatorsPage() {
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
              For creators
            </div>
            <h1 className="font-display text-5xl leading-[0.96] tracking-[-0.03em] text-balance md:text-6xl lg:text-[88px]">
              Make the work.
              <br />
              <em className="italic text-[#ec6f5b]">We&apos;ll post about it.</em>
            </h1>
            <p className="mt-9 max-w-[640px] text-base leading-[1.55] text-[#b9bdd6] md:text-xl">
              You make videos, newsletters, courses, art. PostClaw turns one idea into nine platform-ready posts and handles publishing. Get your hours back. $49 a month, less than your editing software.
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
              Promote your work without{" "}
              <em className="italic text-[#ec6f5b]">becoming a marketer.</em>
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
              From one idea to{" "}
              <em className="italic text-[#ec6f5b]">a week of posts.</em>
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
            &ldquo;I went from posting twice a month to seven days a week. Bookings followed.&rdquo;
          </blockquote>
          <div className="mt-8 text-sm text-[#7e8298]">
            <strong className="font-semibold text-[#0f1437]">Hannah Park</strong>
            {" · "}Coach, Austin
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
              <em className="italic text-[#ec6f5b]">no fluff.</em>
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
