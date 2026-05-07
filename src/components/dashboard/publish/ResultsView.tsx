"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import {
  CalendarIcon,
  TrashIcon,
  SpinnerGapIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  CheckIcon,
  ImageIcon,
  VideoCameraIcon,
  WarningIcon,
  XIcon,
  LightningIcon,
  ArrowsClockwiseIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  HashIcon,
  TextAaIcon,
  SuitcaseIcon,
  DotsSixVerticalIcon,
} from "@phosphor-icons/react";
import { getPlatform } from "@/lib/constants/platforms";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";
import { validateMediaItems } from "@/lib/services/mediaValidation";
import type { MediaItem } from "@/lib/schemas/mediaItems";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SchedulePicker } from "../SchedulePicker";
import { useConfirm, type ConfirmFn } from "@/lib/hooks/useConfirm";
import { SUGGESTIONS_QUERY_KEY } from "./queryKeys";
import type { Suggestion } from "./types";
import { MediaLightbox } from "./MediaLightbox";
import { cloudinaryThumbnail } from "./cloudinary";

// Rewrite instructions accepted by the server (see rewriteInputSchema in
// /api/suggestions/[id]/rewrite). Order here drives the dropdown order.
type RewriteInstruction =
  | "fix"
  | "rewrite"
  | "shorter"
  | "longer"
  | "hashtags"
  | "casual"
  | "professional";

const REWRITE_ACTIONS: ReadonlyArray<{
  key: RewriteInstruction;
  label: string;
  Icon: typeof CheckIcon;
}> = [
  { key: "fix", label: "Fix", Icon: CheckIcon },
  { key: "rewrite", label: "Rewrite", Icon: ArrowsClockwiseIcon },
  { key: "shorter", label: "Shorter", Icon: ArrowsInIcon },
  { key: "longer", label: "Longer", Icon: ArrowsOutIcon },
  { key: "hashtags", label: "Hashtags", Icon: HashIcon },
  { key: "casual", label: "Casual", Icon: TextAaIcon },
  { key: "professional", label: "Pro", Icon: SuitcaseIcon },
];

interface AccountLite {
  id: string;
  platform: string;
  username: string;
}

interface PlatformGroup {
  account: AccountLite;
  posts: Suggestion[];
}

function groupByAccount(
  suggestions: Suggestion[],
  accounts: AccountLite[]
): PlatformGroup[] {
  const byKey = new Map<string, Suggestion[]>();
  for (const s of suggestions) {
    const key = `${s.socialAccount.platform}|${s.socialAccount.username}`;
    const existing = byKey.get(key) ?? [];
    existing.push(s);
    byKey.set(key, existing);
  }
  // One column per connected account — even with zero drafts, so the
  // per-column "Add post" button stays reachable from a clean state.
  const groups: PlatformGroup[] = [];
  for (const account of accounts) {
    const key = `${account.platform}|${account.username}`;
    const posts = byKey.get(key) ?? [];
    groups.push({ account, posts });
  }
  return groups;
}

