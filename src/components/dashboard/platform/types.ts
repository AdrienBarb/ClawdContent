import type { Strategy } from "@/lib/schemas/strategy";
import type { MediaItem } from "@/lib/schemas/mediaItems";

/** Hydrated PostSuggestion shape passed from the server component. */
export interface PlatformSuggestion {
  id: string;
  content: string;
  contentType: string;
  suggestedDay: number;
  suggestedHour: number;
  scheduledAt: string | null;
  imageUrl: string | null;
  approvalRequired: boolean;
  approvedAt: string | null;
  publishedExternalId: string | null;
  mediaItems: MediaItem[];
  reasoning: string | null;
}

/** Hydrated SocialAccount shape passed from the server component. */
export interface PlatformAccount {
  id: string;
  platform: string;
  username: string;
  autopublish: boolean;
  generationEnabled: boolean;
  strategyDefinedAt: string | null;
  strategy: Strategy | null;
}

export interface AccountSwitcherEntry {
  id: string;
  username: string;
}
