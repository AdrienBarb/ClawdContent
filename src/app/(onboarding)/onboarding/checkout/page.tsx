import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { computeOnboardingStatus } from "@/lib/services/onboarding";
import { CheckoutClient } from "./CheckoutClient";

interface SearchParams {
  cancelled?: string;
}

export default async function OnboardingCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/");
  }

  const status = await computeOnboardingStatus(session.user.id);

  if (status.stage === "complete") {
    redirect("/d");
  }
  if (
    status.stage === "needs_kb" ||
    status.stage === "needs_brand" ||
    status.stage === "needs_social"
  ) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const cancelled = params.cancelled === "1";

  return <CheckoutClient cancelled={cancelled} />;
}
