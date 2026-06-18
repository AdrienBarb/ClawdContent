import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { MEDIA_BUCKET } from "./constants";

/**
 * Server-side Supabase Storage adapter. Uploads run with the service-role key,
 * which bypasses RLS — so this module must never be imported into client code.
 *
 * One public bucket (`media`) holds all user media: post images/videos and
 * brand logos. Public so social platforms and the UI can fetch URLs directly
 * without signing. Per-user path prefixes (`users/{userId}/…`) give us tenant
 * isolation + cleanup on account deletion.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Base URL stamped into media URLs that LEAVE our infra — post images Zernio
// fetches from its cloud. In prod this is the cloud Supabase URL
// (= NEXT_PUBLIC_SUPABASE_URL). In local dev NEXT_PUBLIC_SUPABASE_URL is a
// 127.0.0.1 loopback Zernio can't reach, so SUPABASE_PUBLIC_URL overrides it
// with a publicly reachable origin (e.g. an ngrok tunnel). Uploads still go
// through the loopback client below — only the emitted URL changes.
const SUPABASE_PUBLIC_URL = process.env.SUPABASE_PUBLIC_URL || SUPABASE_URL;

export { MEDIA_BUCKET };

export function isStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

let cached: SupabaseClient | null = null;
function getStorageClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase storage is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** Lowercase the file extension, stripping anything non-alphanumeric. */
export function sanitizeExt(fileName?: string | null): string {
  if (!fileName) return "bin";
  const dot = fileName.lastIndexOf(".");
  const ext =
    dot >= 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return ext || "bin";
}

/** Build a per-user object path: `users/{userId}/[{sub}/]{uuid}.{ext}`. */
export function buildUserPath(
  userId: string,
  { sub, ext }: { sub?: string; ext: string }
): string {
  const prefix = sub ? `${sub}/` : "";
  return `users/${userId}/${prefix}${randomUUID()}.${ext}`;
}

/** Deterministic public URL — matches Supabase's `/object/public/` route. */
export function getPublicUrl(path: string): string {
  if (!SUPABASE_PUBLIC_URL) {
    throw new Error(
      "Supabase storage is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_PUBLIC_URL)"
    );
  }
  const base = SUPABASE_PUBLIC_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/**
 * Mint a short-lived signed upload URL so the browser can upload large files
 * directly to Supabase (Vercel serverless body limits make proxying videos
 * through our routes a non-starter).
 */
export async function createSignedUpload(
  path: string
): Promise<{ path: string; token: string; publicUrl: string }> {
  const supabase = getStorageClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw error ?? new Error("Failed to create signed upload URL");
  }
  return { path: data.path, token: data.token, publicUrl: getPublicUrl(data.path) };
}

/** Server-side upload from a buffer (used for small assets like brand logos). */
export async function uploadBuffer(
  path: string,
  body: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const supabase = getStorageClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, body, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw error;
  return getPublicUrl(path);
}

/** Delete objects by their bucket-relative paths (no-op for an empty list). */
export async function removeObjects(paths: string[]): Promise<void> {
  const cleaned = paths.filter(Boolean);
  if (cleaned.length === 0) return;
  const supabase = getStorageClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(cleaned);
  if (error) throw error;
}
