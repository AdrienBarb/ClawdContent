import { z } from "zod";

export const connectAccountSchema = z.object({
  platform: z.enum([
    "twitter",
    "linkedin",
    "instagram",
    "facebook",
    "tiktok",
    "youtube",
    "pinterest",
    "threads",
    "bluesky",
    "reddit",
    "telegram",
    "snapchat",
    "googlebusiness",
  ]),
  returnTo: z.string().optional(),
});

export const disconnectAccountSchema = z.object({
  accountId: z.string().min(1),
});
