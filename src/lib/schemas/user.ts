import { z } from "zod";

const validTimezones = new Set(Intl.supportedValuesOf("timeZone"));

export const timezoneSchema = z.object({
  timezone: z.string().refine((tz) => validTimezones.has(tz), {
    message: "Invalid timezone",
  }),
});
