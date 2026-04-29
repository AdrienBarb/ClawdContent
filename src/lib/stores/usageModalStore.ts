import { create } from "zustand";
import type { UsageLimitPayloadWire } from "@/lib/errors/UsageLimitError";

// Re-export so frontend callers (axios interceptor, modal, meter, chat
// scanner) can import a single named type without reaching into errors/.
export type UsageLimitPayload = UsageLimitPayloadWire;

interface UsageModalState {
  payload: UsageLimitPayload | null;
  open: (payload: UsageLimitPayload) => void;
  close: () => void;
}

// Single source of truth for the paywall modal. Triggered from three places:
//   1. axios interceptor on HTTP 402 (/api/posts/rewrite, etc.)
//   2. ChatPanel when a tool result has surface === "paywall_modal"
//   3. UsageMeter sidebar pill when the user clicks "Top up" / "Upgrade"
export const useUsageModalStore = create<UsageModalState>((set) => ({
  payload: null,
  open: (payload) => set({ payload }),
  close: () => set({ payload: null }),
}));
