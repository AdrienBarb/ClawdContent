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
  Paperclip,
  X,
  Film,
} from "lucide-react";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  CldUploadWidget,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";

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

export default function ChatInterface() {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetch(appRouter.api.chatHistory)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        if (!cancelled) setInitialMessages(data.messages ?? []);
      })
      .catch(() => {
        if (!cancelled) setInitialMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (initialMessages === null) {
    return <ChatSkeleton />;
  }

  return <ChatInner initialMessages={initialMessages} />;
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Chat
        </h1>
        <p className="text-gray-500 mt-1">
          Chat with your AI content manager directly from the dashboard.
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

function ChatInner({
  initialMessages,
}: {
  initialMessages: UIMessage[];
}) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: appRouter.api.chat }),
    []
  );
  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages,
  });

  const [input, setInput] = useState("");
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleUploadSuccess = useCallback(
    (result: CloudinaryUploadWidgetResults) => {
      const info = result.info;
      if (!info || typeof info === "string") return;

      const resourceType =
        info.resource_type === "video" ? "video" : "image";
      const format = info.format;
      const url = info.secure_url;
      const cloudinaryId = info.public_id;
      const bytes = info.bytes;
      const width = info.height ? info.width : undefined;
      const height = info.height || undefined;

      const thumbnailUrl = info.thumbnail_url || url;

      setAttachedMedia({
        url,
        resourceType,
        format,
        cloudinaryId,
        bytes,
        width,
        height,
        thumbnailUrl,
      });

      // Fire-and-forget save to DB
      fetch(appRouter.api.mediaUpload, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudinaryId,
          url,
          resourceType,
          format,
          bytes,
          width,
          height,
        }),
      }).catch(() => {
        // Silent — media record is not critical for sending
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
          Chat with your AI content manager directly from the dashboard.
        </p>
      </div>

      <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Start a conversation
              </h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">
                Ask your AI content manager to create, adapt, or publish social
                media posts.
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
                    "Make sure your bot is running and try again."}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const textContent = message.parts
              ?.filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");

            const isUser = message.role === "user";
            const { cleanText, media } = isUser && textContent
              ? extractMediaFromText(textContent)
              : { cleanText: textContent || "", media: [] };

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
                    <div className="mb-2">
                      {media.map((m, i) =>
                        m.mediaType.startsWith("image/") ? (
                          <img
                            key={i}
                            src={m.url}
                            alt="Attached media"
                            className="rounded-lg max-w-full max-h-48 object-cover"
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
                  {cleanText && (
                    <span className="whitespace-pre-wrap">{cleanText}</span>
                  )}
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
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
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
            <CldUploadWidget
              uploadPreset="postclaw_unsigned"
              options={{
                multiple: false,
                maxFileSize: 10_000_000,
                clientAllowedFormats: [
                  "jpg",
                  "png",
                  "gif",
                  "webp",
                  "mp4",
                  "mov",
                ],
                sources: ["local", "camera"],
              }}
              onSuccess={handleUploadSuccess}
            >
              {({ open }) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => open()}
                  className="h-11 w-11 shrink-0 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              )}
            </CldUploadWidget>
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
              className="h-11 w-11 shrink-0 rounded-xl bg-[#e8614d] hover:bg-[#d4563f] text-white disabled:opacity-50"
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