export function ResultsView({
  accounts,
  suggestions,
  onSchedule,
  onAction,
  onMediaChanged,
  onContentChanged,
  onAddPost,
  onBulkComplete,
  embedded = false,
  quotaRemaining,
}: {
  accounts: AccountLite[];
  suggestions: Suggestion[];
  onSchedule: (
    id: string,
    scheduledAt: string | null,
    opts?: { silent?: boolean }
  ) => Promise<boolean | void>;
  onAction: (
    action: string,
    s: Suggestion,
    opts?: { silent?: boolean }
  ) => Promise<boolean | void>;
  onMediaChanged: (id: string, mediaItems: MediaItem[]) => Promise<boolean>;
  onContentChanged: (id: string, content: string) => Promise<void>;
  onAddPost?: (account: AccountLite) => void;
  onBulkComplete?: (publishedOrScheduledCount: number) => void;
  embedded?: boolean;
  /** Free posts remaining; null = unlimited (subscribed). */
  quotaRemaining: number | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  // Synchronous guard against double-click — React state updates can't beat
  // a fast second click that fires before the next commit.
  const bulkBusyRef = useRef(false);
  // Latest snapshot of suggestions, re-read each iteration of the bulk loop
  // so mid-run edits (e.g. via the chat panel) don't ship the stale action.
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  // Registry of per-card flush functions. Each PostCard registers its own
  // flush on mount so bulk actions can drain pending debounced saves before
  // shipping content.
  const flushRegistry = useRef<Map<string, () => Promise<void>>>(new Map());
  const registerFlush = useCallback(
    (id: string, fn: () => Promise<void>) => {
      flushRegistry.current.set(id, fn);
    },
    []
  );
  const unregisterFlush = useCallback((id: string) => {
    flushRegistry.current.delete(id);
  }, []);
  const flushAllPending = useCallback(async () => {
    const fns = Array.from(flushRegistry.current.values());
    await Promise.all(fns.map((fn) => fn().catch(() => undefined)));
  }, []);

  const { confirm, dialog: confirmDialog } = useConfirm();

  // One column per connected account regardless of draft count — the
  // per-column "Add post" button must stay reachable from a clean state.
  const grouped = useMemo(
    () => groupByAccount(suggestions, accounts),
    [suggestions, accounts]
  );

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleColumn = (postIds: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = postIds.every((id) => next.has(id));
      postIds.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  // Removes the given IDs from the current selection (used after bulk runs to
  // keep failed rows still selected so the user can retry them).
  const dropFromSelection = (ids: string[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });

  const runBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0 || bulkBusyRef.current) return;
    bulkBusyRef.current = true;
    setBulkBusy(true);
    try {
      // Deletes are independent and idempotent — run them in parallel.
      const results = await Promise.allSettled(
        ids.map((id) => {
          const s = suggestions.find((x) => x.id === id);
          if (!s) return Promise.resolve(false as const);
          return onAction("delete", s, { silent: true });
        })
      );
      const successIds = ids.filter(
        (_, i) => results[i].status === "fulfilled" && results[i].value === true
      );
      dropFromSelection(successIds);
      const failed = ids.length - successIds.length;
      if (successIds.length > 0) {
        toast.success(
          `Deleted ${successIds.length} post${successIds.length === 1 ? "" : "s"}`
        );
      }
      if (failed > 0) {
        toast.error(`${failed} couldn't be deleted — still selected for retry`);
      }
      onBulkComplete?.(0);
    } finally {
      bulkBusyRef.current = false;
      setBulkBusy(false);
    }
  };

  // Send all is sequential — Zernio rate-limits per-account, and ordering
  // keeps per-row toasts predictable on failure. The server enforces the
  // free-post quota on both publish AND schedule (route.ts:141), so the
  // pre-flight trim treats them the same.
  const runSendAll = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0 || bulkBusyRef.current) return;
    bulkBusyRef.current = true;
    // Single try/finally guards every early-return and any sync throw between
    // here and the loop — without this, a thrown getPlatformConfig or a
    // rejected confirm() would leave bulkBusyRef pinned true until refresh.
    try {
      // Drain any pending debounced caption saves so the bulk run ships the
      // user's latest edits, not a stale snapshot.
      await flushAllPending();

      const snapshot = ids
        .map((id) => suggestionsRef.current.find((s) => s.id === id))
        .filter((s): s is Suggestion => Boolean(s));

      const mediaSkipped: Suggestion[] = [];
      const eligible: Suggestion[] = [];
      for (const s of snapshot) {
        const cfg = getPlatformConfig(s.socialAccount.platform);
        if (cfg.requiresMedia !== null && s.mediaItems.length === 0) {
          mediaSkipped.push(s);
        } else {
          eligible.push(s);
        }
      }

      let ready = eligible;
      let limitTrimmed: Suggestion[] = [];
      if (quotaRemaining !== null && eligible.length > quotaRemaining) {
        ready = eligible.slice(0, quotaRemaining);
        limitTrimmed = eligible.slice(quotaRemaining);
      }

      const skipReason = (media: number, limit: number): string[] => {
        const parts: string[] = [];
        if (media > 0) parts.push(`${media} missing media`);
        if (limit > 0) parts.push(`${limit} over free plan limit`);
        return parts;
      };

      if (ready.length === 0) {
        const reasons = skipReason(mediaSkipped.length, limitTrimmed.length);
        toast.error(
          reasons.length > 0
            ? `Nothing to send — ${reasons.join(", ")}`
            : "Nothing to send"
        );
        return;
      }

      const reasons = skipReason(mediaSkipped.length, limitTrimmed.length);
      const ok = await confirm({
        title: `Send ${ready.length} post${ready.length === 1 ? "" : "s"}?`,
        description:
          reasons.length > 0
            ? `${reasons.join(", ")} will be skipped.`
            : "This will publish or schedule each post immediately.",
        confirmLabel: "Send all",
      });
      if (!ok) return;

      setBulkBusy(true);
      setBulkProgress({ current: 0, total: ready.length });
      const successIds: string[] = [];
      let sentCount = 0;
      for (let i = 0; i < ready.length; i++) {
        const id = ready[i].id;
        setBulkProgress({ current: i + 1, total: ready.length });
        // Re-read latest — the user can edit a draft mid-run (chat panel,
        // per-card schedule picker), and `scheduledAt` decides the action.
        const fresh = suggestionsRef.current.find((x) => x.id === id);
        if (!fresh) continue;
        const ok = await onAction(
          fresh.scheduledAt ? "schedule" : "publish",
          fresh,
          { silent: true }
        );
        if (ok) {
          successIds.push(id);
          sentCount += 1;
        }
      }
      dropFromSelection(successIds);
      const failed = ready.length - successIds.length;
      if (sentCount > 0) {
        toast.success(
          `Sent ${sentCount} post${sentCount === 1 ? "" : "s"}`
        );
      }
      if (failed > 0) {
        toast.error(`${failed} couldn't be sent — still selected for retry`);
      }
      const skipParts = skipReason(mediaSkipped.length, limitTrimmed.length);
      if (skipParts.length > 0) {
        const totalSkipped = mediaSkipped.length + limitTrimmed.length;
        toast.error(`${totalSkipped} skipped — ${skipParts.join(", ")}`);
      }
      onBulkComplete?.(sentCount);
    } finally {
      bulkBusyRef.current = false;
      setBulkBusy(false);
      setBulkProgress(null);
    }
  };

  return (
    /* Standalone (wizard) mode breaks out of layout padding and owns its own
       100dvh scroll container so column headers can be sticky top-0.
       Embedded mode renders inline within the page scroll — no breakout, no
       full-height clamp, no sticky column headers. */
    <div
      className={
        embedded
          ? "flex flex-col min-w-0"
          : "-mx-8 -my-6 flex flex-col min-w-0 h-[calc(100dvh-3.5rem)] md:h-[100dvh] overflow-hidden"
      }
    >
      {/* Board — standalone owns its own scroll container; embedded scrolls with the page. */}
      {grouped.length === 0 ? (
        embedded ? null : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Connect a social account to get started.
            </p>
          </div>
        )
      ) : (
        <div
          className={
            embedded
              ? "min-w-0 overflow-x-auto pb-4"
              : "flex-1 min-w-0 overflow-auto px-8 pt-3 pb-24"
          }
        >
          <div className="flex gap-4 items-start w-max">
            {grouped.map((group) => (
              <PlatformColumn
                key={group.account.id}
                group={group}
                selected={selected}
                fullWidth={false}
                stickyHeader={!embedded}
                onToggleOne={toggleOne}
                onToggleColumn={toggleColumn}
                onSchedule={onSchedule}
                onAction={onAction}
                onMediaChanged={onMediaChanged}
                onContentChanged={onContentChanged}
                onAddPost={onAddPost}
                registerFlush={registerFlush}
                unregisterFlush={unregisterFlush}
                confirm={confirm}
              />
            ))}
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          busy={bulkBusy}
          progress={bulkProgress}
          onClear={clearSelection}
          onDelete={async () => {
            const ok = await confirm({
              title: `Delete ${selected.size} post${selected.size === 1 ? "" : "s"}?`,
              description: "This can't be undone.",
              confirmLabel: "Delete",
              destructive: true,
            });
            if (ok) runBulkDelete();
          }}
          onSendAll={runSendAll}
        />
      )}
      {confirmDialog}
    </div>
  );
}

