import { z } from "zod";

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
): string {
  const platformLabel = platformNames[platform] ?? platform;
  const limit = platformLimits[platform] ?? "";

  const businessContext = knowledgeBase
    ? `\nBusiness: ${knowledgeBase.businessName ?? "Unknown"}\nDescription: ${knowledgeBase.description ?? ""}\n`
    : "";

  return `You are editing a social media post for ${platformLabel}.
${businessContext}
Original post:
${content}

Instruction: ${instructionMap[instruction] ?? instruction}
${limit ? `\nCharacter limit: ${limit}. Make sure the output respects this limit.` : ""}
Write the new version. Keep it natural and human-sounding. Match the business owner's voice. Do not add quotes around the content.`;
}
