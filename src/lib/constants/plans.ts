export type PlanId = "starter" | "pro" | "business"; // starter/business kept for legacy subscribers
// "yearly" survives only so legacy Stripe price mappings still resolve in the
// webhook — new checkouts are monthly-only (yearly billing removed 2026-06-10).
export type BillingInterval = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  socialAccountLimit: number;
  socialAccountLabel: string;
  highlighted: boolean;
  cta: string;
}

export const PLANS: Plan[] = [
  {
    id: "pro",
    name: "PostClaw",
    monthlyPrice: 99,
    socialAccountLimit: 1,
    socialAccountLabel: "1 Instagram account",
    highlighted: true,
    cta: "Subscribe",
  },
];

export const DEFAULT_PLAN_ID: PlanId = "pro";

// Hard paywall: publishing requires an active subscription. Kept as a
// constant (rather than ripping out the gating) so churned/legacy users in
// /d hit the subscribe prompts instead of a dead end.
export const FREE_POST_LIMIT = 0;

export interface SharedFeature {
  label: string;
  includedIn: PlanId[] | "all";
}

export const SHARED_FEATURES: SharedFeature[] = [
  { label: "Unlimited posts", includedIn: "all" },
  { label: "Posts written for Instagram", includedIn: "all" },
  { label: "Scheduling & automation", includedIn: "all" },
  { label: "Brand voice memory", includedIn: "all" },
  { label: "Content calendar planning", includedIn: "all" },
  { label: "Performance analytics", includedIn: "all" },
];

export function isFeatureIncluded(
  feature: SharedFeature,
  planId: PlanId
): boolean {
  if (feature.includedIn === "all") return true;
  return feature.includedIn.includes(planId);
}

// Legacy plan IDs (`starter`, `business`) still appear on old Subscription rows.
// They all map to the current `pro` plan.
export function resolvePlanId(planId: string | null | undefined): PlanId {
  if (planId === "starter" || planId === "business") return "pro";
  if (planId === "pro") return "pro";
  return DEFAULT_PLAN_ID;
}

export function getPlan(planId: PlanId | string): Plan {
  const resolved = resolvePlanId(planId);
  const plan = PLANS.find((p) => p.id === resolved);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return plan;
}

// Stripe price mappings
// First match per plan+interval is used for new checkouts (getStripePriceId)
// All entries are checked for webhook resolution (getPlanFromStripePriceId)
interface StripePriceMapping {
  envVar: string;
  planId: PlanId;
  interval: BillingInterval;
}

const STRIPE_PRICES: StripePriceMapping[] = [
  // Current price — new checkouts use this ($99/mo, monthly only)
  { envVar: "STRIPE_PRICE_POSTCLAW_99_MONTHLY", planId: "pro", interval: "monthly" },
  // Legacy prices — webhook resolution only (all resolve to "pro").
  // Old $49 monthly / $411.60 yearly subscribers keep their grandfathered price.
  { envVar: "STRIPE_PRICE_POSTCLAW_MONTHLY", planId: "pro", interval: "monthly" },
  { envVar: "STRIPE_PRICE_POSTCLAW_YEARLY", planId: "pro", interval: "yearly" },
  { envVar: "STRIPE_PRICE_PRO_MONTHLY", planId: "pro", interval: "monthly" },
  { envVar: "STRIPE_PRICE_PRO_YEARLY", planId: "pro", interval: "yearly" },
  { envVar: "STRIPE_PRICE_STARTER_MONTHLY", planId: "pro", interval: "monthly" },
  { envVar: "STRIPE_PRICE_STARTER_YEARLY", planId: "pro", interval: "yearly" },
  { envVar: "STRIPE_PRICE_BUSINESS_MONTHLY", planId: "pro", interval: "monthly" },
  { envVar: "STRIPE_PRICE_BUSINESS_YEARLY", planId: "pro", interval: "yearly" },
];

export function getStripePriceId(
  planId: PlanId,
  interval: BillingInterval
): string {
  const mapping = STRIPE_PRICES.find(
    (m) => m.planId === planId && m.interval === interval
  );
  if (!mapping) throw new Error(`No price mapping for ${planId}-${interval}`);

  const priceId = process.env[mapping.envVar];
  if (!priceId)
    throw new Error(`Missing env var ${mapping.envVar}`);

  return priceId;
}

export function getPlanFromStripePriceId(
  stripePriceId: string
): { planId: PlanId; interval: BillingInterval } | null {
  for (const mapping of STRIPE_PRICES) {
    const envValue = process.env[mapping.envVar];
    if (envValue === stripePriceId) {
      return { planId: mapping.planId, interval: mapping.interval };
    }
  }
  return null;
}
