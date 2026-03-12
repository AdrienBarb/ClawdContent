import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { client } from "@/lib/sanity/client";
import { POST_BY_SLUG_QUERY, POST_SLUGS_QUERY } from "@/lib/sanity/queries";
import type { Post, PostPreview } from "@/lib/sanity/types";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import { getImageUrl } from "@/lib/sanity/image";
import BlogPortableText, {
  extractHeadings,
} from "@/components/blog/BlogPortableText";
import BlogTableOfContents from "@/components/blog/BlogTableOfContents";
import BlogFAQ from "@/components/blog/BlogFAQ";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Calendar,
  Clock,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { format } from "date-fns";
import config from "@/lib/config";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

const fetchOptions = { next: { revalidate: 60 } };

export async function generateStaticParams() {
  const posts = await client.fetch<{ slug: string }[]>(
    POST_SLUGS_QUERY,
    {},
    fetchOptions
  );
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await client.fetch<Post | null>(
    POST_BY_SLUG_QUERY,
    { slug },
    fetchOptions
  );

  if (!post) {
    return {};
  }

  const title = post.seo?.title || post.title;
  const description = post.seo?.description || post.excerpt || "";
  const imageUrl = getImageUrl(
    post.seo?.ogImage || post.coverImage,
    1200,
    630
  );

  return genPageMetadata({
    title,
    description,
    url: `/blog/${slug}`,
    ...(imageUrl && { image: imageUrl }),
  });
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  const post = await client.fetch<Post | null>(
    POST_BY_SLUG_QUERY,
    { slug },
    fetchOptions
  );

  if (!post) {
    notFound();
  }

  const relatedPosts: PostPreview[] = post.manualRelatedPosts || [];

  const coverImageUrl = getImageUrl(post.coverImage, 1200, 630);
  const headings = extractHeadings(post.body);

  // Article structured data
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: coverImageUrl,
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: config.project.brandName,
      logo: {
        "@type": "ImageObject",
        url: `${config.project.url}${config.project.logo}`,
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${config.project.url}/blog/${slug}`,
    },
  };

  return (
    <>
      {/* Article Structured Data */}
      <Script
        id="article-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData),
        }}
      />

      <article className="max-w-7xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#555a6b] mb-8">
          <Link
            href="/blog"
            className="hover:text-white transition-colors"
          >
            Blog
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link
            href={`/blog/category/${post.category.slug.current}`}
            className="hover:text-white transition-colors"
          >
            {post.category.title}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-[#7a7f94] truncate max-w-[200px]">
            {post.title}
          </span>
        </nav>

        {/* Header */}
        <header className="max-w-3xl mx-auto text-center mb-12">
          {coverImageUrl && (
            <div className="max-w-4xl mx-auto mb-12">
              <Image
                src={coverImageUrl}
                alt={post.title}
                width={1200}
                height={630}
                className="rounded-2xl w-full"
                priority
              />
            </div>
          )}

          {/* Category */}
          <Link
            href={`/blog/category/${post.category.slug.current}`}
            className="inline-block text-xs font-medium text-[#e8614d] hover:text-[#f07563] uppercase tracking-wide mb-4"
          >
            {post.category.title}
          </Link>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center justify-center gap-4 text-sm text-[#555a6b] flex-wrap">
            <span className="font-medium text-[#c0c4d0]">
              {post.authorName}
            </span>
            <span>&middot;</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.publishedAt}>
                {format(new Date(post.publishedAt), "MMM d, yyyy")}
              </time>
            </div>
            {post.readingTime && (
              <>
                <span>&middot;</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{post.readingTime} min read</span>
                </div>
              </>
            )}
          </div>

          {post.authorBio && (
            <p className="mt-3 text-sm text-[#7a7f94] italic">
              {post.authorBio}
            </p>
          )}

          {post.updatedAt && (
            <p className="mt-2 text-xs text-[#555a6b]">
              Updated: {format(new Date(post.updatedAt), "MMM d, yyyy")}
            </p>
          )}
        </header>

        {/* Content Layout */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-12">
          {/* Main Content */}
          <div className="max-w-3xl">
            {/* Key Takeaways / TL;DR */}
            {post.keyTakeaways && post.keyTakeaways.length > 0 && (
              <div className="mb-10 p-6 bg-[#e8614d]/10 border border-[#e8614d]/20 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-[#e8614d]" />
                  <h2 className="text-lg font-semibold text-white">
                    Key Takeaways
                  </h2>
                </div>
                <ul className="space-y-2">
                  {post.keyTakeaways.map((takeaway, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-[#c0c4d0]"
                    >
                      <span className="text-[#e8614d] font-medium mt-0.5">
                        &bull;
                      </span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <BlogPortableText value={post.body} />

            {/* FAQ */}
            {post.faq && <BlogFAQ faq={post.faq} />}

            {/* CTA */}
            <div className="mt-16 bg-[#151929] rounded-2xl border border-[#1e2233] p-8 text-center">
              <h2 className="text-xl font-bold text-white mb-3">
                Ready to automate your social media publishing?
              </h2>
              <p className="text-[#7a7f94] mb-6">
                PostClaw gives you a personal AI content manager on Telegram.
                Create, adapt, and publish to 13+ platforms — all on autopilot.
              </p>
              <Button
                asChild
                className="bg-[#e8614d] hover:bg-[#d4563f] text-white rounded-full px-8"
              >
                <Link href="/">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Sidebar - TOC */}
          <aside className="hidden lg:block">
            {headings.length > 0 && <BlogTableOfContents headings={headings} />}
          </aside>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="max-w-3xl mx-auto mt-16 p-6 bg-[#151929] rounded-xl border border-[#1e2233]">
            <h2 className="text-xl font-bold text-white mb-2">
              Related Articles
            </h2>
            <p className="text-[#7a7f94] mb-4">
              If you found this article useful, you might also enjoy:
            </p>
            <ul className="space-y-2">
              {relatedPosts.map((relatedPost) => (
                <li key={relatedPost._id} className="flex items-start gap-2">
                  <span className="text-[#e8614d]">&bull;</span>
                  <div>
                    <Link
                      href={`/blog/${relatedPost.slug.current}`}
                      className="text-[#e8e9f0] font-medium hover:text-[#e8614d] transition-colors underline underline-offset-2"
                    >
                      {relatedPost.primaryKeyword || relatedPost.title}
                    </Link>
                    {relatedPost.excerpt && (
                      <span className="text-[#7a7f94]">
                        {" "}
                        &ndash; {relatedPost.excerpt}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
