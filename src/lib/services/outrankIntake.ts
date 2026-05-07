import { revalidatePath } from "next/cache";
import { client } from "@/lib/sanity/client";
import { writeClient } from "@/lib/sanity/writeClient";
import { htmlToPortableText } from "@/lib/sanity/htmlToBlocks";
import type { OutrankArticle } from "@/lib/schemas/outrank";

export interface OutrankIntakeResult {
  created: number;
  skipped: number;
  errors: { id: string; code: string }[];
}

const MAX_CONCURRENCY = 3;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

// Outrank ingestion is **create-only**. Re-publishing the same `outrankId`
// is idempotent: we use a deterministic `_id` (`outrank-${article.id}`) and
// `createIfNotExists`, which is atomic at the Sanity layer — no fetch+create
// race window. Edits in Outrank are NOT propagated; if you need that, add
// an explicit patch branch.

function deterministicDocId(outrankId: string): string {
  return `outrank-${outrankId}`;
}

function computeReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

// Defend the server from SSRF: only https://, only image content-types,
// short timeout, byte cap. Hostname-level private-IP rejection is a
// follow-up — for now the Outrank token is the trust boundary.
async function fetchImageSafely(
  imageUrl: string
): Promise<Buffer | null> {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") {
    return null;
  }

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) return null;

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > MAX_IMAGE_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) return null;
    return buffer;
  } catch (error) {
    console.warn(
      `[outrank-intake] image fetch failed for ${imageUrl}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function uploadCoverImage(
  imageUrl: string,
  filename: string
): Promise<string | null> {
  const buffer = await fetchImageSafely(imageUrl);
  if (!buffer) return null;
  try {
    const asset = await writeClient.assets.upload("image", buffer, {
      filename,
    });
    return asset._id;
  } catch (error) {
    console.warn(
      `[outrank-intake] asset upload failed:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

const EXISTS_QUERY = `*[_id == $id][0]{_id}`;

async function processArticle(
  article: OutrankArticle
): Promise<"created" | "skipped"> {
  const _id = deterministicDocId(article.id);

  // Fast path: if the deterministic _id already exists, skip without any
  // expensive work (HTML parse, image fetch). The createIfNotExists below
  // is the authoritative atomic guard against a concurrent race.
  const existing = await client.fetch<{ _id: string } | null>(EXISTS_QUERY, {
    id: _id,
  });
  if (existing) return "skipped";

  const body = htmlToPortableText(article.content_html);
  if (body.length === 0) {
    // Empty body is unrecoverable — don't loop on it via webhook retries.
    throw new Error("EMPTY_BODY");
  }

  const coverImageRef = article.image_url
    ? await uploadCoverImage(article.image_url, `${article.slug}.jpg`)
    : null;

  const readingTime = computeReadingTime(article.content_html);
  const publishedAt = article.created_at || new Date().toISOString();
  const primaryKeyword = article.tags[0];

  await writeClient.createIfNotExists({
    _id,
    _type: "post",
    title: article.title,
    slug: { _type: "slug", current: article.slug },
    excerpt: article.meta_description,
    authorName: "Adrien",
    publishedAt,
    readingTime,
    body,
    source: "outrank",
    outrankId: article.id,
    outrankTags: article.tags,
    ...(primaryKeyword && { primaryKeyword }),
    ...(coverImageRef && {
      coverImage: {
        _type: "image",
        asset: { _type: "reference", _ref: coverImageRef },
      },
    }),
    seo: {
      title: article.title,
      description: article.meta_description,
    },
  });

  revalidatePath(`/blog/${article.slug}`);
  return "created";
}

// Bounded concurrency — Promise.all for tiny batches would race; sequential
// for-loop times out on larger ones. 3 is a safe middle ground for the
// 60-second function budget.
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        try {
          const value = await worker(items[i]);
          results[i] = { status: "fulfilled", value };
        } catch (reason) {
          results[i] = { status: "rejected", reason };
        }
      }
    }
  );
  await Promise.all(runners);
  return results;
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && error.message === "EMPTY_BODY") {
    return "EMPTY_BODY";
  }
  return "INTAKE_FAILED";
}

export async function processOutrankArticles(
  articles: OutrankArticle[]
): Promise<OutrankIntakeResult> {
  const result: OutrankIntakeResult = { created: 0, skipped: 0, errors: [] };

  const settled = await runWithConcurrency(
    articles,
    MAX_CONCURRENCY,
    processArticle
  );

  settled.forEach((outcome, idx) => {
    const article = articles[idx];
    if (outcome.status === "fulfilled") {
      result[outcome.value] += 1;
    } else {
      const code = safeErrorCode(outcome.reason);
      result.errors.push({ id: article.id, code });
      console.error(
        `[outrank-intake] article ${article.id} failed (${code}):`,
        outcome.reason instanceof Error
          ? outcome.reason.message
          : outcome.reason
      );
    }
  });

  if (result.created > 0) {
    revalidatePath("/blog");
  }

  return result;
}
