import { cookies } from "next/headers";
import { getPostHogClient } from "@/lib/tracking/postHogClient";
import HeroSection from "@/components/sections/HeroSection";
import PainSection from "@/components/sections/PainSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import CapabilitiesSection from "@/components/sections/CapabilitiesSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import SocialProofSection from "@/components/sections/SocialProofSection";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
import FinalCTASection from "@/components/sections/FinalCTASection";

export const dynamic = "force-dynamic";

export type HeroVariant = "control" | "test";

async function getHeroVariant(): Promise<HeroVariant> {
  const cookieStore = await cookies();
  const distinctId = cookieStore.get("postclaw_distinct_id")?.value;

  if (!distinctId) return "control";

  const posthog = getPostHogClient();
  if (!posthog) return "control";

  const variant = await posthog.getFeatureFlag(
    "hero-copy-experiment",
    distinctId
  );

  await posthog.flush();

  return variant === "test" ? "test" : "control";
}

export default async function Home() {
  const heroVariant = await getHeroVariant();

  return (
    <div className="flex flex-col">
      <HeroSection variant={heroVariant} />
      <PainSection />
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
