import HeroSection from "@/components/sections/HeroSection";
import PainSection from "@/components/sections/PainSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import CapabilitiesSection from "@/components/sections/CapabilitiesSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import SocialProofSection from "@/components/sections/SocialProofSection";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
import FinalCTASection from "@/components/sections/FinalCTASection";

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
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
