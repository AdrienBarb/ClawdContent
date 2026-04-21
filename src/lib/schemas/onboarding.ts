import { z } from "zod";

export const onboardingRoles = [
  "solopreneur",
  "startup_founder",
  "freelancer",
  "content_creator",
  "marketing_manager",
] as const;

export const onboardingTopicOptions = [
  "AI",
  "Marketing",
  "Design",
  "Development",
  "Business",
  "Finance",
  "Health",
  "Productivity",
  "E-commerce",
  "Education",
  "Crypto",
  "Lifestyle",
] as const;

export const onboardingGoals = [
  "get_clients",
  "personal_brand",
  "product_awareness",
  "community",
  "visibility",
] as const;

export const onboardingSchema = z.object({
  role: z.enum(onboardingRoles).optional(),
  niche: z.string().max(200).optional(),
  topics: z.array(z.string().max(50)).max(10).optional(),
  goal: z.enum(onboardingGoals).optional(),
});
