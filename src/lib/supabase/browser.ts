"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export { MEDIA_BUCKET } from "./constants";

/**
 * Browser Supabase client (anon/publishable key). Only used to push files to a
 * server-minted signed upload URL via `uploadToSignedUrl` — it never reads or
 * writes the database. The signed token (not this key) authorizes the upload.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
