import HeroSection from "@/components/sections/HeroSection";
import DemoSection from "@/components/sections/DemoSection";
import PainSection from "@/components/sections/PainSection";
import WhoIsThisForSection from "@/components/sections/WhoIsThisForSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import CapabilitiesSection from "@/components/sections/CapabilitiesSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import SocialProofSection from "@/components/sections/SocialProofSection";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
import FinalCTASection from "@/components/sections/FinalCTASection";
import { faqs } from "@/data/faq";
import config from "@/lib/config";

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
  offers: {
    "@type": "Offer",
    price: "29",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  aggregateRating: undefined,
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

export default function Home() {
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
      <HeroSection />
      <DemoSection />
      <PainSection />
      <WhoIsThisForSection />
      <HowItWorksSection />
      <CapabilitiesSection />
      <FeaturesSection />
      <SocialProofSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
    </div>
  );
}
