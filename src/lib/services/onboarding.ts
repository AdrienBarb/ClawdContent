import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/db/prisma";
import { scrapeWebsite } from "@/lib/firecrawl/client";
import { mapFirecrawlBranding, mergeBranding } from "@/lib/firecrawl/branding";
import {
  analyzeLLMSchema,
  knowledgeBaseSchema,
  type Branding,
  type KnowledgeBase,
} from "@/lib/schemas/knowledgeBase";
import type {
  OnboardingSaveInput,
  VoiceProfile,
  WebsiteAnalysisState,
} from "@/lib/schemas/onboarding";
import type { BrandingProfile, DocumentMetadata } from "@mendable/firecrawl-js";

export type ScrapeAndExtractResult =
  | { success: true; knowledgeBase: KnowledgeBase }
  | { success: false; errorCode: "unreachable" | "extraction_failed" };

/**
 * Scrape a website with Firecrawl and extract a knowledge base with Claude.
 * Visual branding (colours, fonts, logo) comes from Firecrawl; the model only
 * infers the verbal identity (voice / style / tagline). Runs inside the
 * `onboarding/website-analyze` Inngest job — never blocks a request.
 *
 * Lifted out of the old synchronous `POST /api/onboarding/analyze` route.
 */
export async function scrapeAndExtractKnowledgeBase(
  websiteUrl: string
): Promise<ScrapeAndExtractResult> {
  let firecrawlBranding: BrandingProfile | undefined;
  let firecrawlMetadata: DocumentMetadata | undefined;
  let contentToAnalyze = "";

  try {
    const { markdown, title, branding, metadata } =
      await scrapeWebsite(websiteUrl);
    firecrawlBranding = branding;
    firecrawlMetadata = metadata;
    contentToAnalyze += `Website content from ${websiteUrl}:\n`;
    if (title) contentToAnalyze += `Page title: ${title}\n`;
    contentToAnalyze += markdown;
  } catch (err) {
    console.warn(
      `[onboarding] ⚠️  scrape failed for ${websiteUrl}: ${err instanceof Error ? err.message : err}`
    );
    return { success: false, errorCode: "unreachable" };
  }

  try {
    const { object: llm } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: analyzeLLMSchema,
      prompt: `You are analyzing a small business to understand what they do and how they sound. Extract structured information from the following content.

Be concise and factual. Use the business owner's language and write in the same language as the content.
For "businessName", extract the business or brand name.
For "description", write a clear 1-2 sentence summary of what this business does.
For "services", list the main products or services offered.
For "brandVoice", write ONE sentence describing the brand's tone of voice (e.g. "Warm and conversational, speaks directly to busy parents").
For "styleAdjectives", give 3-5 adjectives capturing the brand's overall style (e.g. "playful", "premium", "down-to-earth"). If the content is too thin to tell, return fewer rather than inventing.
For "tagline", extract the brand's tagline or slogan if one is evident. Return an empty string if there is none — do not invent one.

Content to analyze:
${contentToAnalyze}`,
    });

    const visualBranding = mapFirecrawlBranding(
      firecrawlBranding,
      firecrawlMetadata
    );
    const branding = mergeBranding(visualBranding, llm);

    return {
      success: true,
      knowledgeBase: {
        businessName: llm.businessName,
        description: llm.description,
        services: llm.services,
        source: "website",
        branding,
      },
    };
  } catch (err) {
    console.warn(
      `[onboarding] ⚠️  extraction failed for ${websiteUrl}: ${err instanceof Error ? err.message : err}`
    );
    return { success: false, errorCode: "extraction_failed" };
  }
}

/** An empty knowledge base for the manual-fallback path (scrape failed). */
export function blankKnowledgeBase(source: KnowledgeBase["source"]): KnowledgeBase {
  return {
    businessName: "",
    description: "",
    services: [],
    source,
    branding: null,
  };
}

/** Screen 3 — overwrite the editable business facts on the knowledge base. */
export function mergeInfoEdit(
  base: KnowledgeBase,
  edit: { businessName?: string; description?: string; services?: string[] }
): KnowledgeBase {
  return {
    ...base,
    businessName: edit.businessName ?? base.businessName,
    description: edit.description ?? base.description,
    services: edit.services ?? base.services,
  };
}

