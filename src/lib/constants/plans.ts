export type PlanId = "starter" | "pro" | "business"; // starter/business kept for legacy subscribers
export type BillingInterval = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  yearlyTotalPrice: number;
  yearlyMonthlyEquivalent: number;
  socialAccountLimit: number;
  socialAccountLabel: string;
  imageCreditsPerMonth: number;
  hasTrial: boolean;
  trialDays: number;
  highlighted: boolean;
  cta: string;
}

const YEARLY_DISCOUNT = 0.7; // 30% off

export const PLANS: Plan[] = [
  {
    id: "pro",
    name: "PostClaw",
    monthlyPrice: 49,
    yearlyTotalPrice: Math.round(49 * 12 * YEARLY_DISCOUNT * 100) / 100,
    yearlyMonthlyEquivalent:
      Math.round(((49 * 12 * YEARLY_DISCOUNT) / 12) * 100) / 100,
    socialAccountLimit: 9,
    socialAccountLabel: "All social accounts (up to 9)",
    imageCreditsPerMonth: 10,
    hasTrial: false,
    trialDays: 0,
    highlighted: true,
    cta: "Start for free",
  },
];

export const DEFAULT_PLAN_ID: PlanId = "pro";

export const FREE_POST_LIMIT = 5;

export interface SharedFeature {
  label: string;
  includedIn: PlanId[] | "all";
}

export const SHARED_FEATURES: SharedFeature[] = [
  { label: "Unlimited posts", includedIn: "all" },
  { label: "AI content adapted per platform", includedIn: "all" },
  { label: "Scheduling & automation", includedIn: "all" },
  { label: "Brand voice memory", includedIn: "all" },
  { label: "Content calendar planning", includedIn: "all" },
  { label: "Performance analytics", includedIn: "all" },
  { label: "AI image generation (10/month)", includedIn: "all" },
];

export function isFeatureIncluded(
  feature: SharedFeature,
  planId: PlanId
): boolean {
  if (feature.includedIn === "all") return true;
  return feature.includedIn.includes(planId);
}

export function getPlan(planId: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return plan;
}

export function getPlanImageCredits(planId: PlanId): number {
  return getPlan(planId).imageCreditsPerMonth;
}

export function getDisplayPrice(
  plan: Plan,
  interval: BillingInterval
): number {
  return interval === "yearly"
    ? plan.yearlyMonthlyEquivalent
    : plan.monthlyPrice;
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
  // Current plan — new checkouts use these
  { envVar: "STRIPE_PRICE_POSTCLAW_MONTHLY", planId: "pro", interval: "monthly" },
  { envVar: "STRIPE_PRICE_POSTCLAW_YEARLY", planId: "pro", interval: "yearly" },
  // Legacy prices — webhook resolution only (all resolve to "pro")
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