function PlatformColumn({
  group,
  selected,
  fullWidth,
  stickyHeader = true,
  onToggleOne,
  onToggleColumn,
  onSchedule,
  onAction,
  onMediaChanged,
  onContentChanged,
  onAddPost,
  registerFlush,
  unregisterFlush,
  confirm,
}: {
  group: PlatformGroup;
  selected: Set<string>;
  fullWidth: boolean;
  stickyHeader?: boolean;
  onToggleOne: (id: string) => void;
  onToggleColumn: (postIds: string[]) => void;
  onSchedule: (
    id: string,
    scheduledAt: string | null
  ) => Promise<boolean | void>;
  onAction: (action: string, s: Suggestion) => Promise<boolean | void>;
  onMediaChanged: (id: string, mediaItems: MediaItem[]) => Promise<boolean>;
  onContentChanged: (id: string, content: string) => Promise<void>;
  onAddPost?: (account: AccountLite) => void;
  registerFlush: (id: string, fn: () => Promise<void>) => void;
  unregisterFlush: (id: string) => void;
  confirm: ConfirmFn;
}) {
  const platform = getPlatform(group.account.platform);
  const color = platform?.color ?? "#666";
  const ids = group.posts.map((p) => p.id);
  const colSelected = group.posts.filter((p) => selected.has(p.id)).length;
  const allSelected =
    colSelected === group.posts.length && group.posts.length > 0;
  const partial = colSelected > 0 && !allSelected;

  return (
    <section
      className={`flex flex-col gap-3.5 ${
        fullWidth ? "w-full" : "w-[500px] flex-shrink-0"
      }`}
    >
      <header
        className={`${
          stickyHeader ? "sticky top-0 z-10 " : ""
        }flex items-center gap-2.5 bg-[#faf9f5] px-1 pt-1 pb-2.5`}
      >
        <button
          type="button"
          onClick={() => onToggleColumn(ids)}
          aria-label="Select all in column"
          className="flex items-center justify-center cursor-pointer"
        >
          <span
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] transition-colors ${
              allSelected || partial
                ? "border-[#e8614d]"
                : "border-gray-300 bg-white"
            }`}
            style={{
              backgroundColor: allSelected || partial ? "#e8614d" : undefined,
            }}
          >
            {allSelected ? (
              <CheckIcon className="h-3 w-3 text-white" weight="bold" />
            ) : partial ? (
              <span className="h-[1.5px] w-2 rounded-[1px] bg-white" />
            ) : null}
          </span>
        </button>

        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0"
          style={{
            backgroundColor: color,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {platform?.icon}
        </span>

        <div className="flex-1 min-w-0 leading-tight">
          <h2 className="text-sm font-semibold tracking-tight text-gray-900 truncate">
            {platform?.label ?? group.account.platform}
          </h2>
          <p className="text-[11px] text-gray-500 truncate">
            @{group.account.username}
          </p>
        </div>

        <span
          className="rounded-full border border-gray-200 bg-white px-2 py-px text-[12px] font-medium tabular-nums text-gray-500 min-w-[26px] text-center shrink-0"
          title="Posts in queue"
        >
          {group.posts.length}
        </span>

      </header>

      {onAddPost && (
        <button
          type="button"
          onClick={() => onAddPost(group.account)}
          aria-label="Add a post for this account"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white/40 px-4 py-3 text-[13px] font-medium text-gray-500 hover:border-gray-400 hover:bg-white hover:text-gray-700 transition-colors cursor-pointer"
        >
          <PlusIcon className="h-4 w-4" weight="bold" />
          Add a post
        </button>
      )}

      <div className="flex flex-col gap-3.5">
        {group.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            color={color}
            selected={selected.has(post.id)}
            onToggleSelect={() => onToggleOne(post.id)}
            onSchedule={(scheduledAt) => onSchedule(post.id, scheduledAt)}
            onAction={(action) => onAction(action, post)}
            onMediaChanged={onMediaChanged}
            onContentChanged={onContentChanged}
            registerFlush={registerFlush}
            unregisterFlush={unregisterFlush}
            confirm={confirm}
          />
        ))}
      </div>
    </section>
  );
}

function PostCard({
  post,
  color,
  selected,
  onToggleSelect,
  onSchedule,
  onAction,
  onMediaChanged,
  onContentChanged,
  registerFlush,
  unregisterFlush,
  confirm,
}: {
  post: Suggestion;
  color: string;
  selected: boolean;
  onToggleSelect: () => void;
  onSchedule: (scheduledAt: string | null) => Promise<boolean | void>;
  onAction: (action: string) => Promise<boolean | void>;
  onMediaChanged: (id: string, mediaItems: MediaItem[]) => Promise<boolean>;
  onContentChanged: (id: string, content: string) => Promise<void>;
  registerFlush: (id: string, fn: () => Promise<void>) => void;
  unregisterFlush: (id: string) => void;
  confirm: ConfirmFn;
}) {
  const isScheduled = post.scheduledAt !== null;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const isBusy = busyAction !== null;
  const platform = getPlatform(post.socialAccount.platform);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload } = useCloudinaryUpload();
  const queryClient = useQueryClient();

  const platformConfig = getPlatformConfig(post.socialAccount.platform);
  const { requiresMedia, mediaRules } = platformConfig;
  const mediaCount = post.mediaItems.length;
  const mediaMissing = requiresMedia !== null && mediaCount === 0;
  const mediaMissingTitle = "Attach media first — this platform requires it";

  const hasVideo = post.mediaItems.some((m) => m.type === "video");
  const hasImage = post.mediaItems.some((m) => m.type === "image");
  const imagesFull =
    post.mediaItems.filter((m) => m.type === "image").length >=
    mediaRules.maxImages;
  const videosFull =
    post.mediaItems.filter((m) => m.type === "video").length >=
    mediaRules.maxVideos;
  const addDisabled =
    isBusy || (hasVideo && videosFull) || (hasImage && imagesFull);

  let acceptAttr = "image/*,video/*";
  if (hasVideo) acceptAttr = "video/*";
  else if (hasImage && !imagesFull) acceptAttr = "image/*";
  else if (mediaRules.maxImages === 0) acceptAttr = "video/*";
  else if (mediaRules.maxVideos === 0) acceptAttr = "image/*";
  const swapMultiple = !hasVideo && mediaRules.maxImages > 1 && !imagesFull;

  // Inline caption editor state. `draft` is what the textarea shows; it stays
  // local while `dirty` so a refetch (chat panel rewrite, sibling save
  // invalidation) can't clobber unsaved typing.
  const [draft, setDraft] = useState(post.content);
  const [dirty, setDirty] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pull in fresh server content only when the user isn't actively editing.
  useEffect(() => {
    if (!dirtyRef.current) {
      setDraft(post.content);
    }
  }, [post.content]);

  // Auto-grow the textarea to fit its content.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [draft]);

  // Stable flush — drains the debounce timer and PATCHes the latest draft if
  // it diverged from the server. Held in a ref so the parent's flush registry
  // can call it without re-registering on every render.
  const flushRef = useRef<() => Promise<void>>(async () => undefined);
  flushRef.current = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (!dirtyRef.current) return;
    try {
      await onContentChanged(post.id, draftRef.current);
      // After a successful save, server content matches local — clear dirty
      // so the next refetch can sync freely.
      setDirty(false);
    } catch {
      // onContentChanged surfaces its own toast. Swallow here so a single
      // per-card error never aborts a bulk flush of sibling cards.
    }
  };

  useEffect(() => {
    const stable = () => flushRef.current();
    registerFlush(post.id, stable);
    return () => {
      unregisterFlush(post.id);
    };
  }, [post.id, registerFlush, unregisterFlush]);

  // On unmount, fire any pending debounced save best-effort so a tab switch
  // or re-key doesn't silently drop the user's last edit. The latest flush
  // closure is held in flushRef and re-reads draftRef/dirtyRef internally.
  useEffect(() => {
    const flush = flushRef;
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      void flush.current();
    };
  }, []);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    setDirty(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void flushRef.current();
    }, 800);
  };

  const handleRewrite = async (instruction: RewriteInstruction) => {
    if (!draftRef.current.trim() || rewriting || isBusy) return;
    // The rewrite endpoint reads the current content from the DB, so flush
    // unsaved local edits first or the rewrite operates on stale text.
    await flushRef.current();
    setRewriting(true);
    try {
      const res = await fetch(`/api/suggestions/${post.id}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      if (!res.ok) {
        toast.error("Couldn't rewrite the post. Try again.");
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | { content?: unknown }
        | null;
      if (typeof data?.content === "string") {
        setDraft(data.content);
        setDirty(false);
      }
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
      // Refresh the sidebar usage meter — a rewrite consumed 1 point.
      queryClient.invalidateQueries({ queryKey: ["dashboardStatus"] });
    } catch {
      toast.error("Couldn't rewrite the post. Try again.");
    } finally {
      setRewriting(false);
    }
  };

  const run = async (
    action: string,
    fn: () => Promise<boolean | void>
  ) => {
    setBusyAction(action);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  // Per-card publish/schedule must ship the latest caption — drain pending
  // debounced saves before kicking off the action.
  const commitAction = async (action: "publish" | "schedule") => {
    await flushRef.current();
    return run(action, () => onAction(action));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBusyAction("media");
    try {
      const tentative = Array.from(files).map((f) => ({
        url: "https://res.cloudinary.com/_/preflight",
        type: f.type.startsWith("video/")
          ? ("video" as const)
          : ("image" as const),
      }));
      const preflight = validateMediaItems(
        [...post.mediaItems, ...tentative],
        post.socialAccount.platform
      );
      if (!preflight.ok) {
        toast.error(preflight.error);
        return;
      }
      const uploaded = await upload(files);
      const merged = [...post.mediaItems, ...uploaded];
      const validation = validateMediaItems(
        merged,
        post.socialAccount.platform
      );
      if (!validation.ok) {
        toast.error(validation.error);
        return;
      }
      await onMediaChanged(post.id, merged);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't upload that file. Try a different one.";
      toast.error(msg);
    } finally {
      setBusyAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Local mirror of post.mediaItems so framer-motion's Reorder can drive the
  // strip's order while a drag is in flight. Synced from server state via the
  // effect below, except while the user is mid-drag (otherwise a query refetch
  // would yank the items mid-drop). Includes `type` in the key so a
  // type-only change (e.g. moderation reclassifies image → gif) still
  // re-syncs the local mirror.
  const [reorderItems, setReorderItems] = useState<MediaItem[]>(
    post.mediaItems
  );
  const isDraggingRef = useRef(false);
  const propMediaKey = post.mediaItems
    .map((m) => `${m.type}:${m.url}`)
    .join("|");
  useEffect(() => {
    if (isDraggingRef.current) return;
    setReorderItems(post.mediaItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propMediaKey]);

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const handleRemoveItem = async (idx: number) => {
    const next = reorderItems.filter((_, i) => i !== idx);
    setBusyAction("media");
    if (next.length === 0) setLightboxIdx(null);
    try {
      await onMediaChanged(post.id, next);
    } finally {
      setBusyAction(null);
    }
  };

  const commitReorder = async () => {
    const before = post.mediaItems.map((m) => m.url).join("|");
    const after = reorderItems.map((m) => m.url).join("|");
    if (before === after) return;
    setBusyAction("media");
    try {
      const ok = await onMediaChanged(post.id, reorderItems);
      if (!ok) {
        // Save failed (toast already shown by onMediaChanged). Snap back to
        // the server's last-known order so the UI doesn't lie.
        setReorderItems(post.mediaItems);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const rewriteDisabled = isBusy || rewriting || !draft.trim();

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white transition-all ${
        selected
          ? "border-[#e8614d] shadow-[0_0_0_1px_#e8614d,0_2px_6px_rgba(0,0,0,0.05)]"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: color, opacity: 0.85 }}
      />

      <header className="flex items-center gap-2 px-4 pt-4 pb-1.5">
        <label className="relative grid place-items-center cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <span
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] transition-colors ${
              selected ? "border-[#e8614d]" : "border-gray-300 bg-white"
            }`}
            style={{ backgroundColor: selected ? "#e8614d" : undefined }}
          >
            {selected && (
              <CheckIcon className="h-3 w-3 text-white" weight="bold" />
            )}
          </span>
        </label>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-gray-500">
          <span
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {platform?.icon}
          </span>
          <span className="text-gray-700">@{post.socialAccount.username}</span>
        </span>
      </header>

      {mediaCount > 0 ? (
        <div className="mx-4 mt-1">
          <Reorder.Group
            axis="x"
            values={reorderItems}
            onReorder={setReorderItems}
            className="flex gap-2 overflow-x-auto pt-1.5 pb-1"
          >
            {reorderItems.map((item, idx) => (
              <ReorderableMediaItem
                key={item.url}
                item={item}
                idx={idx}
                isBusy={isBusy}
                onClick={() => setLightboxIdx(idx)}
                onRemove={() => handleRemoveItem(idx)}
                onDragStart={() => {
                  isDraggingRef.current = true;
                }}
                onDragEnd={async () => {
                  isDraggingRef.current = false;
                  await commitReorder();
                }}
              />
            ))}
          </Reorder.Group>
          {lightboxIdx !== null && reorderItems.length > 0 && (
            <MediaLightbox
              items={reorderItems}
              index={Math.min(lightboxIdx, reorderItems.length - 1)}
              open
              onOpenChange={(o) => {
                if (!o) setLightboxIdx(null);
              }}
              onIndexChange={setLightboxIdx}
            />
          )}
        </div>
      ) : post.contentType === "image" ||
        post.contentType === "video" ||
        post.contentType === "carousel" ? (
        <div className="mx-4 mt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-[10.5px] tracking-wider font-mono transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              mediaMissing
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-gray-200 text-gray-500 hover:bg-black/[0.02]"
            }`}
            style={
              mediaMissing
                ? undefined
                : {
                    backgroundImage:
                      "repeating-linear-gradient(135deg, #f5f4f1, #f5f4f1 8px, #efedea 8px, #efedea 16px)",
                  }
            }
            title={
              mediaMissing ? mediaMissingTitle : "Attach media for this post"
            }
            aria-label={
              mediaMissing ? mediaMissingTitle : "Attach media for this post"
            }
          >
            <span className={mediaMissing ? "text-amber-700" : "text-gray-700"}>
              {mediaMissing ? (
                <WarningIcon className="h-3.5 w-3.5" weight="fill" />
              ) : post.contentType === "video" ? (
                <VideoCameraIcon className="h-3.5 w-3.5" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
            </span>
            <span>
              {mediaMissing
                ? "MEDIA REQUIRED — TAP TO ATTACH"
                : post.contentType === "video"
                  ? "VIDEO"
                  : post.contentType === "carousel"
                    ? "CAROUSEL"
                    : "IMAGE"}
            </span>
          </button>
        </div>
      ) : null}

      <div className="px-4 pt-2.5 pb-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          rows={1}
          placeholder="Write your post..."
          aria-label="Post caption"
          // Disabled mid-rewrite so keystrokes can't be silently overwritten
          // by the incoming setDraft(data.content) once the rewrite returns.
          disabled={rewriting}
          className="block w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:cursor-wait disabled:text-gray-500"
        />
      </div>

      <footer className="flex items-center gap-1 border-t border-gray-100 px-3 py-2 bg-black/[0.005]">
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete this post idea?",
                description: "This can't be undone.",
                confirmLabel: "Delete",
                destructive: true,
              });
              if (ok) run("delete", () => onAction("delete"));
            }}
            disabled={isBusy}
            title="Delete"
            aria-label="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#fef2f0] hover:text-[#c84a35] transition-colors cursor-pointer disabled:opacity-50"
          >
            {busyAction === "delete" ? (
              <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <TrashIcon className="h-3.5 w-3.5" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={rewriteDisabled}
                title="Rewrite"
                aria-label="Rewrite"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rewriting ? (
                  <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LightningIcon className="h-3.5 w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {REWRITE_ACTIONS.map(({ key, label, Icon }) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => {
                    void handleRewrite(key);
                  }}
                  disabled={rewriteDisabled}
                  className="gap-2 text-[13px] text-gray-700"
                >
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttr}
            multiple={swapMultiple}
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={addDisabled}
            title={
              hasVideo && videosFull
                ? "Remove the video first to add photos"
                : hasImage && imagesFull
                  ? `Up to ${mediaRules.maxImages} photo${mediaRules.maxImages === 1 ? "" : "s"} on ${platformConfig.displayName}`
                  : "Add media"
            }
            aria-label="Add media"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {busyAction === "media" ? (
              <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
          </button>
          <TooltipProvider delayDuration={150}>
            <Tooltip open={mediaMissing ? undefined : false}>
              <TooltipTrigger asChild>
                {/* Split-button: schedule selector + CTA flush against each
                    other. Wrapping span keeps the tooltip clickable when the
                    inner trigger is disabled (Radix swallows pointer events on
                    disabled triggers). */}
                <span className="inline-flex items-stretch">
                  <SchedulePicker
                    disabled={isBusy || mediaMissing}
                    platform={post.socialAccount.platform}
                    variant="verbose"
                    scheduledAt={post.scheduledAt}
                    joinRight
                    onSchedule={(date) =>
                      run("stage-schedule", () =>
                        onSchedule(date.toISOString())
                      )
                    }
                    onCancelSchedule={() =>
                      run("clear-schedule", () => onSchedule(null))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      isScheduled
                        ? commitAction("schedule")
                        : commitAction("publish")
                    }
                    disabled={isBusy || mediaMissing}
                    className="inline-flex h-10 md:h-8 items-center gap-1.5 rounded-r-lg px-3 text-[12.5px] font-medium text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background:
                        "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
                    }}
                  >
                    {busyAction === "publish" ||
                    busyAction === "schedule" ? (
                      <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                    ) : isScheduled ? (
                      <CalendarIcon className="h-3.5 w-3.5" weight="fill" />
                    ) : (
                      <PaperPlaneTiltIcon className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {busyAction === "publish"
                        ? "Posting…"
                        : busyAction === "schedule"
                          ? "Scheduling…"
                          : isScheduled
                            ? "Schedule post"
                            : "Post now"}
                    </span>
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{mediaMissingTitle}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </footer>
    </article>
  );
}

