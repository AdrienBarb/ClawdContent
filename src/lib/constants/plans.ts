export type PlanId = "starter" | "pro" | "business";
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
    id: "starter",
    name: "Starter",
    monthlyPrice: 17,
    yearlyTotalPrice: Math.round(17 * 12 * YEARLY_DISCOUNT * 100) / 100,
    yearlyMonthlyEquivalent:
      Math.round(((17 * 12 * YEARLY_DISCOUNT) / 12) * 100) / 100,
    socialAccountLimit: 2,
    socialAccountLabel: "2 social accounts",
    imageCreditsPerMonth: 0,
    hasTrial: false,
    trialDays: 0,
    highlighted: false,
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 37,
    yearlyTotalPrice: Math.round(37 * 12 * YEARLY_DISCOUNT * 100) / 100,
    yearlyMonthlyEquivalent:
      Math.round(((37 * 12 * YEARLY_DISCOUNT) / 12) * 100) / 100,
    socialAccountLimit: 6,
    socialAccountLabel: "6 social accounts",
    imageCreditsPerMonth: 10,
    hasTrial: false,
    trialDays: 0,
    highlighted: true,
    cta: "Get Started",
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 79,
    yearlyTotalPrice: Math.round(79 * 12 * YEARLY_DISCOUNT * 100) / 100,
    yearlyMonthlyEquivalent:
      Math.round(((79 * 12 * YEARLY_DISCOUNT) / 12) * 100) / 100,
    socialAccountLimit: 13,
    socialAccountLabel: "All 13 social accounts",
    imageCreditsPerMonth: 20,
    hasTrial: false,
    trialDays: 0,
    highlighted: false,
    cta: "Get Started",
  },
];

export interface SharedFeature {
  label: string;
  includedIn: PlanId[] | "all";
}

export const SHARED_FEATURES: SharedFeature[] = [
  { label: "Personal AI social media manager", includedIn: "all" },
  { label: "Private, isolated instance", includedIn: "all" },
  { label: "24/7 always-on", includedIn: "all" },
  { label: "Unlimited posts", includedIn: "all" },
  { label: "AI-adapted content per platform", includedIn: "all" },
  { label: "AI content generation", includedIn: "all" },
  { label: "Scheduling & automation", includedIn: "all" },
  { label: "Brand voice memory", includedIn: "all" },
  { label: "Web research", includedIn: "all" },
  { label: "Content calendar planning", includedIn: "all" },
  { label: "Strategy advice", includedIn: "all" },
  { label: "AI image generation", includedIn: ["pro", "business"] },
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

// Map env var price IDs to plan + interval
const STRIPE_PRICE_ENV_MAP: Record<string, { envVar: string }> = {
  "starter-monthly": { envVar: "STRIPE_PRICE_STARTER_MONTHLY" },
  "starter-yearly": { envVar: "STRIPE_PRICE_STARTER_YEARLY" },
  "pro-monthly": { envVar: "STRIPE_PRICE_PRO_MONTHLY" },
  "pro-yearly": { envVar: "STRIPE_PRICE_PRO_YEARLY" },
  "business-monthly": { envVar: "STRIPE_PRICE_BUSINESS_MONTHLY" },
  "business-yearly": { envVar: "STRIPE_PRICE_BUSINESS_YEARLY" },
};

export function getStripePriceId(
  planId: PlanId,
  interval: BillingInterval
): string {
  const key = `${planId}-${interval}`;
  const mapping = STRIPE_PRICE_ENV_MAP[key];
  if (!mapping) throw new Error(`No price mapping for ${key}`);

  const priceId = process.env[mapping.envVar];
  if (!priceId)
    throw new Error(`Missing env var ${mapping.envVar} for ${key}`);

  return priceId;
}

export function getPlanFromStripePriceId(
  stripePriceId: string
): { planId: PlanId; interval: BillingInterval } | null {
  for (const [key, mapping] of Object.entries(STRIPE_PRICE_ENV_MAP)) {
    const envValue = process.env[mapping.envVar];
    if (envValue === stripePriceId) {
      const [planId, interval] = key.split("-") as [PlanId, BillingInterval];
      return { planId, interval };
    }
  }
  return null;
}
