import type { OnboardingGoal } from "@/lib/schemas/onboarding";

/**
 * The paywall "aha" view-model returned by `GET /api/onboarding/plan`.
 *
 * It is purely the brand-level growth strategy ("after", from
 * `User.businessStrategy`) — built early in onboarding from the knowledgeBase +
 * goal, with NO social data, so it's ready instantly and `status` flips to
 * `"ready"` the moment it lands. There is deliberately NO before/after
 * comparison: this step reveals only the strategy. `account` carries the primary
 * connected handle (for the header fallback / loading copy) and is `null` when no
 * supported account is connected. Output-only — assembled server-side, never sent
 * back in. While the strategy is still being authored, `status` is `"building"`
 * (with `after: null`) and the client polls.
 *
 * Provider/engine names never appear here (no `model` field) — same rule as
 * `ClientStrategy` (see CLAUDE.md: no AI branding).
 */

export type PaywallPlanStatus = "building" | "ready";

export type FormatAction = "start" | "increase" | "maintain" | "reduce";

export interface PlanFormatItem {
  /** Raw strategy format key ("reel", "carousel", …). */
  format: string;
  /** Human label ("Reels", "Carousels", …). */
  label: string;
  action: FormatAction;
  rationale: string;
}

export interface PlanPillar {
  name: string;
  description: string;
}

export interface PlanIdea {
  idea: string;
  format: string;
  formatLabel: string;
  pillar: string;
}

/** The plan we've already written — null while still building. */
export interface PaywallPlanAfter {
  postsPerWeek: number;
  cadenceRationale: string;
  /** Formats we'll be running (start/increase/maintain), Reels-first, ≤3. */
  targetFormatLabels: string[];
  /** Formats we'll newly add or ramp (start/increase only). */
  newFormatLabels: string[];
  formatPlan: PlanFormatItem[];
  pillars: PlanPillar[];
  /** First few concrete, business-specific post ideas. */
  ideas: PlanIdea[];
  doubleDown: string[];
  stop: string[];
  positioning: string;
  summary: string;
}

export interface PaywallPlan {
  status: PaywallPlanStatus;
  /** The primary connected account, or null when none is connected. */
  account: { platform: string; handle: string } | null;
  businessName: string | null;
  goal: OnboardingGoal | null;
  /** Verb phrase for copy ("get found by new customers"), or null. */
  goalLabel: string | null;
  after: PaywallPlanAfter | null;
}

/** Subscribe-footer A/B variant (see `services/paywallExperiment.ts`). */
export type PaywallVariant = "control" | "discount";

/**
 * What `GET /api/onboarding/plan` actually returns: the pure view-model plus
 * the visitor's footer A/B variant, resolved at the route boundary. `discount`
 * is only ever served when a real intro coupon is configured server-side.
 */
export interface PaywallPlanResponse extends PaywallPlan {
  paywallVariant: PaywallVariant;
}
