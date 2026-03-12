import { z } from "zod";
import { onboardingRoles } from "@/lib/schemas/onboarding";

const validTimezones = new Set(Intl.supportedValuesOf("timeZone"));

export const timezoneSchema = z.object({
  timezone: z.string().refine((tz) => validTimezones.has(tz), {
    message: "Invalid timezone",
  }),
});

export const userContextSchema = z.object({
  role: z.enum(onboardingRoles).nullable(),
  niche: z.string().max(200).nullable(),
  topics: z.array(z.string().max(50)).max(10),
});
