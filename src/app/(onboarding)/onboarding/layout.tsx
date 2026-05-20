import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { computeOnboardingStatus } from "@/lib/services/onboarding";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  const status = await computeOnboardingStatus(session.user.id);
  if (status.completed) {
    redirect("/d");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
