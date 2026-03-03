import { z } from "zod";

export const telegramTokenSchema = z.object({
  token: z
    .string()
    .regex(
      /^\d+:[A-Za-z0-9_-]{35,}$/,
      "Invalid Telegram bot token format. Expected format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    ),
});

export const botImageSchema = z.object({
  image: z.string().min(1).startsWith("ghcr.io/"),
});
