import { anthropic } from "@/lib/anthropic/client";
import { prisma } from "@/lib/db/prisma";

export async function generateChatSuggestions(
  role: string | null,
  niche: string | null,
  topics: string[]
): Promise<string[]> {
  if (!role && !niche && topics.length === 0) {
    return [];
  }

  try {
    const profileParts: string[] = [];
    if (role) profileParts.push(`Role: ${role}`);
    if (niche) profileParts.push(`Niche/business: ${niche}`);
    if (topics.length > 0) profileParts.push(`Topics: ${topics.join(", ")}`);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are helping a social media manager tool. Given this user profile:
${profileParts.join("\n")}

Generate exactly 4 short prompt suggestions (max 10 words each) that this user could ask their AI social media manager. The suggestions should be actionable and specific to their profile — things like "Write a LinkedIn post about [relevant topic]" or "Draft a tweet announcing [something relevant]".

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
  topics: string[]
): Promise<void> {
  const suggestions = await generateChatSuggestions(role, niche, topics);
  if (suggestions.length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { chatSuggestions: suggestions },
    });
  }
}
