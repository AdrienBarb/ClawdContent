import { htmlToBlocks } from "@portabletext/block-tools";
import { compileSchema } from "@portabletext/schema";
import { parseHTML } from "linkedom";
import type { SanityBlock, SanityImage } from "./types";

// Stack rationale:
// - @portabletext/block-tools (vs legacy @sanity/block-tools): no XPath, so
//   it works with non-jsdom DOMs.
// - @portabletext/schema (vs @sanity/schema): the Sanity schema compiler
//   pulls in Studio internals (sanity.imageHotspot, etc.) which fail to
//   resolve in a serverless function. The portabletext compiler stays
//   minimal — exactly what block-tools needs.
// - linkedom (vs jsdom): jsdom's transitive ESM deps crash on Vercel's
//   CJS Function runtime with ERR_REQUIRE_ESM.

// Standard PortableText surface for typical blog HTML. We deliberately leave
// blockObjects/inlineObjects empty: inline images get sanitized away rather
// than uploaded on first pass, and there are no custom block types.
const schema = compileSchema({
  decorators: [
    { name: "strong" },
    { name: "em" },
    { name: "underline" },
    { name: "code" },
    { name: "strike-through" },
  ],
  annotations: [{ name: "link" }],
  styles: [
    { name: "normal" },
    { name: "h1" },
    { name: "h2" },
    { name: "h3" },
    { name: "h4" },
    { name: "h5" },
    { name: "h6" },
    { name: "blockquote" },
  ],
  lists: [{ name: "bullet" }, { name: "number" }],
  inlineObjects: [],
  blockObjects: [],
});

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
  doc.querySelectorAll("*").forEach((el) => {
    if (FORBIDDEN_TAGS.has(el.tagName)) {
      el.remove();
      return;
    }
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on") || attr.name === "style") {
        el.removeAttribute(attr.name);
      }
    }
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
  const { document } = parseHTML(html);
  sanitizeDocument(document as unknown as Document);
  const sanitized = document.toString();

  return htmlToBlocks(sanitized, schema, {
    parseHtml: (s: string) =>
      parseHTML(s).document as unknown as Document,
  }) as PostBodyValue[];
}
