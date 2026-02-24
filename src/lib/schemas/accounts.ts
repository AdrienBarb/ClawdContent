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
