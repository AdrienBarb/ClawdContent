import HeroSection from "@/components/sections/HeroSection";
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
      price: "99",
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
    "Set up PostClaw in five minutes. It runs your Instagram from there.",
  totalTime: "PT5M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "It learns your brand",
      text: "Paste your website. PostClaw learns what you sell, your voice, and what makes you different in 30 seconds.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "It builds your strategy",
      text: "Connect your Instagram. PostClaw studies your niche and plans what to post, which formats, and when to post them.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "It runs on autopilot",
      text: "A full week of posts goes out, written for Instagram and scheduled at peak times. Review, tweak, or let it run.",
    },
  ],
};

export default async function Home() {
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
      <HeroSection />
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
