import "server-only";
import { getGeminiClient, withGeminiRetry } from "./gemini";

export type MediaAspectRatio = "1:1" | "4:5" | "9:16";

export interface ReferenceImage {
  /** Base64-encoded bytes (no data: prefix). */
  data: string;
  mimeType: string;
}

export interface GenerateImageArgs {
  model: string;
  prompt: string;
  aspectRatio: MediaAspectRatio;
  /** Generation tier — we generate at 2K then downscale to exact IG dims. */
  imageSize?: "1K" | "2K";
  /** Logo / style refs, passed as inlineData parts (max 14 mixed on Gemini 3). */
  referenceImages?: ReferenceImage[];
}

export interface GeneratedImage {
  data: Buffer;
  mimeType: string;
}

/**
 * Gemini-native image generation. Uses `generateContent` + `config.imageConfig`
 * (NOT the Imagen-only `generateImages` surface). The result arrives as a
 * base64 `inlineData` part — callers must persist it to Supabase immediately;
 * never return raw bytes across an Inngest step boundary (4MB step cap).
 */
export async function generateImage({
  model,
  prompt,
  aspectRatio,
  imageSize = "2K",
  referenceImages = [],
}: GenerateImageArgs): Promise<GeneratedImage> {
  const ai = getGeminiClient();

  const contents = [
    { text: prompt },
    ...referenceImages.map((ref) => ({
      inlineData: { mimeType: ref.mimeType, data: ref.data },
    })),
  ];

  const response = await withGeminiRetry(`image:${model}`, () =>
    ai.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio, imageSize },
      },
    })
  );

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: Buffer.from(part.inlineData.data, "base64"),
        mimeType: part.inlineData.mimeType ?? "image/png",
      };
    }
  }

  const blockReason = response.promptFeedback?.blockReason;
  throw new Error(
    `Gemini returned no image (model=${model}${blockReason ? `, blocked=${blockReason}` : ""})`
  );
}

const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;

/** Fetch a stored asset (logo, brand photo) and return it as a reference part. */
export async function fetchReferenceImage(
  url: string
): Promise<ReferenceImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_REFERENCE_BYTES) return null;
    return { data: buf.toString("base64"), mimeType: contentType };
  } catch (err) {
    console.warn(
      `[media:reference] failed to fetch ${url}: ${err instanceof Error ? err.message : err}`
    );
    return null;
  }
}
