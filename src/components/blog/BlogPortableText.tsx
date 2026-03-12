import { PortableText, PortableTextComponents } from "next-sanity";
import Image from "next/image";
import Link from "next/link";
import { getImageUrl } from "@/lib/sanity/image";
import type { SanityBlock, SanityImage } from "@/lib/sanity/types";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractTextFromChildren(
  children: Array<{ text?: string; _type?: string }> | undefined
): string {
  if (!children) return "";
  return children.map((child) => child.text || "").join("");
}

const components: PortableTextComponents = {
  block: {
    h2: ({ children, value }) => {
      const text = extractTextFromChildren(value.children);
      const id = generateSlug(text);
      return (
        <h2
          id={id}
          className="text-2xl font-bold text-white mt-10 mb-4 scroll-mt-24"
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, value }) => {
      const text = extractTextFromChildren(value.children);
      const id = generateSlug(text);
      return (
        <h3
          id={id}
          className="text-xl font-semibold text-white mt-8 mb-3 scroll-mt-24"
        >
          {children}
        </h3>
      );
    },
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold text-white mt-6 mb-2">
        {children}
      </h4>
    ),
    normal: ({ children }) => (
      <p className="text-[#c0c4d0] leading-relaxed mb-4">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#e8614d] pl-4 italic text-[#7a7f94] my-6">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-[#c0c4d0]">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-[#c0c4d0]">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="bg-[#1e2233] px-1.5 py-0.5 rounded text-sm font-mono text-[#e8e9f0]">
        {children}
      </code>
    ),
    link: ({ children, value }) => {
      const href = value?.href || "";
      const isExternal = href.startsWith("http");
      return (
        <Link
          href={href}
          className="text-[#e8614d] hover:text-[#f07563] underline underline-offset-2"
          {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
        >
          {children}
        </Link>
      );
    },
  },
  types: {
    image: ({
      value,
    }: {
      value: SanityImage & { alt?: string; caption?: string };
    }) => {
      const imageUrl = getImageUrl(value, 800);
      if (!imageUrl) return null;

      return (
        <figure className="my-8">
          <Image
            src={imageUrl}
            alt={value.alt || "Blog image"}
            width={800}
            height={450}
            className="rounded-xl w-full"
          />
          {value.caption && (
            <figcaption className="text-center text-sm text-[#555a6b] mt-2">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
};

interface BlogPortableTextProps {
  value: Array<SanityBlock | SanityImage>;
}

export default function BlogPortableText({ value }: BlogPortableTextProps) {
  return (
    <div className="prose-custom">
      <PortableText value={value} components={components} />
    </div>
  );
}

// Helper to extract headings for TOC
export function extractHeadings(
  blocks: Array<SanityBlock | SanityImage>
): Array<{ id: string; text: string; level: number }> {
  return blocks
    .filter(
      (block): block is SanityBlock =>
        block._type === "block" && ["h2", "h3"].includes(block.style || "")
    )
    .map((block) => {
      const text = block.children.map((child) => child.text).join("");
      return {
        id: generateSlug(text),
        text,
        level: block.style === "h2" ? 2 : 3,
      };
    });
}
