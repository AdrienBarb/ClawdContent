export interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  status: string;
  analysisStatus: string;
  lastAnalyzedAt: string | null;
}

import type { MediaItem } from "@/lib/schemas/mediaItems";

export interface Suggestion {
  id: string;
  content: string;
  contentType: string;
  suggestedDay: number;
  suggestedHour: number;
  reasoning: string | null;
  mediaItems: MediaItem[];
  scheduledAt: string | null;
  status: string;
  socialAccount: { platform: string; username: string };
}

export type View = "entry" | "platforms" | "action" | "loading" | "results";
export type Mode = "ideas" | "create";
