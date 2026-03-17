import { z } from "zod";

export const creditTopUpSchema = z.object({
  quantity: z.number().int().min(1).max(100),
});

export type CreditTopUpInput = z.infer<typeof creditTopUpSchema>;
