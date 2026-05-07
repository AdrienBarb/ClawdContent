"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  PaperPlaneTiltIcon,
  PaperclipIcon,
  XIcon,
  CircleNotchIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  SparkleIcon,
  NotePencilIcon,
  CalendarBlankIcon,
  SlidersHorizontalIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
  type ComponentType,
  type ChangeEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import { appRouter } from "@/lib/constants/appRouter";
import { AccountChipSelector } from "./AccountChipSelector";
import {
  useUsageModalStore,
  type UsageLimitPayload,
} from "@/lib/stores/usageModalStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";
import {
  MAX_CHAT_ATTACHMENTS,
  type MediaItem,
} from "@/lib/schemas/mediaItems";

const STICK_THRESHOLD_PX = 24;

interface ChipItem {
  label: string;
  brief: string;
}

interface ChipGroup {
  label: string;
  icon: ComponentType<{
    className?: string;
    weight?: "regular" | "bold" | "fill";
  }>;
  items: ChipItem[];
}

const STARTER_CHIPS: ChipGroup[] = [
  {
    label: "Quick post",
    icon: NotePencilIcon,
    items: [
      {
        label: "Behind the scenes",
        brief:
          "Write 1 behind-the-scenes post about everyday life or work in my business",
      },
      {
        label: "Share a tip",
        brief:
          "Write 1 post sharing a useful tip or insight from my expertise that my audience would value",
      },
      {
        label: "Recent work…",
        brief:
          "I want to post about a recent project or client. Ask me which project and what to highlight before drafting.",
      },
      {
        label: "Promote an offer…",
        brief:
          "I want to post about a special offer or promotion. Ask me what the offer is and any deadline before drafting.",
      },
      {
        label: "Good news / milestone…",
        brief:
          "I want to post celebrating a milestone or piece of good news. Ask me what to celebrate before drafting.",
      },
    ],
  },
  {
    label: "Plan ahead",
    icon: CalendarBlankIcon,
    items: [
      {
        label: "My week (5 posts)",
        brief:
          "Plan 5 posts for this week and schedule them at my best time slots",
      },
      {
        label: "My month (15 posts)",
        brief:
          "Plan 15 posts for the upcoming month and schedule them at my best time slots",
      },
      {
        label: "Around an event…",
        brief:
          "I want to plan a sequence of posts around an upcoming event. Ask me what the event is and when it's happening before planning.",
      },
      {
        label: "Service launch…",
        brief:
          "I want to plan a launch sequence for a new service. Ask me what the service is and when it's launching before planning.",
      },
    ],
  },
  {
    label: "Manage",
    icon: SlidersHorizontalIcon,
    items: [
      {
        label: "My best time slots",
        brief: "What are my best time slots to publish this week?",
      },
      {
        label: "Schedule my drafts",
        brief: "Schedule all my pending drafts at my best time slots",
      },
      {
        label: "Publish my drafts",
        brief: "Publish all my pending drafts now",
      },
      {
        label: "What worked recently",
        brief: "What worked best these last 14 days?",
      },
    ],
  },
];

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
}

interface Props {
  accounts: AccountInfo[];
  selectedAccountIds: string[];
  onSelectedAccountIdsChange: (ids: string[]) => void;
  onSuggestionsChanged: () => void;
}

