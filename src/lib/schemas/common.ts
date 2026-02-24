import { z } from "zod";

// Common validation schemas

export const emailSchema = z.string().email("Invalid email address");

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const idSchema = z.string().min(1, "ID is required");

// Waitlist schema
export const waitlistSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
