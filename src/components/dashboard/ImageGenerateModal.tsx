"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Lock } from "lucide-react";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";
import Link from "next/link";

const SIZE_OPTIONS = [
  { value: "1024x1024" as const, label: "Square", aspect: "1:1" },
  { value: "1792x1024" as const, label: "Landscape", aspect: "16:9" },
  { value: "1024x1792" as const, label: "Portrait", aspect: "9:16" },
];

interface ImageGenerateResult {
  imageUrl: string;
  generationId: string;
}

interface ImageGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onImageGenerated: (result: ImageGenerateResult) => void;
  canGenerate: boolean;
}

export default function ImageGenerateModal({
  open,
  onClose,
  onImageGenerated,
  canGenerate,
}: ImageGenerateModalProps) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">(
    "1024x1024"
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { useGet } = useApi();
  const { data: credits } = useGet(appRouter.api.credits, undefined, {
    enabled: canGenerate,
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(appRouter.api.imageGenerate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const result: ImageGenerateResult = await res.json();
      setPreviewUrl(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleAttach = () => {
    if (previewUrl) {
      onImageGenerated({ imageUrl: previewUrl, generationId: "" });
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setPrompt("");
    setSize("1024x1024");
    setError(null);
    setPreviewUrl(null);
    setGenerating(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset();
      onClose();
    }
  };

  const totalCredits = credits?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#e8614d]" />
            Generate Image
          </DialogTitle>
        </DialogHeader>

        {!canGenerate ? (
          /* Blocked state for starter users */
          <div className="text-center py-4 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                AI image generation is only available on Pro and Business plans.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Upgrade your plan to generate images with AI directly in your
                chat.
              </p>
            </div>
            <Link href={appRouter.billing}>
              <Button className="bg-[#e8614d] hover:bg-[#d4563f] text-white cursor-pointer">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Credits display */}
            <div className="text-sm text-gray-500">
              {totalCredits} credit{totalCredits !== 1 ? "s" : ""} remaining
            </div>

            {previewUrl ? (
              /* Preview state */
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Generated image"
                  className="w-full rounded-lg border border-gray-200"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAttach}
                    className="flex-1 bg-[#e8614d] hover:bg-[#d4563f] text-white cursor-pointer"
                  >
                    Attach to message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="cursor-pointer"
                  >
                    New image
                  </Button>
                </div>
              </div>
            ) : (
              /* Input state */
              <>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8614d]/30 focus:border-[#e8614d] placeholder:text-gray-400"
                  maxLength={1000}
                  disabled={generating}
                />

                {/* Size options */}
                <div className="flex gap-2">
                  {SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSize(opt.value)}
                      disabled={generating}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        size === opt.value
                          ? "border-[#e8614d] bg-[#e8614d]/5 text-[#e8614d]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {opt.aspect}
                      </div>
                    </button>
                  ))}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating || totalCredits === 0}
                  className="w-full bg-[#e8614d] hover:bg-[#d4563f] text-white cursor-pointer disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating your image...
                    </span>
                  ) : (
                    "Generate (1 credit)"
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
