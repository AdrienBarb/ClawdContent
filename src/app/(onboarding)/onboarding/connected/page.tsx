import { Suspense } from "react";
import OnboardingConnectedBridge from "@/components/onboarding/OnboardingConnectedBridge";

// OAuth return target for onboarding social connects. Auth + completion are
// guarded by (onboarding)/layout.tsx. The bridge reads search params via
// useSearchParams, which needs a Suspense boundary in the App Router.
export default function OnboardingConnectedPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingConnectedBridge />
    </Suspense>
  );
}
