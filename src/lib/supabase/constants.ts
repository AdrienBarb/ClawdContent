// Shared Supabase Storage constants — safe to import from both server and
// client (no service-role key, no `server-only`). Single source of truth so
// the upload size limits can't drift between the sign route, the upload hook,
// and the upload modal.

export const MEDIA_BUCKET = "media";

export const MEDIA_SIZE_LIMITS = {
  image: 25 * 1024 * 1024, // 25 MB
  video: 200 * 1024 * 1024, // 200 MB
} as const;
