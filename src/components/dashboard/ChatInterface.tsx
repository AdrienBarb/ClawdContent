"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { appRouter } from "@/lib/constants/appRouter";
import {
  PaperPlaneTiltIcon,
  CircleNotchIcon,
  WarningCircleIcon,
  XIcon,
  FilmStripIcon,
  ArrowRightIcon,
  PencilSimpleIcon,
  CompassIcon,
  ChartLineUpIcon,
  CalendarDotsIcon,
} from "@phosphor-icons/react";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import useApi from "@/lib/hooks/useApi";
import MediaUploadModal, {
  type UploadResult,
} from "@/components/dashboard/MediaUploadModal";
import MediaAttachDropdown from "@/components/dashboard/MediaAttachDropdown";
import ImageGenerateModal from "@/components/dashboard/ImageGenerateModal";
import ReactMarkdown from "react-markdown";
import SubscribeModal from "@/components/dashboard/SubscribeModal";

const ACTION_CATEGORIES = [
  {
    id: "write",
    label: "Write",
    icon: PencilSimpleIcon,
    prompts: [
      "Write a post about my latest project",
      "Give me content ideas for this week",
      "Adapt this text for social media",
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    icon: CompassIcon,
    prompts: [
      "Help me define my content strategy",
      "What should I talk about?",
      "Review my brand voice",
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: ChartLineUpIcon,
    prompts: [
      "How are my posts performing?",
      "When is the best time to post?",
      "Show my top performing posts",
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDotsIcon,
    prompts: [
      "Schedule a post for later",
      "Plan my week of content",
      "Show my scheduled posts",
    ],
  },
];

interface AttachedMedia {
  url: string;
  resourceType: "image" | "video";
  format: string;
  cloudinaryId: string;
  bytes: number;
  width?: number;
  height?: number;
  thumbnailUrl: string;
}

interface ExtractedMedia {
  url: string;
  mediaType: string;
}

function extractMediaFromText(text: string): {
  cleanText: string;
  media: ExtractedMedia[];
} {
  const media: ExtractedMedia[] = [];
  let cleanText = text;

  const mediaRegex = /\[MEDIA:\s*(https?:\/\/[^\]]+)\]/g;
  const typeRegex = /\[MEDIA_TYPE:\s*([^\]]+)\]/g;

  const urls: string[] = [];
  let match;
  while ((match = mediaRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }

  const types: string[] = [];
  while ((match = typeRegex.exec(text)) !== null) {
    types.push(match[1]);
  }

  for (let i = 0; i < urls.length; i++) {
    media.push({
      url: urls[i],
      mediaType: types[i] || "image/jpeg",
    });
  }

  cleanText = cleanText.replace(/\[CONTEXT:[^\]]*\]\n*/g, "");
  cleanText = cleanText.replace(/\[MEDIA:\s*https?:\/\/[^\]]+\]\n?/g, "");
  cleanText = cleanText.replace(/\[MEDIA_TYPE:\s*[^\]]+\]\n?/g, "");
  cleanText = cleanText.trim();

  return { cleanText, media };
}