/**
 * Screen 4 — fuse the edited visual branding with the verbal fields.
 *
 * Logo-clobber guard: when the visual patch omits `logoUrl` (key absent), keep
 * the existing one. An explicit `null` still removes it. This stops a save that
 * doesn't carry the logo from wiping a user-uploaded one.
 */
export function mergeBrandingEdit(
  base: KnowledgeBase,
  patch: { branding?: Branding; voiceProfile?: VoiceProfile }
): KnowledgeBase {
  const baseBranding: Branding = base.branding ?? {};
  let next: Branding = baseBranding;

  if (patch.branding) {
    next = {
      ...baseBranding,
      colors: patch.branding.colors,
      fonts: patch.branding.fonts,
      faviconUrl:
        patch.branding.faviconUrl !== undefined
          ? patch.branding.faviconUrl
          : (baseBranding.faviconUrl ?? null),
      logoUrl:
        patch.branding.logoUrl !== undefined
          ? patch.branding.logoUrl
          : (baseBranding.logoUrl ?? null),
    };
  }

  if (patch.voiceProfile) {
    const { tone, audience, style, tagline } = patch.voiceProfile;
    const styleAdjectives = (style ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const voice = {
      tone: tone?.trim() || undefined,
      energy: next.voice?.energy,
      audience: audience?.trim() || undefined,
    };
    const hasVoice = !!(voice.tone || voice.energy || voice.audience);
    next = {
      ...next,
      voice: hasVoice ? voice : undefined,
      styleAdjectives: styleAdjectives.length > 0 ? styleAdjectives : undefined,
      tagline: tagline?.trim() || undefined,
    };
  }

  const hasAnything =
    next.colors?.length ||
    next.fonts?.length ||
    next.logoUrl ||
    next.faviconUrl ||
    next.voice ||
    next.styleAdjectives?.length ||
    next.tagline;

  return { ...base, branding: hasAnything ? next : null };
}

/** Tolerant parse — a legacy/partial KB or draft shouldn't throw a 500. */
function safeKnowledgeBase(raw: unknown): KnowledgeBase | null {
  if (!raw) return null;
  const parsed = knowledgeBaseSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Screens 2–5 partial save. Persists the goal (screen 3) and/or selects the KB
 * base (confirmed KB → background draft → blank), merges whatever business /
 * branding fields are present, and advances the step. Step never regresses (a
 * stale URL could post a lower step).
 */
export async function saveOnboardingProgress(
  userId: string,
  input: OnboardingSaveInput
): Promise<void> {
  const hasInfo =
    input.businessName !== undefined ||
    input.description !== undefined ||
    input.services !== undefined;
  const hasBranding =
    input.branding !== undefined || input.voiceProfile !== undefined;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      knowledgeBase: true,
      websiteUrl: true,
      websiteAnalysis: true,
      onboardingStep: true,
    },
  });

  let nextKb: KnowledgeBase | undefined;
  if (hasInfo || hasBranding) {
    const stored = safeKnowledgeBase(user?.knowledgeBase);
    const analysis = user?.websiteAnalysis as WebsiteAnalysisState | null;
    const draft = safeKnowledgeBase(analysis?.draft);
    let merged =
      stored ??
      draft ??
      blankKnowledgeBase(user?.websiteUrl ? "website" : "manual");

    if (hasInfo) {
      merged = mergeInfoEdit(merged, {
        businessName: input.businessName,
        description: input.description,
        services: input.services,
      });
    }
    if (hasBranding) {
      merged = mergeBrandingEdit(merged, {
        branding: input.branding,
        voiceProfile: input.voiceProfile,
      });
    }
    nextKb = merged;
  }

  const nextStep =
    input.step !== undefined
      ? Math.max(user?.onboardingStep ?? 1, input.step)
      : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(nextKb ? { knowledgeBase: nextKb } : {}),
      ...(nextStep !== undefined ? { onboardingStep: nextStep } : {}),
      ...(input.goal !== undefined ? { onboardingGoal: input.goal } : {}),
    },
  });
}
