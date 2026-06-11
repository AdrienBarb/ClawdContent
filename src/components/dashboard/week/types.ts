import type { MediaItem } from "@/lib/schemas/mediaItems";

/** Zernio post as returned by GET /api/posts (committed schedule / published). */
export interface ZernioPost {
  id: string;
  content: string;
  platforms: {
    platform: string;
    accountId?: string;
    platformPostUrl?: string;
    errorMessage?: string;
  }[];
  mediaItems?: { url: string; type: string }[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

/** One renderable entry on the week timeline. */
export interface TimelineItem {
  /** "zernio" = committed on Zernio; "local" = staged PostSuggestion. */
  kind: "zernio" | "local";
  id: string;
  platform: string;
  username: string;
  content: string;
  contentType: string;
  mediaItems: MediaItem[];
  scheduledAt: string | null;
  /** "scheduled" | "draft" | "needs_media" | "failed" */
  status: string;
}