interface HistoryState {
  messages: UIMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

export default function ChatInterface() {
  const [historyState, setHistoryState] = useState<HistoryState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(appRouter.api.chatHistory)
      .then((res) => (res.ok ? res.json() : { messages: [], hasMore: false }))
      .then((data) => {
        if (!cancelled) {
          setHistoryState({
            messages: data.messages ?? [],
            hasMore: data.hasMore ?? false,
            nextCursor: data.nextCursor,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryState({ messages: [], hasMore: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (historyState === null) {
    return <ChatSkeleton />;
  }

  return <ChatInner historyState={historyState} />;
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <CircleNotchIcon className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      </div>
    </div>
  );
}

function ChatInner({ historyState }: { historyState: HistoryState }) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: appRouter.api.chat }),
    []
  );
  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: historyState.messages,
  });

  const [hasMore, setHasMore] = useState(historyState.hasMore);
  const [nextCursor, setNextCursor] = useState(historyState.nextCursor);
  const [olderMessages, setOlderMessages] = useState<UIMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const allMessages = useMemo(
    () => [...olderMessages, ...messages],
    [olderMessages, messages]
  );

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || loadingOlder || nextCursor === undefined) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(
        `${appRouter.api.chatHistory}?cursor=${encodeURIComponent(nextCursor)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const older: UIMessage[] = data.messages ?? [];
      setOlderMessages((prev) => [...older, ...prev]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor);
    } catch {
      // Silent failure
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, nextCursor]);

  const [input, setInput] = useState("");
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);

  // Fetch dashboard status for subscription info (cached by React Query from ChatWithLoader)
  const { useGet } = useApi();
  const { data: dashboardStatus } = useGet(appRouter.api.dashboardStatus);
  const subStatus = dashboardStatus?.subscription?.status;
  const subPlanId = dashboardStatus?.subscription?.planId;
  const hasActiveSubscription =
    subStatus === "active" || subStatus === "trialing";
  const canGenerate = subStatus === "active";
  const accountCount: number = dashboardStatus?.accountCount ?? 0;
  const freeMessageUsed: boolean = dashboardStatus?.freeMessageUsed ?? false;
  // Check both server-side (freeMessageUsed) and client-side (messages in current session)
  const localUserMessageCount = allMessages.filter(
    (m) => m.role === "user"
  ).length;
  const needsSubscription =
    !hasActiveSubscription && (freeMessageUsed || localUserMessageCount >= 1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleUploadComplete = useCallback((result: UploadResult) => {
    setAttachedMedia((prev) => [
      ...prev,
      {
        url: result.url,
        resourceType: result.resourceType,
        format: result.format,
        cloudinaryId: result.cloudinaryId,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        thumbnailUrl: result.thumbnailUrl,
      },
    ]);

    // Fire-and-forget save to DB
    fetch(appRouter.api.mediaUpload, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cloudinaryId: result.cloudinaryId,
        url: result.url,
        resourceType: result.resourceType,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      }),
    }).catch(() => {
      // Silent — media record is not critical for sending
    });
  }, []);

  const handleImageGenerated = useCallback((result: { imageUrl: string }) => {
    setAttachedMedia((prev) => [
      ...prev,
      {
        url: result.imageUrl,
        resourceType: "image",
        format: "png",
        cloudinaryId: "",
        bytes: 0,
        thumbnailUrl: result.imageUrl,
      },
    ]);
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text && attachedMedia.length === 0) return;
    if (isLoading) return;

    // Block if subscription required (free message already used)
    if (needsSubscription) {
      setShowSubscribeModal(true);
      return;
    }

    let messageText = text || "(media attached)";

    for (const media of attachedMedia) {
      const mimeType =
        media.resourceType === "video"
          ? `video/${media.format}`
          : `image/${media.format}`;

      messageText += `\n\n[MEDIA: ${media.url}]\n[MEDIA_TYPE: ${mimeType}]`;
    }

    setInput("");
    setAttachedMedia([]);
    sendMessage({ text: messageText });
  };

  const handlePromptClick = (text: string) => {
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasAccounts = accountCount > 0;
  const canSend =
    (input.trim() || attachedMedia.length > 0) && !isLoading && hasAccounts;
  const showCategories = hasAccounts;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Welcome message — no accounts or empty chat */}
          {allMessages.length === 0 && !error && (
            <div className="flex flex-col justify-end h-full gap-4 animate-fade-in">
              <div className="flex items-end gap-2.5">
                <img
                  src="/logo.svg"
                  alt="PostClaw"
                  className="shrink-0 h-8 w-8 rounded-full shadow-sm"
                />
                <div
                  className="max-w-[80%] rounded-2xl rounded-bl-md px-5 py-4 text-sm leading-relaxed"
                  style={{
                    background:
                      "linear-gradient(135deg, #f8f7ff 0%, #fff5f3 100%)",
                    border: "1px solid rgba(255, 94, 72, 0.1)",
                  }}
                >
                  {accountCount === 0 ? (
                    <>
                      <p className="text-gray-800">
                        Hey! I&apos;m your AI social media manager. Before we
                        start creating content, connect your social accounts so
                        I can publish for you.
                      </p>
                      <Link
                        href={appRouter.accounts}
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-[#E84A36] transition-all hover:shadow-md cursor-pointer"
                      >
                        Connect my accounts
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  ) : (
                    <p className="text-gray-800">
                      Hey! I&apos;m your AI social media manager. Tell me what
                      you need, or pick an action below to get started.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <WarningCircleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                {error.message?.includes("SUBSCRIPTION_REQUIRED") ||
                error.message?.includes("403") ? (
                  <>
                    <p className="text-sm font-medium text-amber-900">
                      Subscribe to keep chatting
                    </p>
                    <p className="text-sm text-amber-700 mt-0.5 mb-2">
                      You&apos;ve used your free message. Subscribe to unlock
                      unlimited access to your AI social media manager.
                    </p>
                    <button
                      onClick={() => setShowSubscribeModal(true)}
                      className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-[#E84A36] transition-all cursor-pointer"
                    >
                      Choose a plan
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-amber-900">
                      Something went wrong
                    </p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      {error.message || "Please try again."}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadOlderMessages}
                disabled={loadingOlder}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {loadingOlder ? (
                  <span className="flex items-center gap-2">
                    <CircleNotchIcon className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Load older messages"
                )}
              </button>
            </div>
          )}

          {allMessages.map((message) => {
            const textContent = message.parts
              ?.filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");

            const isUser = message.role === "user";
            const { cleanText, media } = textContent
              ? extractMediaFromText(textContent)
              : { cleanText: "", media: [] };

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <img
                    src="/logo.svg"
                    alt="PostClaw"
                    className="shrink-0 h-7 w-7 rounded-full"
                  />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isUser
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                  }`}
                >
                  {media.length > 0 && (
                    <div
                      className={`${cleanText ? "mb-2" : ""} flex flex-wrap gap-1.5`}
                    >
                      {media.map((m, i) =>
                        m.mediaType.startsWith("image/") ? (
                          <img
                            key={i}
                            src={m.url}
                            alt="Attached media"
                            className="rounded-lg max-h-40 max-w-[200px] object-cover"
                          />
                        ) : (
                          <div
                            key={i}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                              isUser
                                ? "bg-white/20 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            <FilmStripIcon className="h-4 w-4" />
                            Video attached
                          </div>
                        )
                      )}
                    </div>
                  )}
                  {cleanText &&
                    (isUser ? (
                      <span className="whitespace-pre-wrap">{cleanText}</span>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-hr:my-3 prose-blockquote:my-2 prose-pre:my-2">
                        <ReactMarkdown>{cleanText}</ReactMarkdown>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}

          {status === "submitted" &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start items-end gap-2.5">
                <img
                  src="/logo.svg"
                  alt="PostClaw"
                  className="shrink-0 h-7 w-7 rounded-full"
                />
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full bg-primary/60 animate-bounce-dot"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-primary/60 animate-bounce-dot"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-primary/60 animate-bounce-dot"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
        </div>

        {/* Media preview */}
        {attachedMedia.length > 0 && (
          <div className="px-4 pt-3">
            <div className="flex flex-wrap gap-2">
              {attachedMedia.map((media, index) => (
                <div key={`${media.url}-${index}`} className="relative">
                  {media.resourceType === "image" ? (
                    <img
                      src={media.thumbnailUrl}
                      alt="Attached media"
                      className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center">
                      <FilmStripIcon className="h-6 w-6 text-gray-400" />
                      <span className="text-[10px] text-gray-500 mt-1 uppercase font-medium">
                        {media.format}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setAttachedMedia((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white uppercase">
                    {media.format}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="p-4 pt-2">
          <MediaUploadModal
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onUploadComplete={handleUploadComplete}
          />
          <ImageGenerateModal
            open={generateModalOpen}
            onClose={() => setGenerateModalOpen(false)}
            onImageGenerated={handleImageGenerated}
            canGenerate={canGenerate}
          />
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:shadow-md focus-within:border-gray-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-grow
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                hasAccounts
                  ? "What can I do for you?"
                  : "Connect a social account to start chatting"
              }
              disabled={!hasAccounts}
              rows={1}
              className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-base leading-relaxed focus:outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ minHeight: "44px", maxHeight: "160px" }}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <MediaAttachDropdown
                  disabled={!hasAccounts}
                  onOpenUpload={() => {
                    if (needsSubscription) {
                      setShowSubscribeModal(true);
                      return;
                    }
                    setUploadModalOpen(true);
                  }}
                  onOpenGenerate={() => {
                    if (needsSubscription) {
                      setShowSubscribeModal(true);
                      return;
                    }
                    setGenerateModalOpen(true);
                  }}
                />
              </div>
              <button
                type="button"
                disabled={!canSend}
                onClick={handleSend}
                className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white transition-all hover:bg-[#E84A36] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <CircleNotchIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PaperPlaneTiltIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category action prompts — below the card, only on empty state */}
      {showCategories && (
        <div className="mt-3 flex gap-2 justify-center">
          {ACTION_CATEGORIES.map((cat) => (
            <div key={cat.id} className="relative group">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {cat.prompts.map((prompt, i, arr) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    className={`w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer ${
                      i < arr.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </div>
  );
}