export function ChatPanel({
  accounts,
  selectedAccountIds,
  onSelectedAccountIdsChange,
  onSuggestionsChanged,
}: Props) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: appRouter.api.chat }),
    []
  );

  const queryClient = useQueryClient();
  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: () => {
      onSuggestionsChanged();
      // Refresh the sidebar usage meter — every chat turn that hits
      // generate_posts / regenerate_post will have moved the ledger.
      queryClient.invalidateQueries({ queryKey: ["dashboardStatus"] });
    },
  });

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useCloudinaryUpload();

  const isStreaming = status === "submitted" || status === "streaming";
  const trimmed = input.trim();
  const canSend =
    !isStreaming &&
    !uploading &&
    selectedAccountIds.length > 0 &&
    (trimmed.length > 0 || attachments.length > 0);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "file"; url: string; mediaType: string }
    > = [];
    // Anthropic rejects user messages with no content. When the user sends
    // images only, drop in a minimal placeholder so the message has a text
    // part. The system prompt tells the model to ask what to do in that case.
    parts.push({
      type: "text",
      text: trimmed.length > 0 ? trimmed : "(photo attached)",
    });
    for (const m of attachments) {
      parts.push({ type: "file", url: m.url, mediaType: mediaTypeForUrl(m.url) });
    }
    void sendMessage(
      { parts },
      {
        body: {
          accountIds: selectedAccountIds,
          ...(attachments.length > 0
            ? { attachedMediaItems: attachments }
            : {}),
        },
      }
    );
    setInput("");
    setAttachments([]);
    setAttachError(null);
  };

  const handleAttachClick = () => {
    if (attachments.length >= MAX_CHAT_ATTACHMENTS || isStreaming || uploading)
      return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const room = MAX_CHAT_ATTACHMENTS - attachments.length;
    const slice = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    e.target.value = "";
    if (slice.length === 0) {
      setAttachError("Only image files are supported here.");
      return;
    }
    try {
      setAttachError(null);
      const items = await upload(slice);
      setAttachments((prev) => [...prev, ...items].slice(0, MAX_CHAT_ATTACHMENTS));
    } catch (err) {
      setAttachError(
        err instanceof Error ? err.message : "Couldn't upload that image."
      );
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((m) => m.url !== url));
  };

  const chipsDisabled = isStreaming || selectedAccountIds.length === 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickChip = (brief: string) => {
    if (chipsDisabled) return;
    setInput(brief);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const isFresh = messages.length === 0;

  // Tool-result scanner: when the assistant streams a tool result with
  // surface === "paywall_modal", open the global usage modal. Tracks the
  // last scanned message id so we don't re-fire on every render.
  const openUsageModal = useUsageModalStore((s) => s.open);
  const lastScannedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === lastScannedIdRef.current) return;
    if (last.role !== "assistant") return;

    for (const part of last.parts) {
      if (
        typeof part === "object" &&
        part !== null &&
        "state" in part &&
        (part as { state?: string }).state === "output-available"
      ) {
        const out = (part as { output?: unknown }).output as
          | { surface?: string; payload?: UsageLimitPayload }
          | undefined;
        if (out?.surface === "paywall_modal" && out.payload) {
          openUsageModal(out.payload);
          break;
        }
      }
    }
    lastScannedIdRef.current = last.id;
  }, [messages, openUsageModal]);

  // Auto-stick-to-bottom: only scroll the thread to the bottom on new
  // content if the user was already at the bottom. Lets them scroll up to
  // re-read history without being yanked back.
  const threadRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  };

  useEffect(() => {
    if (!isAtBottomRef.current) return;
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  return (
    <div
      className={
        isFresh
          ? "flex flex-col items-center justify-center min-h-[56vh] py-4"
          : "flex flex-col py-6"
      }
    >
      {isFresh && (
        <div className="text-center max-w-xl mb-8">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: "#f3f4f6" }}
          >
            <SparkleIcon
              className="h-6 w-6"
              weight="fill"
              style={{ color: "#6b7280" }}
            />
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
            What should we post about?
          </h1>
          <p className="text-base text-gray-500 mt-3 leading-relaxed">
            Tell us what you want, hit send, and your draft cards appear below.
          </p>
        </div>
      )}

      {!isFresh && (
        <div
          ref={threadRef}
          onScroll={handleThreadScroll}
          className="w-full max-w-xl mx-auto mb-4 max-h-[480px] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 text-[12px] text-gray-500 px-1">
                <CircleNotchIcon className="h-3.5 w-3.5 animate-spin" />
                Drafting…
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                <WarningCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Something went wrong. Try sending the message again in a
                  moment.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={submit}
        className="w-full max-w-xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:border-[#e8614d] focus-within:ring-2 focus-within:ring-[#e8614d]/15 transition-all overflow-hidden"
      >
        <div className="px-3 py-2 border-b border-gray-100 bg-black/[0.015]">
          <AccountChipSelector
            accounts={accounts}
            selectedIds={selectedAccountIds}
            onChange={onSelectedAccountIdsChange}
          />
        </div>
        {attachments.length > 0 && (
          <div className="px-3 pt-3 flex flex-wrap gap-2">
            {attachments.map((m) => (
              <div key={m.url} className="relative">
                <img
                  src={m.url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(m.url)}
                  aria-label="Remove image"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 shadow-sm flex items-center justify-center cursor-pointer"
                >
                  <XIcon className="h-3 w-3" weight="bold" />
                </button>
              </div>
            ))}
          </div>
        )}
        {attachError && (
          <div className="px-3 pt-2 text-[12px] text-amber-700">
            {attachError}
          </div>
        )}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            maxLength={4000}
            placeholder={
              selectedAccountIds.length === 0
                ? "Pick an account above to start drafting…"
                : "Tell us what to post about…"
            }
            disabled={selectedAccountIds.length === 0}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none min-h-[88px] max-h-60 disabled:cursor-not-allowed"
          />
          <div className="absolute bottom-3 left-3">
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={
                attachments.length >= MAX_CHAT_ATTACHMENTS ||
                isStreaming ||
                uploading ||
                selectedAccountIds.length === 0
              }
              aria-label="Attach photo"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <CircleNotchIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PaperclipIcon className="h-5 w-5" weight="regular" />
              )}
            </button>
          </div>
          <div className="absolute bottom-3 right-3">
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className="inline-flex items-center gap-1.5 rounded-full font-medium text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_30px_-10px_rgba(232,97,77,0.55)] hover:-translate-y-0.5 h-10 px-5 text-sm"
              style={{ backgroundColor: "#e8614d" }}
            >
              {isStreaming ? (
                <CircleNotchIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PaperPlaneTiltIcon className="h-4 w-4" weight="fill" />
              )}
              <span>Send</span>
            </button>
          </div>
        </div>
      </form>

      <StarterChipBar onPick={pickChip} disabled={chipsDisabled} />
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = textFromParts(message.parts);
    const imageUrls = imageUrlsFromParts(message.parts);
    if (!text && imageUrls.length === 0) return null;
    return (
      <div className="flex flex-col items-end gap-1.5">
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end max-w-[80%]">
            {imageUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className="h-20 w-20 rounded-lg object-cover border border-gray-200"
              />
            ))}
          </div>
        )}
        {text && (
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#fef2f0] border border-[#f4d8d2] px-3.5 py-2 text-[13px] leading-relaxed text-gray-900 whitespace-pre-wrap">
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-[90%]">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <div
              key={i}
              className="text-[13px] leading-relaxed text-gray-900 prose prose-sm max-w-none prose-p:my-1 prose-strong:text-gray-900"
            >
              <ReactMarkdown>{part.text}</ReactMarkdown>
            </div>
          );
        }
        if (
          (part.type === "dynamic-tool" ||
            (typeof part.type === "string" && part.type.startsWith("tool-"))) &&
          "state" in part &&
          part.state === "output-available"
        ) {
          return <ToolPill key={i} part={part} />;
        }
        return null;
      })}
    </div>
  );
}

function textFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        typeof p === "object" &&
        p !== null &&
        (p as { type?: string }).type === "text"
    )
    .map((p) => p.text)
    .join("");
}

// Cloudinary returns the original format; Anthropic vision needs the matching
// IANA media type. Map common image extensions, fall back to JPEG.
function mediaTypeForUrl(url: string): string {
  const lower = url.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic") || lower.endsWith(".heif"))
    return "image/heic";
  return "image/jpeg";
}

function imageUrlsFromParts(parts: UIMessage["parts"]): string[] {
  const urls: string[] = [];
  for (const p of parts) {
    if (typeof p !== "object" || p === null) continue;
    const part = p as {
      type?: string;
      url?: string;
      mediaType?: string;
    };
    if (
      part.type === "file" &&
      typeof part.url === "string" &&
      typeof part.mediaType === "string" &&
      part.mediaType.startsWith("image/")
    ) {
      urls.push(part.url);
    }
  }
  return urls;
}

interface ToolPart {
  type: string;
  toolName?: string;
  output?: unknown;
}

function ToolPill({ part }: { part: ToolPart }) {
  const toolName =
    part.toolName ??
    (part.type.startsWith("tool-") ? part.type.slice(5) : "tool");
  const output = part.output as
    | {
        ok?: boolean;
        message?: string;
        count?: number;
        instruction?: string;
      }
    | undefined;

  const ok = output?.ok !== false;
  const label = labelFor(toolName, output);

  return (
    <div
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
        ok
          ? "bg-[#fef2f0] text-[#c84a35] border border-[#f4d8d2]"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {ok ? (
        <CheckCircleIcon className="h-3.5 w-3.5" weight="fill" />
      ) : (
        <WarningCircleIcon className="h-3.5 w-3.5" weight="fill" />
      )}
      {label}
    </div>
  );
}

function StarterChipBar({
  onPick,
  disabled,
}: {
  onPick: (brief: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="w-full max-w-xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
      {STARTER_CHIPS.map((group) => {
        const Icon = group.icon;
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-medium text-gray-700 cursor-pointer hover:border-[#e8614d] hover:text-[#c84a35] hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon className="h-3.5 w-3.5" weight="regular" />
                {group.label}
                <CaretDownIcon className="h-2.5 w-2.5 ml-0.5" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[240px]">
              {group.items.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  onClick={() => onPick(item.brief)}
                  className="text-[13px] cursor-pointer"
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}

function labelFor(
  toolName: string,
  output:
    | {
        ok?: boolean;
        message?: string;
        count?: number;
        instruction?: string;
        scheduledAt?: string | null;
      }
    | undefined
): string {
  if (output?.ok === false) {
    return output?.message ?? `${toolName} skipped`;
  }
  switch (toolName) {
    case "generate_posts": {
      const n = output?.count ?? 0;
      return `Drafted ${n} post${n === 1 ? "" : "s"}`;
    }
    case "update_post":
      return "Updated post";
    case "regenerate_post":
      return output?.instruction
        ? `Rewrote (${output.instruction})`
        : "Rewrote post";
    case "delete_draft":
      return "Deleted draft";
    case "set_schedule":
      return output?.scheduledAt ? "Staged schedule" : "Cleared schedule";
    default:
      return toolName;
  }
}
