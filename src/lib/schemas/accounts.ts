import { z } from "zod";

export const connectAccountSchema = z.object({
  platform: z.enum(["instagram", "facebook"]),
  returnTo: z.string().optional(),
  // When true, OAuth returns to the onboarding-scoped callback bridge
  // (/onboarding/connected) instead of the dashboard one — the user never
  // leaves the onboarding shell while connecting.
  onboarding: z.boolean().optional(),
});

export const disconnectAccountSchema = z.object({
  accountId: z.string().min(1),
});
