import HeroSection from "@/components/sections/HeroSection";
import DemoSection from "@/components/sections/DemoSection";
import PlatformsSection from "@/components/sections/PlatformsSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import OutcomesSection from "@/components/sections/OutcomesSection";
import WhoIsThisForSection from "@/components/sections/WhoIsThisForSection";
import CompareSection from "@/components/sections/CompareSection";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
import PoweredBySection from "@/components/sections/PoweredBySection";
import FinalCTASection from "@/components/sections/FinalCTASection";
import { faqs } from "@/data/faq";
import config from "@/lib/config";
import { getDistinctId } from "@/lib/tracking/distinctId";
import { getFeatureFlag } from "@/lib/tracking/postHogClient";

export const dynamic = "force-dynamic";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PostClaw",
  url: config.project.url,
  logo: `${config.project.url}/logo.png`,
  description: config.seo.description,
  email: config.contact.supportEmail,
  sameAs: [config.social.twitter],
  contactPoint: {
    "@type": "ContactPoint",
    email: config.contact.supportEmail,
    contactType: "customer support",
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PostClaw",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: config.seo.description,
  url: config.project.url,
  offers: [
    {
      "@type": "Offer",
      name: "PostClaw",
      price: "49",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to set up PostClaw",
  description:
    "From signup to your first post in under five minutes.",
  totalTime: "PT5M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Tell it about your business",
      text: "Paste your website. PostClaw learns what you sell, your tone, what's special, in 30 seconds.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Connect Instagram & Facebook",
      text: "Two minutes. No technical setup. Add the accounts you actually use.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Approve. It posts.",
      text: "Drafts arrive ready. Tap approve. Posts go out at the right time, written for each platform.",
    },
  ],
};

export default async function Home() {
  const distinctId = await getDistinctId();

  let heroVariant = "control";
  if (distinctId) {
    const flag = await getFeatureFlag("hero-section-experiment", distinctId);
    if (flag === "test") {
      heroVariant = "test";
    }
  }

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareAppSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(howToSchema),
        }}
      />
      <HeroSection variant={heroVariant} />
      <DemoSection />
      <PlatformsSection />
      <HowItWorksSection />
      <OutcomesSection />
      <WhoIsThisForSection />
      <CompareSection />
      <PricingSection />
      <FAQSection />
      <PoweredBySection />
      <FinalCTASection />
      <p className="pb-6 pt-2 text-center text-xs text-[#94a3b8]">
        Last updated: April 2026
      </p>
    </div>
  );
}
