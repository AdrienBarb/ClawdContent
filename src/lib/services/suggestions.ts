import { anthropic } from "@/lib/anthropic/client";
import { prisma } from "@/lib/db/prisma";

export async function generateChatSuggestions(
  role: string | null,
  niche: string | null,
  topics: string[],
  goal: string | null = null
): Promise<string[]> {
  if (!role && !niche && !goal && topics.length === 0) {
    return [];
  }

  try {
    const profileParts: string[] = [];
    if (role) profileParts.push(`Role: ${role}`);
    if (niche) profileParts.push(`Niche/business: ${niche}`);
    if (goal) profileParts.push(`Main goal: ${goal.replace(/_/g, " ")}`);
    if (topics.length > 0) profileParts.push(`Topics: ${topics.join(", ")}`);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are helping a social media manager tool. Given this user profile:
${profileParts.join("\n")}

Generate exactly 4 short prompt suggestions (max 10 words each) that this user could ask their AI social media manager. The suggestions should be varied — mix content creation, strategy, and analytics. Do NOT mention any platform name (no "LinkedIn post", "tweet", "Thread"). One suggestion should be about strategy or planning, one about content creation, one about analytics or timing, and one that's a creative content idea specific to their profile. Examples: "Help me define my content strategy", "Write a post about my latest project", "When is the best time to post?", "What should I talk about this week?".

Return ONLY a JSON array of 4 strings, no other text.`,
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";
    const text = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 4).map(String);
    }
    return [];
  } catch (error) {
    console.error("Failed to generate chat suggestions:", error);
    return [];
  }
}

export async function generateAndStoreSuggestions(
  userId: string,
  role: string | null,
  niche: string | null,
  topics: string[],
  goal: string | null = null
): Promise<void> {
  const suggestions = await generateChatSuggestions(role, niche, topics, goal);
  if (suggestions.length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { chatSuggestions: suggestions },
    });
  }
}
