import { z } from "zod";

/** Strict 6-digit hex color (lowercase preferred). Shared with the brand
 * identity service and the onboarding color-picker UI. */
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export function isHex6(value: string): boolean {
  return HEX_RE.test(value);
}

const hexColor = z
  .string()
  .regex(HEX_RE, "Color must be a 6-digit hex like #ec6f5b");

/** Zod v4's `.url()` accepts any scheme the URL constructor parses, including
 * `javascript:`, `data:`, `vbscript:`, `file:`. For values we will render in
 * an `<img>` tag or pass to a third-party scraper, only allow http/https. */
const safeHttpUrl = z
  .string()
  .url()
  .max(2048, "URL is too long")
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "https:" || protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Only http(s) URLs are allowed" }
  );

export const brandIdentitySchema = z.object({
  logoUrl: safeHttpUrl.nullable(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor.nullable(),
  brandPhotos: z.array(safeHttpUrl).max(5),
  styleNotes: z.string().max(500).nullable(),
});

export type BrandIdentity = z.infer<typeof brandIdentitySchema>;

export const saveBrandIdentitySchema = z.object({
  brandIdentity: brandIdentitySchema,
});
