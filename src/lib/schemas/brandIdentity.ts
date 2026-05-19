import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex like #ec6f5b");

export const brandIdentitySchema = z.object({
  logoUrl: z.string().url().nullable(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor.nullable(),
  brandPhotos: z.array(z.string().url()),
  styleNotes: z.string().nullable(),
});

export type BrandIdentity = z.infer<typeof brandIdentitySchema>;

export const saveBrandIdentitySchema = z.object({
  brandIdentity: brandIdentitySchema,
});
