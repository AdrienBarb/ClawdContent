import { Suspense } from "react";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Skeleton } from "@/components/ui/skeleton";

async function BillingContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription) {
    redirect("/");
  }

  const isActive = subscription.status === "active";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Billing
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription and billing details.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">
          Current Plan
        </p>

        <div className="flex items-baseline gap-1 mb-5">
          <span className="text-4xl font-semibold text-gray-900">$39</span>
          <span className="text-gray-400 text-lg">/month</span>
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
          <p className="text-sm text-gray-400">
            To manage your subscription, cancel, or update your payment
            method, visit your Stripe billing portal (contact support for the
            link).
          </p>
        </div>
      </div>
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
