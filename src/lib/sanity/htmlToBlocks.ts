import { Schema } from "@sanity/schema";
import { htmlToBlocks } from "@sanity/block-tools";
import { JSDOM } from "jsdom";
import type { ArraySchemaType } from "sanity";
import type { SanityBlock, SanityImage } from "./types";

// Minimal schema mirroring `post.body` shape so block-tools knows what to emit.
// Inline <img> blocks survive the structure but inline image *upload* is not
// implemented yet — Outrank's `image_url` is uploaded as the cover image.
const defaultSchema = Schema.compile({
  name: "default",
  types: [
    {
      type: "object",
      name: "post",
      fields: [
        {
          title: "Body",
          name: "body",
          type: "array",
          of: [{ type: "block" }, { type: "image" }],
        },
      ],
    },
  ],
});

const postSchema = defaultSchema.get("post");
const bodyField = postSchema?.fields.find(
  (f: { name: string }) => f.name === "body"
);
if (!bodyField) {
  throw new Error("htmlToBlocks: post.body schema field not found");
}
const blockContentType = (bodyField as { type: ArraySchemaType }).type;

// Strip dangerous elements + attributes before structural conversion.
// Defends against stored XSS via attacker-controlled HTML — the trust
// boundary is a single shared bearer token, so treat input as hostile.
const FORBIDDEN_TAGS = new Set([
  "SCRIPT",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "STYLE",
  "LINK",
  "META",
  "BASE",
  "NOSCRIPT",
  "SVG",
  "MATH",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
]);

function isSafeUrl(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  );
}

function sanitizeDocument(doc: Document): void {
  // Remove forbidden tags entirely.
  doc.querySelectorAll("*").forEach((el) => {
    if (FORBIDDEN_TAGS.has(el.tagName)) {
      el.remove();
      return;
    }
    // Strip every event handler + style attribute.
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on") || attr.name === "style") {
        el.removeAttribute(attr.name);
      }
    }
    // Validate href / src schemes — block javascript:, data:, vbscript:, etc.
    const href = el.getAttribute("href");
    if (href !== null && !isSafeUrl(href)) {
      el.removeAttribute("href");
    }
    const src = el.getAttribute("src");
    if (src !== null && !isSafeUrl(src)) {
      el.removeAttribute("src");
    }
  });
}

export type PostBodyValue = SanityBlock | SanityImage;

export function htmlToPortableText(html: string): PostBodyValue[] {
  const dom = new JSDOM(html);
  sanitizeDocument(dom.window.document);
  const sanitized = dom.serialize();

  return htmlToBlocks(sanitized, blockContentType, {
    parseHtml: (s: string) => new JSDOM(s).window.document,
  }) as PostBodyValue[];
}
