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

/**
 * SSRF guard for reference fetches. The URLs originate from user-editable
 * knowledgeBase fields (logoUrl can be an external CDN found by Firecrawl),
 * so: https only, no IP-literal/localhost hosts, no redirects, and the
 * resolved address must be public.
 */
async function isSafeRemoteUrl(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || // IPv4 literal
    host.includes(":") // IPv6 literal
  ) {
    return false;
  }
  try {
    const { lookup } = await import("dns/promises");
    const records = await lookup(host, { all: true });
    for (const { address } of records) {
      if (
        /^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(address) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(address) ||
        address === "::1" ||
        address.toLowerCase().startsWith("fc") ||
        address.toLowerCase().startsWith("fd") ||
        address.toLowerCase().startsWith("fe80")
      ) {
        return false;
      }
    }
    return records.length > 0;
  } catch {
    return false;
  }
}

/** Fetch a stored asset (logo, brand photo) and return it as a reference part. */
export async function fetchReferenceImage(
  url: string
): Promise<ReferenceImage | null> {
  try {
    if (!(await isSafeRemoteUrl(url))) {
      console.warn(`[media:reference] blocked unsafe reference URL: ${url}`);
      return null;
    }
    const res = await fetch(url, { redirect: "error" });
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
