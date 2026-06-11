import "server-only";
import { getGeminiClient, withGeminiRetry, VEO_FAST } from "./gemini";

/**
 * Veo 3.1 Fast image-to-video for 9:16 Reels. Generation is async (11s–6min):
 * the Inngest function starts the operation in one step, polls across
 * step.sleep boundaries (no compute consumed while parked), then downloads in
 * a final step. Videos are kept server-side by Google for only ~2 days —
 * download to Supabase promptly.
 *
 * EU note: image-to-video only supports personGeneration "allow_adult", which
 * is also the only EU-safe value — hardcoded below.
 */

export interface StartReelArgs {
  prompt: string;
  /** First frame (hero still from Nano Banana), base64-encoded. */
  imageBase64: string;
  imageMimeType: string;
  /** 4 | 6 | 8 — 1080p requires 8. Default 8. */
  durationSeconds?: number;
  resolution?: "720p" | "1080p";
}

export async function startReelGeneration({
  prompt,
  imageBase64,
  imageMimeType,
  durationSeconds = 8,
  resolution = "720p",
}: StartReelArgs): Promise<{ operationName: string }> {
  const ai = getGeminiClient();
  const operation = await withGeminiRetry("video:start", () =>
    ai.models.generateVideos({
      model: VEO_FAST,
      prompt,
      image: { imageBytes: imageBase64, mimeType: imageMimeType },
      config: {
        aspectRatio: "9:16",
        resolution,
        durationSeconds,
        personGeneration: "allow_adult",
        negativePrompt: "captions, subtitles, watermark, text overlay",
      },
    })
  );
  if (!operation.name) {
    throw new Error("Veo did not return an operation name");
  }
  return { operationName: operation.name };
}

export interface ReelOperationStatus {
  done: boolean;
  videoUri?: string;
  error?: string;
}

export async function checkReelOperation(
  operationName: string
): Promise<ReelOperationStatus> {
  const ai = getGeminiClient();
  const operation = await withGeminiRetry("video:poll", () =>
    ai.operations.getVideosOperation({
      // Reconstructed handle — polling only needs the operation name.
      operation: { name: operationName } as Parameters<
        typeof ai.operations.getVideosOperation
      >[0]["operation"],
    })
  );

  if (!operation.done) return { done: false };

  if (operation.error) {
    return {
      done: true,
      error:
        typeof operation.error.message === "string"
          ? operation.error.message
          : "Video generation failed",
    };
  }

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) {
    return { done: true, error: "Video operation finished without a file" };
  }
  return { done: true, videoUri: uri };
}

/** Download the generated MP4 (the file URI requires API-key auth). */
export async function downloadReel(videoUri: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const sep = videoUri.includes("?") ? "&" : "?";
  const res = await fetch(`${videoUri}${sep}key=${apiKey}`);
  if (!res.ok) {
    throw new Error(`Failed to download Veo video: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
