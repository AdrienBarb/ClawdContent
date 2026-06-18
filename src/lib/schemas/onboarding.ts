import { z } from "zod";
import { brandingSchema, type KnowledgeBase } from "@/lib/schemas/knowledgeBase";

/**
 * Onboarding is a 5-screen resumable wizard. Progress lives on the `User` row
 * (`onboardingStep`, `websiteAnalysis`) and the completion gate is
 * `onboardingCompletedAt` (set when the user subscribes). The website
 * scrape + extraction runs in the background via Inngest, so screen 4 polls
 * `/api/onboarding/status` for the result.
 */

/**
 * Screen 1 — provide EITHER a website URL OR a short business description
 * (mutually exclusive). The website path scrapes with Firecrawl + extracts; the
 * description path extracts the knowledge base from the text alone (no scrape).
 * The UI sends only the active field, so exactly one must be present.
 */
export const onboardingStartSchema = z
  .object({
    websiteUrl: z
      .string()
      .trim()
      .url("Please enter a valid URL (e.g. https://www.yourbusiness.com)")
      .optional(),
    businessDescription: z
      .string()
      .trim()
      .min(20, "Tell us a little more — a sentence or two about your business.")
      .max(1000, "Keep it under 1000 characters.")
      .optional(),
  })
  .refine(
    (d) => [d.websiteUrl, d.businessDescription].filter(Boolean).length === 1,
    {
      message:
        "Provide either a website or a business description (not both).",
    }
  );

export type OnboardingStartInput = z.infer<typeof onboardingStartSchema>;

/**
 * Screen 3 — the user's primary social goal. Drives the content strategy we
 * build for them. Stored as a plain string on `User.onboardingGoal`.
 */
export const ONBOARDING_GOALS = [
  {
    value: "find_customers",
    label: "Find new customers",
    description: "Leads & sales — get found by people ready to buy",
  },
  {
    value: "build_community",
    label: "Build a community",
    description: "An engaged, loyal, repeat audience",
  },
  {
    value: "brand_awareness",
    label: "Grow brand awareness",
    description: "Get your name in front of more people",
  },
  {
    value: "authority",
    label: "Establish authority",
    description: "Be seen as the go-to expert in your space",
  },
] as const;

export const onboardingGoalSchema = z.enum([
  "find_customers",
  "build_community",
  "brand_awareness",
  "authority",
]);

export type OnboardingGoal = z.infer<typeof onboardingGoalSchema>;

/** Verbal branding the user edits on screen 4. `style` is a comma-separated
 *  list of adjectives, normalised in `mergeBrandingEdit`. */
export const voiceProfileSchema = z.object({
  tone: z.string().optional(),
  audience: z.string().optional(),
  style: z.string().optional(),
  tagline: z.string().optional(),
});

export type VoiceProfile = z.infer<typeof voiceProfileSchema>;

/**
 * Generic partial save used by screens 2 (step only), 3 (business facts) and
 * 4 (branding). Every data field is optional; the route merges whatever is
 * present onto the current knowledge base and advances `onboardingStep`.
 */
export const onboardingSaveSchema = z.object({
  step: z.number().int().min(1).max(6).optional(),
  goal: onboardingGoalSchema.optional(),
  businessName: z.string().optional(),
  description: z.string().optional(),
  services: z.array(z.string()).optional(),
  branding: brandingSchema.optional(),
  voiceProfile: voiceProfileSchema.optional(),
});

export type OnboardingSaveInput = z.infer<typeof onboardingSaveSchema>;

/** Persisted in `User.websiteAnalysis` by the Inngest job; read on screen 4. */
export type WebsiteAnalysisState = {
  status: "pending" | "running" | "done" | "failed";
  draft?: KnowledgeBase;
  // "unreachable" / "extraction_failed" are decided inside the job;
  // "job_failed" is written by the Inngest onFailure handler when the function
  // exhausts its retries, so the status always reaches a terminal state.
  errorCode?: "unreachable" | "extraction_failed" | "job_failed";
};

export type OnboardingAccount = {
  id: string;
  platform: string;
  username: string;
  status: string;
  analysisStatus: string;
};

/** Shape returned by `GET /api/onboarding/status` (the polling endpoint). */
export type OnboardingStatus = {
  step: number;
  isCompleted: boolean;
  /** The URL saved on screen 1 — repopulates the field when the user returns. */
  websiteUrl: string | null;
  /** The description saved on screen 1 (no-website path) — lets screen 4 re-fire
   *  analysis on "Try again" without the user retyping it. */
  businessDescription: string | null;
  /** The primary goal picked on screen 3 — repopulates the selection on return. */
  goal: OnboardingGoal | null;
  websiteAnalysis: WebsiteAnalysisState | null;
  /** Confirmed KB once screen 3 has saved; null before that. */
  knowledgeBase: KnowledgeBase | null;
  accounts: OnboardingAccount[];
  subscription: { status: string } | null;
};
