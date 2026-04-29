// Internal "points" model. The user never sees raw points — the UI shows
// only a percentage of the period budget remaining. This lets us add new
// AI action types later (analysis, strategy, etc.) without breaking the UX
// or splitting the wallet into multiple compartments.

export type UsageType = "draft_generation" | "rewrite";

// Cost in points per action. Roughly proportional to Anthropic spend so
// margins stay sane regardless of usage mix:
//   - draft_generation: heavy (~$0.08 / call, up to 14 posts) → 2 points
//   - rewrite:          light (~$0.01 / call)                → 1 point
// Add new types here when new metered actions ship.
export const ACTION_COST: Record<UsageType, number> = {
  draft_generation: 2,
  rewrite: 1,
};

// Period budgets, expressed in points.
//   FREE   = 10 points  → 5 generations max OR 10 rewrites OR a mix
//   PRO    = 500 points → 250 generations max OR 500 rewrites OR a mix
//   TOPUP  = 100 points (+~$0.04 COGS per point at the heavy end)
export const FREE_LIFETIME_POINTS = 10;
export const PRO_PERIOD_POINTS = 500;
export const TOPUP_PACK_POINTS = 100;
export const TOPUP_PACK_PRICE_USD = 9;

export function getCap(isPaid: boolean): number {
  return isPaid ? PRO_PERIOD_POINTS : FREE_LIFETIME_POINTS;
}

export function pointsFor(type: UsageType, count: number = 1): number {
  return ACTION_COST[type] * count;
}
