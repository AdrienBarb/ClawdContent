import { Suspense } from "react";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";
import BillingUnsubscribed from "@/components/dashboard/BillingUnsubscribed";
import ChangePlanSection from "@/components/dashboard/ChangePlanSection";
import PageHeader from "@/components/dashboard/PageHeader";
import { getPlan, type PlanId } from "@/lib/constants/plans";

async function BillingContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription) {
    return <BillingUnsubscribed />;
  }

  const isActive =
    subscription.status === "active" || subscription.status === "trialing";

  const planId = (subscription.planId as PlanId) || "pro";
  const plan = getPlan(planId);

  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId: session.user.id },
    include: { socialAccounts: { where: { status: "active" } } },
  });

  const activeAccountCount = lateProfile?.socialAccounts?.length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription and billing details."
      />

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">
          Current Plan
        </p>

        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">{plan.name}</h2>
        </div>

        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-4xl font-semibold text-gray-900">
            ${plan.monthlyPrice}
          </span>
          <span className="text-gray-400 text-lg">/month</span>
        </div>

        {/* Usage */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">
              Social accounts: {activeAccountCount} / {plan.socialAccountLimit}
            </p>
          </div>
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                activeAccountCount >= plan.socialAccountLimit
                  ? "bg-amber-400"
                  : "bg-primary"
              }`}
              style={{
                width: `${Math.min(
                  (activeAccountCount / plan.socialAccountLimit) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isActive ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          <span className="text-sm font-medium text-gray-900 capitalize">
            {subscription.status}
          </span>
        </div>

        {subscription.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mb-5">
            {subscription.cancelAtPeriodEnd ? "Cancels on " : "Renews on "}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString(
              "en-US",
              { month: "long", day: "numeric", year: "numeric" }
            )}
          </p>
        )}

        <div className="pt-5 border-t border-gray-100">
          <ManageSubscriptionButton />
        </div>
      </div>

      {/* Change Plan */}
      {isActive && <ChangePlanSection currentPlanId={planId} />}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
