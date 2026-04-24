import HeroSection from "@/components/sections/HeroSection";
import PainSection from "@/components/sections/PainSection";
import BeforeAfterSection from "@/components/sections/BeforeAfterSection";
import WhoIsThisForSection from "@/components/sections/WhoIsThisForSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import PoweredBySection from "@/components/sections/PoweredBySection";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
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
      <HeroSection variant={heroVariant} />
      <PainSection />
      <BeforeAfterSection />
      <WhoIsThisForSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <PoweredBySection />
      <FinalCTASection />
    </div>
  );
}
