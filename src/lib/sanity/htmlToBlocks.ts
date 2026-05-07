import { parse, type DefaultTreeAdapterMap } from "parse5";
import { randomUUID } from "node:crypto";
import type { SanityBlock, SanityImage } from "./types";

// Stack rationale:
// - parse5: pure CJS HTML parser, no DOM, no XPath, no ESM-only transitive
//   deps. Every DOM-based path (jsdom, linkedom) has bitten us — jsdom has a
//   pure-ESM dep (`@exodus/bytes`) that crashes Vercel's CJS Function runtime;
//   linkedom doesn't implement `document.evaluate`, which `@portabletext/html`
//   (transitive of block-tools) calls in preprocessors.
// - The supported HTML surface for Outrank-generated content is small enough
//   to walk parse5's AST directly and emit Portable Text. ~150 lines, zero
//   runtime deps beyond parse5.

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type TextNode = DefaultTreeAdapterMap["textNode"];

const STYLE_MAP: Record<string, string> = {
  p: "normal",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  blockquote: "blockquote",
};

const MARK_MAP: Record<string, string> = {
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "underline",
  code: "code",
  s: "strike-through",
  strike: "strike-through",
  del: "strike-through",
};

// Tags whose entire subtree we drop. Matches the original sanitization list —
// the Outrank bearer token is the only trust boundary, so treat input as
// hostile.
const FORBIDDEN = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "style",
  "link",
  "meta",
  "base",
  "noscript",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "textarea",
]);

const LIST_TAGS = new Set(["ul", "ol"]);

function isElement(n: Node): n is Element {
  return "tagName" in n && Array.isArray((n as Element).childNodes);
}

function isText(n: Node): n is TextNode {
  return n.nodeName === "#text";
}

function key(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function isSafeUrl(href: string): boolean {
  const t = href.trim().toLowerCase();
  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("mailto:") ||
    t.startsWith("/") ||
    t.startsWith("#")
  );
}

interface Span {
  _key: string;
  _type: "span";
  marks: string[];
  text: string;
}

interface MarkDef {
  _key: string;
  _type: "link";
  href: string;
}

interface InlineBuilder {
  spans: Span[];
  markDefs: MarkDef[];
}

function pushText(b: InlineBuilder, text: string, marks: string[]): void {
  if (!text) return;
  const last = b.spans[b.spans.length - 1];
  if (last && marksEqual(last.marks, marks)) {
    last.text += text;
    return;
  }
  b.spans.push({ _key: key(), _type: "span", marks: [...marks], text });
}

function marksEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function collectInline(
  builder: InlineBuilder,
  node: Node,
  marks: string[]
): void {
  if (isText(node)) {
    pushText(builder, node.value.replace(/\s+/g, " "), marks);
    return;
  }
  if (!isElement(node)) return;
  const tag = node.tagName;
  if (FORBIDDEN.has(tag)) return;

  if (tag === "br") {
    pushText(builder, "\n", marks);
    return;
  }

  if (tag === "a") {
    const href = node.attrs.find((a) => a.name === "href")?.value;
    if (href && isSafeUrl(href)) {
      const linkKey = key();
      builder.markDefs.push({ _key: linkKey, _type: "link", href });
      const next = [...marks, linkKey];
      for (const c of node.childNodes) collectInline(builder, c, next);
      return;
    }
    for (const c of node.childNodes) collectInline(builder, c, marks);
    return;
  }

  const mark = MARK_MAP[tag];
  if (mark) {
    const next = marks.includes(mark) ? marks : [...marks, mark];
    for (const c of node.childNodes) collectInline(builder, c, next);
    return;
  }

  for (const c of node.childNodes) collectInline(builder, c, marks);
}

interface BlockOptions {
  style: string;
  listItem?: "bullet" | "number";
  level?: number;
}

function buildBlock(
  inlineNodes: Node[],
  opts: BlockOptions
): SanityBlock | null {
  const builder: InlineBuilder = { spans: [], markDefs: [] };
  for (const n of inlineNodes) collectInline(builder, n, []);

  if (builder.spans.length > 0) {
    builder.spans[0].text = builder.spans[0].text.replace(/^\s+/, "");
    const last = builder.spans[builder.spans.length - 1];
    last.text = last.text.replace(/\s+$/, "");
  }

  const total = builder.spans.reduce((acc, s) => acc + s.text, "");
  if (!total.trim()) return null;

  const block: SanityBlock & {
    listItem?: "bullet" | "number";
    level?: number;
  } = {
    _type: "block",
    _key: key(),
    style: opts.style,
    children: builder.spans,
    markDefs: builder.markDefs,
  };
  if (opts.listItem) {
    block.listItem = opts.listItem;
    block.level = opts.level ?? 1;
  }
  return block;
}

interface ListContext {
  type: "bullet" | "number";
  level: number;
}

function walkBlocks(
  nodes: Node[],
  out: SanityBlock[],
  list: ListContext | null
): void {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    const tag = node.tagName;
    if (FORBIDDEN.has(tag)) continue;

    if (tag === "li" && list) {
      const inline: Node[] = [];
      const nestedLists: Element[] = [];
      for (const c of node.childNodes) {
        if (isElement(c) && LIST_TAGS.has(c.tagName)) nestedLists.push(c);
        else inline.push(c);
      }
      const block = buildBlock(inline, {
        style: "normal",
        listItem: list.type,
        level: list.level,
      });
      if (block) out.push(block);
      for (const nested of nestedLists) walkBlocks([nested], out, list);
      continue;
    }

    if (LIST_TAGS.has(tag)) {
      const type: "bullet" | "number" = tag === "ol" ? "number" : "bullet";
      const level = list ? list.level + 1 : 1;
      walkBlocks(node.childNodes, out, { type, level });
      continue;
    }

    const style = STYLE_MAP[tag];
    if (style) {
      const block = buildBlock(node.childNodes, { style });
      if (block) out.push(block);
      continue;
    }

    walkBlocks(node.childNodes, out, list);
  }
}

export type PostBodyValue = SanityBlock | SanityImage;

export function htmlToPortableText(html: string): PostBodyValue[] {
  const doc = parse(html);
  const out: SanityBlock[] = [];
  walkBlocks(doc.childNodes as Node[], out, null);
  console.log(
    `[outrank-intake] htmlToPortableText: ${out.length} blocks from ${html.length} chars`
  );
  return out;
}
