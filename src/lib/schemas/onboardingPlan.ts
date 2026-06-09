import type { OnboardingGoal } from "@/lib/schemas/onboarding";
import type { DataQuality } from "@/lib/schemas/insights";

/**
 * The paywall "aha" view-model returned by `GET /api/onboarding/plan`.
 *
 * It fuses the user's CURRENT state ("before", from `SocialAccount.insights`)
 * with the already-authored growth strategy ("after", from
 * `SocialAccount.strategy`) for their primary account, framed around the goal
 * they picked in onboarding. Output-only — assembled server-side, never sent
 * back in. The strategy is generated asynchronously after connect, so `status`
 * is `"building"` (with `after: null`) until it lands; the client polls.
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

export interface PlanContentMixItem {
  type: string;
  label: string;
  percentage: number;
}

/** The honest current-state diagnosis — real numbers, no empty metrics. */
export interface PaywallPlanBefore {
  /** Rounded posts/week, or null when there's no posting history. */
  postsPerWeek: number | null;
  followers: number | null;
  /** Account-wide average engagement rate (%), or null on cold-start. */
  avgEngagement: number | null;
  contentMix: PlanContentMixItem[];
  /** The dominant current format ("Photos"), or null with no posts. */
  topFormatLabel: string | null;
  hasReels: boolean;
  /** Short honest fragments ("posting about 1×/week", "mostly photos, no Reels"). */
  diagnosis: string[];
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
  account: { platform: string; handle: string };
  businessName: string | null;
  goal: OnboardingGoal | null;
  /** Verb phrase for copy ("get found by new customers"), or null. */
  goalLabel: string | null;
  dataQuality: DataQuality;
  before: PaywallPlanBefore;
  after: PaywallPlanAfter | null;
}
