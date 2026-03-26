"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { appRouter } from "@/lib/constants/appRouter";
import { Button } from "@/components/ui/button";
import {
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  Film,
} from "lucide-react";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import useApi from "@/lib/hooks/useApi";
import MediaUploadModal, {
  type UploadResult,
} from "@/components/dashboard/MediaUploadModal";
import MediaAttachDropdown from "@/components/dashboard/MediaAttachDropdown";
import ImageGenerateModal from "@/components/dashboard/ImageGenerateModal";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Write a LinkedIn post about my latest project",
  "Draft a short announcement for Threads",
  "Turn this idea into a Twitter thread",
  "Write a professional update about a milestone",
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
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Chat
        </h1>
        <p className="text-gray-500 mt-1">
          Chat with your AI social media manager directly from the dashboard.
        </p>
      </div>
      <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(
    null
  );

  // Fetch dashboard status for subscription info (cached by React Query from ChatWithLoader)
  const { useGet } = useApi();
  const { data: dashboardStatus } = useGet(appRouter.api.dashboardStatus);
  const subStatus = dashboardStatus?.subscription?.status;
  const subPlanId = dashboardStatus?.subscription?.planId;
  const canGenerate = subStatus === "active" && subPlanId !== "starter";
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
    setAttachedMedia({
      url: result.url,
      resourceType: result.resourceType,
      format: result.format,
      cloudinaryId: result.cloudinaryId,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      thumbnailUrl: result.thumbnailUrl,
    });

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

  const handleImageGenerated = useCallback(
    (result: { imageUrl: string }) => {
      setAttachedMedia({
        url: result.imageUrl,
        resourceType: "image",
        format: "png",
        cloudinaryId: "",
        bytes: 0,
        thumbnailUrl: result.imageUrl,
      });
    },
    []
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text && !attachedMedia) return;
    if (isLoading) return;

    let messageText = text || "(media attached)";

    if (attachedMedia) {
      const mimeType =
        attachedMedia.resourceType === "video"
          ? `video/${attachedMedia.format}`
          : `image/${attachedMedia.format}`;

      messageText += `\n\n[MEDIA: ${attachedMedia.url}]\n[MEDIA_TYPE: ${mimeType}]`;
    }

    setInput("");
    setAttachedMedia(null);
    sendMessage({ text: messageText });
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (input.trim() || attachedMedia) && !isLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Chat
        </h1>
        <p className="text-gray-500 mt-1">
          Chat with your AI social media manager directly from the dashboard.
        </p>
      </div>

      <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {allMessages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Start a conversation
              </h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">
                Ask your AI social media manager to create, adapt, or publish
                posts across all your platforms.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    className="flex items-start gap-2 rounded-xl bg-gray-50 hover:bg-gray-100 px-3 py-2.5 text-sm text-gray-700 text-left transition-colors cursor-pointer"

                  >
                    <Sparkles className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Failed to send message
                </p>
                <p className="text-sm text-red-700 mt-0.5">
                  {error.message ||
                    "Make sure your AI social media manager is running and try again."}
                </p>
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isUser
                      ? "bg-[#e8614d] text-white"
                      : "bg-gray-100 text-gray-900"
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
                            <Film className="h-4 w-4" />
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
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
        </div>

        {/* Media preview */}
        {attachedMedia && (
          <div className="px-4 pt-3">
            <div className="relative inline-block">
              {attachedMedia.resourceType === "image" ? (
                <img
                  src={attachedMedia.thumbnailUrl}
                  alt="Attached media"
                  className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center">
                  <Film className="h-6 w-6 text-gray-400" />
                  <span className="text-[10px] text-gray-500 mt-1 uppercase font-medium">
                    {attachedMedia.format}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachedMedia(null)}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white uppercase">
                {attachedMedia.format}
              </span>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-end gap-2">
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
            <MediaAttachDropdown
              onOpenUpload={() => setUploadModalOpen(true)}
              onOpenGenerate={() => setGenerateModalOpen(true)}
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8614d]/30 focus:border-[#e8614d] placeholder:text-gray-400"
              style={{ maxHeight: "120px" }}
            />
            <Button
              type="button"
              size="icon"
              disabled={!canSend}
              onClick={handleSend}
              className="h-11 w-11 shrink-0 rounded-xl bg-[#e8614d] hover:bg-[#d4563f] text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
