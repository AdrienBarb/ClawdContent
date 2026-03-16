import { z } from "zod";

export const botImageSchema = z.object({
  image: z.string().min(1).startsWith("ghcr.io/"),
});
