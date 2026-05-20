import { z } from "zod";

export const checkoutSchema = z.object({
  planId: z.literal("pro"),
  interval: z.enum(["monthly", "yearly"]),
});

export const changePlanSchema = z.object({
  planId: z.literal("pro"),
  interval: z.enum(["monthly", "yearly"]),
});
