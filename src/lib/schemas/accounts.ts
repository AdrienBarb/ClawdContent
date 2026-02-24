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
    "mastodon",
    "reddit",
    "telegram",
    "discord",
  ]),
});

export const disconnectAccountSchema = z.object({
  accountId: z.string().min(1),
});
