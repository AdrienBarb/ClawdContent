import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import PageHeader from "@/components/dashboard/PageHeader";
import BusinessForm from "./BusinessForm";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";

export default async function BusinessPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { knowledgeBase: true, websiteUrl: true },
  });

  const rawKb = (user?.knowledgeBase ?? null) as Partial<KnowledgeBase> | null;
  const knowledgeBase: KnowledgeBase | null = rawKb
    ? {
        businessName: rawKb.businessName ?? "",
        description: rawKb.description ?? "",
        services: rawKb.services ?? [],
        source: rawKb.source ?? "legacy",
      }
    : null;

  if (!knowledgeBase) {
    return (
      <div className="space-y-8">
        <PageHeader title="My Business" />
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            No business info yet. Complete the setup from the onboarding.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Business"
        subtitle="This information helps us write posts that match your business."
      />
      <BusinessForm
        initialKnowledgeBase={knowledgeBase}
        initialWebsiteUrl={user?.websiteUrl ?? ""}
      />
    </div>
  );
}