function BulkBar({
  count,
  busy,
  progress,
  onClear,
  onDelete,
  onSendAll,
}: {
  count: number;
  busy: boolean;
  progress: { current: number; total: number } | null;
  onClear: () => void;
  onDelete: () => void;
  onSendAll: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl bg-[#2d2a25] py-2 pl-4 pr-2 text-white shadow-[0_12px_32px_rgba(0,0,0,0.20),0_4px_8px_rgba(0,0,0,0.10)] animate-in fade-in slide-in-from-bottom-2 duration-200 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <span className="text-[13px] font-medium tabular-nums">
        {count} selected
      </span>
      <span className="h-[18px] w-px bg-white/15" />
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 min-h-11 md:min-h-8 md:py-1.5 text-[12.5px] font-medium text-white/85 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
      >
        <TrashIcon className="h-3.5 w-3.5" />
        Delete
      </button>
      <button
        type="button"
        onClick={onSendAll}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 min-h-11 md:min-h-8 md:py-1.5 text-[12.5px] font-medium text-white transition-all cursor-pointer disabled:opacity-50"
        style={{
          background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
        }}
      >
        {busy ? (
          <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <PaperPlaneTiltIcon className="h-3.5 w-3.5" />
        )}
        <span className="tabular-nums">
          {busy && progress
            ? `Sending ${progress.current}/${progress.total}…`
            : "Send all"}
        </span>
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="ml-1 flex h-11 w-11 md:h-7 md:w-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
      >
        <XIcon className="h-3.5 w-3.5" weight="bold" />
      </button>
    </div>
  );
}

function ReorderableMediaItem({
  item,
  idx,
  isBusy,
  onClick,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  item: MediaItem;
  idx: number;
  isBusy: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="relative shrink-0"
    >
      <button
        type="button"
        onClick={onClick}
        className="block cursor-zoom-in"
        aria-label={`Open media ${idx + 1}`}
      >
        {item.type === "video" ? (
          <video
            src={item.url}
            className="h-20 w-20 rounded-lg object-cover bg-gray-100 pointer-events-none"
            preload="metadata"
            playsInline
            muted
            aria-hidden
          />
        ) : (
          <Image
            src={cloudinaryThumbnail(item.url)}
            alt={`Attached media ${idx + 1}`}
            className="h-20 w-20 rounded-lg object-cover pointer-events-none"
            width={160}
            height={160}
          />
        )}
      </button>
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className="absolute bottom-1 left-1 h-5 w-5 rounded-full bg-[#2d2a25]/70 text-white flex items-center justify-center cursor-grab active:cursor-grabbing touch-none hover:bg-[#2d2a25]"
        aria-label="Drag to reorder"
      >
        <DotsSixVerticalIcon className="h-3 w-3" weight="bold" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={isBusy}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer disabled:opacity-50"
        aria-label={`Remove media ${idx + 1}`}
      >
        <XIcon className="h-3 w-3" weight="bold" />
      </button>
    </Reorder.Item>
  );
}
