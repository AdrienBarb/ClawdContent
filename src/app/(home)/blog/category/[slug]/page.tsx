import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortableText } from "next-sanity";
import { client } from "@/lib/sanity/client";
import {
  CATEGORY_BY_SLUG_QUERY,
  CATEGORY_SLUGS_QUERY,
  POSTS_BY_CATEGORY_QUERY,
} from "@/lib/sanity/queries";
import type { Category, PostPreview } from "@/lib/sanity/types";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import BlogPostCard from "@/components/blog/BlogPostCard";
import BlogFAQ from "@/components/blog/BlogFAQ";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

const fetchOptions = { next: { revalidate: 60 } };

export async function generateStaticParams() {
  const categories = await client.fetch<{ slug: string }[]>(
    CATEGORY_SLUGS_QUERY,
    {},
    fetchOptions
  );
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await client.fetch<Category | null>(
    CATEGORY_BY_SLUG_QUERY,
    { slug },
    fetchOptions
  );

  if (!category) {
    return {};
  }

  const title = category.seo?.title || `${category.title} | Blog`;
  const description =
    category.seo?.description ||
    category.description ||
    `Explore all articles on ${category.title}, including guides, strategies, and real-world examples for content creators looking to automate and scale their social media publishing.`;

  return genPageMetadata({
    title,
    description,
    url: `/blog/category/${slug}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const [category, posts] = await Promise.all([
    client.fetch<Category | null>(
      CATEGORY_BY_SLUG_QUERY,
      { slug },
      fetchOptions
    ),
    client.fetch<PostPreview[]>(
      POSTS_BY_CATEGORY_QUERY,
      { categorySlug: slug },
      fetchOptions
    ),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#555a6b] mb-8">
        <Link
          href="/blog"
          className="hover:text-white transition-colors"
        >
          Blog
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[#7a7f94]">{category.title}</span>
      </nav>

      {/* Header */}
      <header className="max-w-3xl mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
          {category.title}
        </h1>

        {/* Intro content from Sanity */}
        {category.intro && category.intro.length > 0 && (
          <div className="text-[#7a7f94] leading-relaxed [&_p]:text-[#7a7f94]">
            <PortableText value={category.intro} />
          </div>
        )}

        {/* Fallback description */}
        {(!category.intro || category.intro.length === 0) &&
          category.description && (
            <p className="text-lg text-[#7a7f94]">{category.description}</p>
          )}
      </header>

      {/* Posts */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-8">
          All Articles in {category.title}
        </h2>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[#7a7f94]">
            <p>No articles in this category yet.</p>
            <Link
              href="/blog"
              className="text-[#e8614d] hover:text-[#f07563] mt-2 inline-block"
            >
              &larr; Back to Blog
            </Link>
          </div>
        )}
      </section>

      {/* FAQ */}
      {category.faq && <BlogFAQ faq={category.faq} />}
    </div>
  );
}
