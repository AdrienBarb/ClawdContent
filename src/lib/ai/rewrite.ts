import { z } from "zod";
import type { Insights } from "@/lib/schemas/insights";

export const rewriteOutputSchema = z.object({
  content: z.string(),
});

const instructionMap: Record<string, string> = {
  rewrite: "Rewrite this post with a fresh angle while keeping the same message and tone.",
  shorter: "Make this post shorter and more concise. Keep the key message.",
  longer: "Expand this post with more detail while keeping it engaging. Don't make it too long.",
  casual: "Rewrite this post in a more casual, friendly tone.",
  professional: "Rewrite this post in a more professional tone.",
  hashtags: "Add relevant hashtags to this post. Keep the original content and add 3-5 hashtags at the end.",
  fix: "Fix any grammar and spelling mistakes in this post. Keep the same tone and meaning. If there are no mistakes, return the text as-is.",
};

const platformLimits: Record<string, string> = {
  twitter: "280 characters max",
  threads: "500 characters max",
  linkedin: "3000 characters max",
  instagram: "2200 characters max for captions",
  facebook: "63206 characters max",
  tiktok: "4000 characters max for captions",
  youtube: "5000 characters max for descriptions",
  pinterest: "500 characters max for descriptions",
  bluesky: "300 characters max",
};

const platformNames: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", twitter: "X (Twitter)",
  threads: "Threads", linkedin: "LinkedIn", tiktok: "TikTok",
  youtube: "YouTube", pinterest: "Pinterest", bluesky: "Bluesky",
};

export function buildRewritePrompt(
  content: string,
  platform: string,
  instruction: string,
  knowledgeBase: Record<string, unknown> | null,
  insights: Insights | null = null,
): string {
  const platformLabel = platformNames[platform] ?? platform;
  const limit = platformLimits[platform] ?? "";

  const businessContext = knowledgeBase
    ? `\nBusiness: ${knowledgeBase.businessName ?? "Unknown"}\nDescription: ${knowledgeBase.description ?? ""}\n`
    : "";

  const voiceContext = formatVoiceSlice(insights);

  return `You are editing a social media post for ${platformLabel}.
${businessContext}${voiceContext}
Original post:
${content}

Instruction: ${instructionMap[instruction] ?? instruction}
${limit ? `\nCharacter limit: ${limit}. Make sure the output respects this limit.` : ""}
Write the new version. Keep it natural and human-sounding. Match the business owner's voice. Do not add quotes around the content.`;
}

function formatVoiceSlice(insights: Insights | null): string {
  if (!insights || insights.meta.postsAnalyzed === 0) return "";

  const { computed, inferred } = insights;
  const blocks: string[] = [];

  blocks.push(`Voice fingerprint (computed from their actual posts):
- Average post length: ${computed.voiceStats.avgPostLengthChars} characters
- Posts with emoji: ${Math.round(computed.voiceStats.emojiDensity * 100)}%
- Hashtags per post: ${computed.voiceStats.hashtagsPerPost}
- Posts with a question: ${Math.round(computed.voiceStats.questionFrequency * 100)}%`);

  if (computed.extractedHashtags.length > 0) {
    blocks.push(
      `Hashtags they actually use: ${computed.extractedHashtags
        .slice(0, 5)
        .map((h) => h.tag)
        .join(", ")}`
    );
  }

  if (inferred) {
    const patterns = inferred.performingPatterns.slice(0, 2).join("; ");
    blocks.push(
      `Tone: ${inferred.toneSummary}${patterns ? `\nPatterns that perform: ${patterns}` : ""}`
    );
  }

  return `\n${blocks.join("\n\n")}\n`;
}
