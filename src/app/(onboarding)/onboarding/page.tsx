import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/db/prisma";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

// Auth + completion are guarded in layout.tsx. Here we just read the saved
// step so the client wizard renders the right screen on first paint
// (resumability) before nuqs/polling take over.
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { onboardingStep: true },
      })
    : null;

  // nuqs reads search params via useSearchParams — needs a Suspense boundary
  // (matches the pattern used elsewhere, e.g. the dashboard layout).
  return (
    <Suspense fallback={null}>
      <OnboardingWizard initialStep={user?.onboardingStep ?? 1} />
    </Suspense>
  );
}
