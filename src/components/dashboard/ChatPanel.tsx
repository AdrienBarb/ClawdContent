"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  PaperPlaneTiltIcon,
  CircleNotchIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import { appRouter } from "@/lib/constants/appRouter";
import { AccountChipSelector } from "./AccountChipSelector";

const STARTER_PROMPT = "Generate me 1 posts about my business";
const STICK_THRESHOLD_PX = 24;

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

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: () => {
      onSuggestionsChanged();
    },
  });

  const [input, setInput] = useState(STARTER_PROMPT);
  const isStreaming = status === "submitted" || status === "streaming";
  const trimmed = input.trim();
  const canSend =
    !isStreaming && trimmed.length > 0 && selectedAccountIds.length > 0;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    void sendMessage(
      { text: trimmed },
      { body: { accountIds: selectedAccountIds } }
    );
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const isFresh = messages.length === 0;

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
          ? "flex flex-col items-center justify-center min-h-[60vh] py-8"
          : "flex flex-col py-6"
      }
    >
      {isFresh && (
        <div className="text-center max-w-xl mb-8">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: "#fef2f0" }}
          >
            <SparkleIcon
              className="h-6 w-6"
              weight="fill"
              style={{ color: "#e8614d" }}
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
        <div className="relative">
          <textarea
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
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = textFromParts(message.parts);
    if (!text) return null;
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#fef2f0] border border-[#f4d8d2] px-3.5 py-2 text-[13px] leading-relaxed text-gray-900 whitespace-pre-wrap">
          {text}
        </div>
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
